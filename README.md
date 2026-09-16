# Foca Fútbol

Aplicación web (React + Firebase) para organizar partidos de fútbol 5/7 entre un grupo fijo de jugadores: creación de partidos, anotación, sorteo de equipos balanceado por nivel, historial de partidos jugados y estadísticas de jugadores. También está empaquetada como Trusted Web Activity (TWA) para publicarse como app Android.

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack técnico](#stack-técnico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roles de usuario](#roles-de-usuario)
- [Puesta en marcha](#puesta-en-marcha)
- [Configuración de Firebase](#configuración-de-firebase)
- [Scripts disponibles](#scripts-disponibles)
- [Despliegue](#despliegue)
  - [Firebase Hosting](#firebase-hosting)
  - [Docker / Nginx](#docker--nginx)
  - [App Android (TWA)](#app-android-twa)
- [Seguridad y archivos sensibles](#seguridad-y-archivos-sensibles)
- [Migrar el proyecto fuera de Firebase](#migrar-el-proyecto-fuera-de-firebase)

## Funcionalidades

- **Autenticación**: registro e inicio de sesión con Firebase Auth (email/contraseña).
- **Creación de partidos**: cancha, fecha, horario y cupo de participantes (10/12/16).
- **Anotación a partidos**: listado de partidos disponibles con cupos.
- **Sorteo de equipos balanceado**: algoritmo Fisher-Yates + reparto por puntaje (`promedio` de ataque/defensa/corre) para armar equipos parejos, con opción de resortear e intercambiar jugadores manualmente entre equipos.
- **Finalización de partidos**: registro de ganador, marcador y jugadores que efectivamente jugaron.
- **Historial de partidos jugados**.
- **Estadísticas de jugadores**: ABM de atributos (ataque, defensa, corre) y promedio calculado, usado por el balanceador de equipos.
- **Administración de usuarios**: gestión de roles (`master`, `admin`, `common`).

## Stack técnico

- [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/) (`react-scripts` / Create React App)
- [Firebase](https://firebase.google.com/) — Authentication + Firestore
- Empaquetado como TWA con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) para distribución en Android (`app/`, `build.gradle`, `twa-manifest.json`)
- Docker + Nginx para servir el build estático como contenedor

## Estructura del proyecto

```
src/
├── App.js                  # Router raíz + contexto de usuario autenticado
├── firebase.js              # Inicialización de Firebase (Auth + Firestore)
├── LoginPage.js              # Login
├── RegisterPage.js           # Registro (crea perfil y stats iniciales)
├── HomePage.js                # Menú principal según rol
├── CreateMatchPage.js          # Alta de partidos
├── MatchListPage.js            # Listado / anotación a partidos disponibles
├── TeamBalancerModal.js         # Sorteo y balanceo de equipos
├── FinalizeMatchModal.js        # Cierre de partido (resultado, jugadores)
├── PlayedMatchesPage.js          # Historial de partidos jugados
├── PlayerStatsPage.js             # ABM de estadísticas de jugadores
├── UserManagementPage.js           # Administración de roles de usuario
├── PlayersModal.js / AddPlayerModal.js  # Modales de gestión de jugadores en un partido
└── TypingEffect.js                       # Efecto visual de texto

android.keystore, app/, build.gradle, twa-manifest.json  # Empaquetado Android (TWA)
Dockerfile, nginx.conf                                    # Contenedor de producción
firebase.json, .firebaserc                                # Firebase Hosting
```

## Roles de usuario

Definidos en el campo `role` del documento del usuario en Firestore (colección `users`):

| Rol      | Permisos |
|----------|----------|
| `master` | Todo: crear partidos, administrar usuarios y roles, gestionar estadísticas de jugadores, resortear/editar equipos de cualquier partido. |
| `admin`  | Crear partidos, resortear/editar equipos de los partidos que crea. |
| `common` | Anotarse a partidos y ver su historial. |

## Puesta en marcha

Requisitos: Node.js 18+ y npm.

```bash
git clone <url-del-repo>
cd foca-futbol
npm install
```

Configurá las credenciales de Firebase (ver siguiente sección) y luego:

```bash
npm start
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

## Configuración de Firebase

El proyecto usa Firebase Authentication (email/contraseña) y Firestore con las colecciones:

- `users`: perfil de cada usuario (`email`, `name`, `role`).
- `playerStats`: atributos por jugador (`ataque`, `defensa`, `corre`, `promedio`, `uid` opcional para vincular con un usuario).
- `matches`: partidos (`field`, `date`, `time`, `participants`, `players`, `teamA`, `teamB`, `status`, `createdBy`, resultado al finalizar).

Para apuntar a tu propio proyecto de Firebase, reemplazá los valores en [`src/firebase.js`](src/firebase.js) por los de tu consola de Firebase (Project settings → General → Your apps). El `apiKey` de un proyecto Firebase web no es secreto por diseño (queda visible en el bundle del cliente); la seguridad real depende de las [reglas de Firestore/Auth](https://firebase.google.com/docs/rules) del proyecto, así que asegurate de tenerlas restringidas por rol antes de ir a producción.

## Scripts disponibles

En el directorio del proyecto podés correr:

| Comando | Descripción |
|---|---|
| `npm start` | Corre la app en modo desarrollo con recarga en caliente. |
| `npm test` | Corre los tests en modo watch (Jest + Testing Library). |
| `npm run build` | Genera el build de producción optimizado en `build/`. |
| `npm run eject` | Expone la configuración de Create React App (operación irreversible). |

## Despliegue

### Firebase Hosting

El repo incluye `firebase.json` y `.firebaserc` apuntando al proyecto `futbol-foca`. Para desplegar a tu propio proyecto:

```bash
npm run build
firebase deploy
```

### Docker / Nginx

El `Dockerfile` compila la app y la sirve con Nginx (`nginx.conf`):

```bash
docker build -t foca-futbol .
docker run -p 8080:80 foca-futbol
```

### App Android (TWA)

La app se empaqueta como Trusted Web Activity con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), apuntando al sitio publicado en Firebase Hosting. Los artefactos de build (`app/build/`, `.gradle/`, `*.apk`, `*.aab`) no se versionan; se regeneran con:

```bash
bubblewrap build
```

Necesitás tu propio keystore de firma (`android.keystore` no está incluido en el repositorio, ver sección siguiente) y actualizar `twa-manifest.json` con tus datos (`packageId`, `host`, `signingKey`).

## Seguridad y archivos sensibles

Este repo **no** versiona (ver `.gitignore`):

- `android.keystore` — clave privada de firma de la app Android.
- `users.json` — export de usuarios de Firebase Auth (contiene hashes de contraseña y salts; nunca debe compartirse ni commitearse).
- Artefactos de build (`*.apk`, `*.aab`, `*.idsig`, `build/`, `.gradle/`).
- `.firebase/` y `.firebaserc` — cache/config local del CLI de Firebase.

Si vas a hacer pública la app en un store, generá tu propio `android.keystore` con `keytool` y guardalo fuera del control de versiones (gestor de secretos, o al menos fuera del repo).

## Migrar el proyecto fuera de Firebase

Si querés dejar de depender de Firebase y correr el proyecto con un backend propio local (Node + Prisma + SQLite), el plan completo — arquitectura propuesta, mapeo de datos, qué hacer con la autenticación y qué archivo del frontend cambia por cuál endpoint — está en [MIGRATION.md](MIGRATION.md).
