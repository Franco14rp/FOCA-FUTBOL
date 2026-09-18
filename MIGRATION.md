# Plan de migración: salir de Firebase

> **Estado: implementado.** Este plan ya se ejecutó — el proyecto corre hoy sobre el backend propio descripto acá (`server/`, Node + Express + Prisma + SQLite), sin Firebase. Este documento queda como referencia de arquitectura y de las decisiones tomadas (ver también la sección "Historia" del [README](README.md#historia-por-qué-no-usa-firebase)). Para la puesta en marcha actual, seguí el [README](README.md#puesta-en-marcha).

Este documento es una guía para quien continúe el proyecto y quiera sacarlo de Firebase (Auth + Firestore) y correrlo con un backend propio local (Node.js + Prisma + una base de datos embebida tipo SQLite), sin depender de un servicio en la nube.

No es código, es el mapa de lo que hay que construir y en qué orden. La UI en React (`src/*.js`, `App.css`) se mantiene prácticamente igual; lo que cambia es de dónde vienen los datos.

## Índice

- [Por qué migrar y qué implica](#por-qué-migrar-y-qué-implica)
- [Arquitectura actual (Firebase)](#arquitectura-actual-firebase)
- [Arquitectura propuesta (local)](#arquitectura-propuesta-local)
- [Modelo de datos → schema de Prisma](#modelo-de-datos--schema-de-prisma)
- [Autenticación: el punto más delicado](#autenticación-el-punto-más-delicado)
- [Tiempo real: qué hacer con `onSnapshot`](#tiempo-real-qué-hacer-con-onsnapshot)
- [Endpoints que necesita el backend nuevo](#endpoints-que-necesita-el-backend-nuevo)
- [Mapa de cambios por archivo del frontend](#mapa-de-cambios-por-archivo-del-frontend)
- [Checklist de migración paso a paso](#checklist-de-migración-paso-a-paso)
- [Qué se simplifica en el despliegue](#qué-se-simplifica-en-el-despliegue)

## Por qué migrar y qué implica

Hoy toda la lógica de datos vive en el cliente (`src/*.js` llaman directo a Firestore/Auth desde el browser). Sacar Firebase significa meter una capa de backend propio en el medio: el frontend deja de hablar con `firebase/firestore` y pasa a hablar con una API HTTP tuya (por ejemplo `http://localhost:4000/api/...`), y esa API es la que habla con la base de datos vía Prisma.

Ganás: cero costo de Firebase, corre 100% local/offline, control total de las reglas de negocio (hoy algunos permisos de rol se validan solo en el frontend, lo cual no es seguro).
Perdés (al menos en una primera versión): el tiempo real "gratis" de Firestore (`onSnapshot`) y tenés que armar tu propio sistema de autenticación (hoy te lo resuelve Firebase Auth).

## Arquitectura actual (Firebase)

- **Firebase Authentication** (email/contraseña): login y registro. Ver [`src/LoginPage.js`](src/LoginPage.js) y [`src/RegisterPage.js`](src/RegisterPage.js).
- **Firestore** con 3 colecciones, leídas/escritas directo desde el cliente vía [`src/firebase.js`](src/firebase.js):
  - `users`: perfil (`email`, `name`, `role`).
  - `playerStats`: atributos de juego (`name`, `ataque`, `defensa`, `corre`, `plus`, `promedio`, `uid` opcional).
  - `matches`: partidos (`field`, `date`, `time`, `participants`, `players[]`, `teamA[]`, `teamB[]`, `status`, `createdBy`, y al finalizar `winner`, `score`, `playersPlayed[]`).
- El estado del usuario logueado se guarda en contexto de React (`UserContext` en [`src/App.js`](src/App.js)), poblado por `onAuthStateChanged` + una lectura a `users/{uid}`.
- Varias pantallas usan `onSnapshot` para escuchar cambios en vivo: lista de partidos disponibles, administración de usuarios, estadísticas de jugadores, partidos jugados.

## Arquitectura propuesta (local)

```
foca-futbol/
├── src/            # frontend React (se mantiene, cambia solo la capa de datos)
└── server/         # nuevo: API propia
    ├── prisma/
    │   └── schema.prisma
    ├── src/
    │   ├── index.js        # Express (o Fastify) + rutas
    │   ├── auth.js          # hash de contraseñas + JWT
    │   └── routes/
    │       ├── auth.js
    │       ├── users.js
    │       ├── playerStats.js
    │       └── matches.js
    └── package.json
```

- **Backend**: Node.js + Express (liviano, sin vendor lock-in) exponiendo una API REST.
- **ORM**: [Prisma](https://www.prisma.io/) sobre **SQLite** — un solo archivo `dev.db`, cero servidor de base de datos que instalar. Ideal para que tu amigo clone el repo, corra `npx prisma migrate dev` y ya tenga la base creada.
- **Auth propia**: contraseñas hasheadas con `bcrypt`, sesión vía JWT guardado en `localStorage` (o cookie httpOnly si se quiere más prolijo), reemplazando a Firebase Auth.
- El frontend deja de importar `firebase/app`, `firebase/auth`, `firebase/firestore`; [`src/firebase.js`](src/firebase.js) se reemplaza por un `src/api.js` que hace `fetch`/`axios` contra el backend.

## Modelo de datos → schema de Prisma

Boceto de referencia (no es el archivo final, es para que quien migre tenga el mapeo campo a campo):

```prisma
// server/prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String
  role         String   @default("common") // "master" | "admin" | "common"
  playerStats  PlayerStats?
  matchesOwned Match[]  @relation("MatchOwner")
  createdAt    DateTime @default(now())
}

model PlayerStats {
  id        String  @id @default(uuid())
  name      String
  ataque    Int
  defensa   Int
  corre     Int
  plus      Int     @default(0)
  promedio  Float
  userId    String? @unique
  user      User?   @relation(fields: [userId], references: [id])
}

model Match {
  id             String    @id @default(uuid())
  field          String
  date           String
  time           String
  participants   Int
  status         String    @default("pending") // "pending" | "finalized"
  players        String    // JSON.stringify(string[]) -- ver nota abajo
  teamA          String?   // JSON.stringify(string[])
  teamB          String?   // JSON.stringify(string[])
  winner         String?
  score          String?
  playersPlayed  String?   // JSON.stringify(string[])
  createdById    String
  createdBy      User      @relation("MatchOwner", fields: [createdById], references: [id])
  createdAt      DateTime  @default(now())
}
```

**Nota sobre los arrays (`players`, `teamA`, `teamB`, `playersPlayed`):** Firestore guarda arrays nativamente; SQLite/Prisma no tiene un tipo array simple. Opciones:
- Guardarlos como texto JSON (`String` + `JSON.parse`/`JSON.stringify` en el backend) — más simple, suficiente para este proyecto.
- O modelarlo relacional con una tabla intermedia `MatchPlayer` (jugador ↔ partido) — más "correcto" pero más trabajo. Para un grupo de amigos, la opción JSON es razonable.

## Autenticación: el punto más delicado

`users.json` (no versionado, ver [README](README.md#seguridad-y-archivos-sensibles)) tiene el export real de Firebase Auth: emails, `passwordHash` y `salt`. **Esos hashes no sirven para el sistema nuevo** — Firebase usa un algoritmo propio (scrypt modificado) que requiere una clave secreta del proyecto de Firebase que no está en el export, así que no se pueden migrar las contraseñas tal cual.

Opciones para el amigo que continúe:
1. **Reset simple (recomendado para un grupo chico de amigos):** migrar solo `email`, `name` y `role` desde `users.json`/la colección `users`, y pedirle a cada uno que se registre de nuevo (o implementar un flujo de "recuperar contraseña" que genere una nueva).
2. Implementar el algoritmo de verificación de Firebase (`scrypt` con los parámetros del proyecto) si se consigue exportar la `signer key` de la consola de Firebase — mucho más trabajo, no vale la pena para este caso.

Para el backend nuevo: registro = `bcrypt.hash(password, 10)` guardado en `passwordHash`; login = `bcrypt.compare(password, user.passwordHash)` y devolver un JWT.

## Tiempo real: qué hacer con `onSnapshot`

Estas pantallas dependen hoy de listeners en vivo de Firestore:

- [`src/MatchListPage.js`](src/MatchListPage.js) — lista de partidos `pending`.
- [`src/PlayedMatchesPage.js`](src/PlayedMatchesPage.js) — partidos `finalized` del usuario.
- [`src/PlayerStatsPage.js`](src/PlayerStatsPage.js) — lista de estadísticas.
- [`src/UserManagementPage.js`](src/UserManagementPage.js) — lista de usuarios.

Para una primera migración, lo más simple es reemplazar `onSnapshot` por un `fetch` normal al montar el componente (`useEffect`) + **polling** con `setInterval` cada N segundos si se quiere simular "vivo". Es suficiente para un grupo chico de amigos anotándose a un partido. Si más adelante se quiere tiempo real de verdad, la vía es agregar `socket.io` o Server-Sent Events al backend — pero eso es una mejora posterior, no un bloqueante para salir de Firebase.

## Endpoints que necesita el backend nuevo

| Método | Ruta | Reemplaza a |
|---|---|---|
| `POST` | `/api/auth/register` | `createUserWithEmailAndPassword` + `setDoc(users/...)` + `setDoc(playerStats/...)` en [`RegisterPage.js`](src/RegisterPage.js) |
| `POST` | `/api/auth/login` | `signInWithEmailAndPassword` en [`LoginPage.js`](src/LoginPage.js) |
| `GET` | `/api/users/me` | `onAuthStateChanged` + `getDoc(users/{uid})` en [`App.js`](src/App.js) |
| `GET` | `/api/users` | listener de [`UserManagementPage.js`](src/UserManagementPage.js) |
| `PATCH` | `/api/users/:id/role` | `handleRoleChange` en [`UserManagementPage.js`](src/UserManagementPage.js) |
| `GET` / `POST` | `/api/player-stats` | listener y alta en [`PlayerStatsPage.js`](src/PlayerStatsPage.js) |
| `PATCH` / `DELETE` | `/api/player-stats/:id` | edición/borrado en [`PlayerStatsPage.js`](src/PlayerStatsPage.js) |
| `GET` (`?status=pending`) / `POST` | `/api/matches` | listener en [`MatchListPage.js`](src/MatchListPage.js) y alta en [`CreateMatchPage.js`](src/CreateMatchPage.js) |
| `PATCH` `/api/matches/:id` | edición de cancha/hora/fecha, unirse/salir (`players`), sumar/sacar jugador, guardar `teamA`/`teamB` | todas las mutaciones de `matches` en [`MatchListPage.js`](src/MatchListPage.js) y [`TeamBalancerModal.js`](src/TeamBalancerModal.js) |
| `POST` `/api/matches/:id/finalize` | `handleFinalizeMatch` en [`MatchListPage.js`](src/MatchListPage.js) / [`FinalizeMatchModal.js`](src/FinalizeMatchModal.js) |
| `DELETE` `/api/matches/:id` | `handleDeleteMatch` en [`MatchListPage.js`](src/MatchListPage.js) |
| `GET` `/api/matches?status=finalized&player=<nombre>` | listener en [`PlayedMatchesPage.js`](src/PlayedMatchesPage.js) |

La validación de rol (`master`/`admin`/`common`) hoy se hace solo en el frontend (cualquiera con las devtools podría saltarla). En el backend nuevo, **hay que revalidar el rol del usuario autenticado en cada endpoint sensible** (crear/editar/borrar partido, cambiar roles, editar stats) — es la oportunidad de corregir ese hueco de seguridad de paso.

## Mapa de cambios por archivo del frontend

| Archivo | Qué usa de Firebase hoy | Cambia a |
|---|---|---|
| [`src/firebase.js`](src/firebase.js) | `initializeApp`, `getAuth`, `getFirestore` | Se reemplaza por `src/api.js`: base URL del backend + helper `fetch` con el JWT en el header `Authorization`. |
| [`src/App.js`](src/App.js) | `onAuthStateChanged`, `getDoc(users/{uid})`, `signOut` | Leer el JWT guardado (`localStorage`), pedir `/api/users/me` al montar, `signOut` = borrar el JWT local. |
| [`src/LoginPage.js`](src/LoginPage.js) | `signInWithEmailAndPassword` | `POST /api/auth/login`, guardar el JWT devuelto. |
| [`src/RegisterPage.js`](src/RegisterPage.js) | `createUserWithEmailAndPassword`, `setDoc` x2 | `POST /api/auth/register` (el backend crea usuario + stats iniciales en una transacción). |
| [`src/CreateMatchPage.js`](src/CreateMatchPage.js) | `addDoc(matches)` | `POST /api/matches`. |
| [`src/MatchListPage.js`](src/MatchListPage.js) | `onSnapshot`, `updateDoc`, `deleteDoc`, `getDocs` | `GET /api/matches?status=pending` (+ polling opcional) y `PATCH`/`DELETE` por acción. |
| [`src/TeamBalancerModal.js`](src/TeamBalancerModal.js) | `getDocs(playerStats where name in [...])`, `updateDoc(matches)` | `GET /api/player-stats?names=...`, `PATCH /api/matches/:id`. El algoritmo de balanceo (Fisher-Yates + reparto por `promedio`) **no cambia**, es lógica pura de JS. |
| [`src/FinalizeMatchModal.js`](src/FinalizeMatchModal.js) | ninguno directo (recibe callback) | sin cambios; el callback que le pasa `MatchListPage` sí cambia. |
| [`src/PlayedMatchesPage.js`](src/PlayedMatchesPage.js) | `onSnapshot` con `where` compuesto | `GET /api/matches?status=finalized&player=<nombre>`. |
| [`src/PlayerStatsPage.js`](src/PlayerStatsPage.js) | `onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc` | `GET/POST/PATCH/DELETE /api/player-stats`. |
| [`src/UserManagementPage.js`](src/UserManagementPage.js) | `onSnapshot`, `updateDoc` | `GET /api/users`, `PATCH /api/users/:id/role`. |
| [`src/HomePage.js`](src/HomePage.js), [`src/PlayersModal.js`](src/PlayersModal.js), [`src/AddPlayerModal.js`](src/AddPlayerModal.js), [`src/TypingEffect.js`](src/TypingEffect.js) | ninguno / solo reciben props | sin cambios. |

## Checklist de migración paso a paso

1. Crear `server/` con Express + Prisma (`npm init`, `npm i express prisma @prisma/client bcrypt jsonwebtoken cors`).
2. Definir `schema.prisma` (basado en el boceto de arriba) y correr `npx prisma migrate dev --name init`.
3. Implementar `/api/auth/register` y `/api/auth/login` (bcrypt + JWT) y un middleware que valide el JWT y cargue `req.user`.
4. Implementar el resto de las rutas de la tabla de endpoints, con chequeo de rol en el backend para las acciones de `master`/`admin`.
5. Migrar (opcional) `email`/`name`/`role` de los usuarios existentes desde `users.json` a la tabla `User` con un script puntual, avisando que va a haber que resetear contraseñas.
6. Crear `src/api.js` en el frontend con los helpers de `fetch` y el manejo del JWT.
7. Reemplazar, archivo por archivo (tabla de arriba), las llamadas a `firebase/firestore` y `firebase/auth` por llamadas a `api.js`.
8. Sacar la dependencia `firebase` de `package.json` y borrar `src/firebase.js`, `firebase.json`, `.firebaserc` una vez que no quede nada usándolos.
9. Probar el flujo completo: registro → login → crear partido → anotarse → sortear equipos → finalizar → ver historial → administrar usuarios/stats.
10. Actualizar el `Dockerfile`/despliegue (ver siguiente sección).

## Qué se simplifica en el despliegue

- Deja de ser necesario Firebase Hosting (`firebase.json`, `.firebaserc`) y la consola de Firebase en general.
- El `Dockerfile` actual solo compila el frontend estático; con backend propio conviene un `docker-compose.yml` con dos servicios (frontend servido por Nginx + backend Node), o un solo contenedor Node que sirva ambos si se quiere algo mínimo.
- La app Android (TWA, ver [README](README.md#app-android-twa)) sigue funcionando igual: apunta a la URL pública donde corra el frontend, sin importar si atrás hay Firebase o un backend propio.
