# Foca Fútbol

Aplicación web (React + backend propio en Node/Express + Prisma/SQLite) para organizar partidos de fútbol 5/7 entre un grupo fijo de jugadores: creación de partidos, anotación, sorteo de equipos balanceado por nivel, historial de partidos jugados y estadísticas de jugadores. También está empaquetada como Trusted Web Activity (TWA) para publicarse como app Android.

> El proyecto corrió originalmente sobre Firebase (Auth + Firestore). Ya está migrado a un backend propio 100% local, sin dependencias externas — ver [Historia: por qué no usa Firebase](#historia-por-qué-no-usa-firebase) si te interesa el contexto.

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack técnico](#stack-técnico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roles de usuario](#roles-de-usuario)
- [Puesta en marcha](#puesta-en-marcha)
- [Migrar usuarios existentes](#migrar-usuarios-existentes)
- [Scripts disponibles](#scripts-disponibles)
- [API del backend](#api-del-backend)
- [Despliegue](#despliegue)
  - [Docker / Nginx](#docker--nginx)
  - [App Android (TWA)](#app-android-twa)
- [Seguridad y archivos sensibles](#seguridad-y-archivos-sensibles)
- [Historia: por qué no usa Firebase](#historia-por-qué-no-usa-firebase)

## Funcionalidades

- **Autenticación propia**: registro e inicio de sesión con email/contraseña (bcrypt + JWT), sin servicios externos.
- **Creación de partidos**: cancha, fecha, horario y cupo de participantes (10/12/16).
- **Anotación a partidos**: listado de partidos disponibles con cupos.
- **Sorteo de equipos balanceado**: algoritmo Fisher-Yates + reparto por puntaje (`promedio` de ataque/defensa/corre) para armar equipos parejos, con opción de resortear e intercambiar jugadores manualmente entre equipos.
- **Finalización de partidos**: registro de ganador, marcador y jugadores que efectivamente jugaron.
- **Historial de partidos jugados**.
- **Estadísticas de jugadores**: ABM de atributos (ataque, defensa, corre) y promedio calculado, usado por el balanceador de equipos.
- **Administración de usuarios**: gestión de roles (`master`, `admin`, `common`).

## Stack técnico

- **Frontend**: [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/) (`react-scripts` / Create React App).
- **Backend**: Node.js + Express, en [`server/`](server/).
- **Base de datos**: [SQLite](https://www.sqlite.org/) vía [Prisma ORM](https://www.prisma.io/) — un solo archivo, sin servidor de base de datos que instalar.
- **Auth**: contraseñas con `bcrypt`, sesión con JWT.
- Empaquetado como TWA con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) para distribución en Android (`app/`, `build.gradle`, `twa-manifest.json`).
- Docker + Nginx para servir el build estático del frontend como contenedor.

## Estructura del proyecto

```
src/                          # Frontend (React)
├── App.js                     # Router raíz + contexto de usuario autenticado
├── api.js                      # Cliente HTTP hacia el backend (fetch + JWT)
├── LoginPage.js / RegisterPage.js
├── HomePage.js                  # Menú principal según rol
├── CreateMatchPage.js            # Alta de partidos
├── MatchListPage.js              # Listado / anotación a partidos disponibles
├── TeamBalancerModal.js           # Sorteo y balanceo de equipos
├── FinalizeMatchModal.js          # Cierre de partido (resultado, jugadores)
├── PlayedMatchesPage.js            # Historial de partidos jugados
├── PlayerStatsPage.js               # ABM de estadísticas de jugadores
├── UserManagementPage.js             # Administración de roles de usuario
├── PlayersModal.js / AddPlayerModal.js  # Modales de gestión de jugadores en un partido
└── TypingEffect.js                       # Efecto visual de texto

server/                      # Backend (Node + Express + Prisma)
├── prisma/schema.prisma       # Modelos: User, PlayerStats, Match
├── src/
│   ├── index.js                 # App de Express
│   ├── auth.js                   # JWT + middlewares de auth/roles
│   ├── db.js                      # Cliente de Prisma
│   └── routes/                     # auth, users, playerStats, matches
└── scripts/migrate-firebase-users.js  # Importa usuarios desde el export viejo de Firebase Auth

android.keystore, app/, build.gradle, twa-manifest.json  # Empaquetado Android (TWA)
Dockerfile, nginx.conf                                    # Contenedor de producción del frontend
```

## Roles de usuario

Definidos en el campo `role` de cada usuario (tabla `User` en la base local), validados tanto en el frontend (mostrar/ocultar botones) como en el backend (autorización real de cada endpoint):

| Rol      | Permisos |
|----------|----------|
| `master` | Todo: crear partidos, administrar usuarios y roles, gestionar estadísticas de jugadores, resortear/editar equipos de cualquier partido. |
| `admin`  | Crear partidos, resortear/editar equipos de los partidos que crea. |
| `common` | Anotarse a partidos y ver su historial. |

## Puesta en marcha

Requisitos: Node.js 18+ y npm.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # generá un JWT_SECRET propio en .env, no uses el de ejemplo
npx prisma migrate dev      # crea server/dev.db con el schema
npm run dev                 # levanta la API en http://localhost:4000
```

El primer usuario que se registre entra con rol `common`. Para tener un `master` inicial, promovelo a mano una vez creado:

```bash
cd server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.update({ where: { email: 'TU_EMAIL@ejemplo.com' }, data: { role: 'master' } })
  .then(() => console.log('listo'))
  .finally(() => prisma.\$disconnect());
"
```

### 2. Frontend

En otra terminal, desde la raíz del proyecto:

```bash
npm install
npm start
```

La app queda disponible en [http://localhost:3000](http://localhost:3000) y habla con la API en `http://localhost:4000/api` (configurable con la variable de entorno `REACT_APP_API_URL`, ver [`src/api.js`](src/api.js)).

## Migrar usuarios existentes

Si tenés el viejo `users.json` (export de Firebase Auth, no versionado — ver [Seguridad](#seguridad-y-archivos-sensibles)), podés precargar esos emails en la base nueva:

```bash
cd server
node scripts/migrate-firebase-users.js --users-json=../users.json
```

**Las contraseñas de Firebase no se pueden migrar** (usan un algoritmo con una clave del proyecto que no está en el export), así que el script genera una contraseña temporal por usuario y la imprime en la consola — compartila por un canal seguro (no por acá) para que cada uno la cambie. `users.json` solo trae email/uid, no `name`/`role`/estadísticas (eso vivía en Firestore); si tenés también un export de esas colecciones, pasalo con `--firestore-export=<archivo.json>` para completar esos datos automáticamente.

## Scripts disponibles

**Frontend** (raíz del proyecto):

| Comando | Descripción |
|---|---|
| `npm start` | Corre la app en modo desarrollo con recarga en caliente. |
| `npm test` | Corre los tests en modo watch (Jest + Testing Library). |
| `npm run build` | Genera el build de producción optimizado en `build/`. |
| `npm run eject` | Expone la configuración de Create React App (operación irreversible). |

**Backend** (`server/`):

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta la API en `http://localhost:4000`. |
| `npm run prisma:migrate` | Aplica cambios de `schema.prisma` a la base local. |
| `npm run prisma:studio` | Abre [Prisma Studio](https://www.prisma.io/studio) para ver/editar datos con una UI. |
| `npm run seed:from-firebase` | Atajo para `scripts/migrate-firebase-users.js`. |

## API del backend

Todas las rutas (salvo `/api/auth/register` y `/api/auth/login`) requieren `Authorization: Bearer <token>`.

| Método | Ruta | Rol requerido |
|---|---|---|
| `POST` | `/api/auth/register` | — |
| `POST` | `/api/auth/login` | — |
| `GET` | `/api/auth/me` | cualquiera autenticado |
| `POST` | `/api/auth/change-password` | cualquiera autenticado |
| `GET` | `/api/users` | `master` |
| `PATCH` | `/api/users/:id/role` | `master` |
| `GET` | `/api/player-stats` (`?names=a,b`) | cualquiera autenticado |
| `POST` / `PATCH` / `DELETE` | `/api/player-stats/:id?` | `master` |
| `GET` | `/api/matches` (`?status=pending\|finalized&player=nombre`) | cualquiera autenticado |
| `POST` | `/api/matches` | `master`/`admin` |
| `PATCH` / `DELETE` | `/api/matches/:id` | dueño del partido o `master` |
| `POST` | `/api/matches/:id/join` | cualquiera autenticado (se anota/desanota a sí mismo) |
| `POST` | `/api/matches/:id/players` | `master`/`admin` |
| `DELETE` | `/api/matches/:id/players/:playerName` | dueño del partido o `master` |
| `PATCH` | `/api/matches/:id/teams` | dueño del partido o `master` |
| `POST` | `/api/matches/:id/finalize` | dueño del partido o `master` |

## Despliegue

### Docker / Nginx

El `Dockerfile` compila el frontend y lo sirve con Nginx (`nginx.conf`) — el backend (`server/`) se despliega aparte (otro proceso Node, o su propio contenedor):

```bash
docker build -t foca-futbol .
docker run -p 8080:80 foca-futbol
```

### App Android (TWA)

La app se empaqueta como Trusted Web Activity con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), apuntando a la URL pública donde esté corriendo el frontend. Los artefactos de build (`app/build/`, `.gradle/`, `*.apk`, `*.aab`) no se versionan; se regeneran con:

```bash
bubblewrap build
```

Necesitás tu propio keystore de firma (`android.keystore` no está incluido en el repositorio, ver sección siguiente) y actualizar `twa-manifest.json` con tus datos (`packageId`, `host`, `signingKey`).

## Seguridad y archivos sensibles

Este repo **no** versiona (ver `.gitignore`):

- `android.keystore` — clave privada de firma de la app Android.
- `users.json` — export viejo de usuarios de Firebase Auth (contiene hashes de contraseña y salts; nunca debe compartirse ni commitearse).
- `server/.env`, `server/dev.db` — secretos y base de datos local del backend.
- Artefactos de build (`*.apk`, `*.aab`, `*.idsig`, `build/`, `.gradle/`, `server/node_modules`).

Si vas a hacer pública la app en un store, generá tu propio `android.keystore` con `keytool` y guardalo fuera del control de versiones (gestor de secretos, o al menos fuera del repo). Generá también tu propio `JWT_SECRET` en `server/.env` (no reutilices ningún valor de ejemplo del repo).

## Historia: por qué no usa Firebase

El proyecto arrancó sobre Firebase (Authentication + Firestore). Se migró a un backend propio (Node + Express + Prisma + SQLite) para poder correr 100% local/offline sin costo de un servicio en la nube y con control total de las reglas de autorización por rol. El detalle completo de esa migración — arquitectura, mapeo de datos, qué se hizo con la autenticación y qué archivo del frontend cambió por cuál endpoint — queda documentado en [MIGRATION.md](MIGRATION.md) como referencia histórica.
