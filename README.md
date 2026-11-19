# Sistema de Turnos

Sistema web para la gestión de turnos de un consultorio médico y administración interna de profesionales.

El proyecto está diseñado para facilitar la organización de las consultas médicas y automatizar la gestión de cobros de los consultorios, estructurando el acceso mediante un sistema de roles y permisos. <!-- roles/perfiles -->

Proyecto correspondiente a la Tecnicatura Universitaria en Programación.

## Perfiles de Usuario

El sistema cuenta con tres niveles de acceso, cada uno con responsabilidades y vistas específicas:

- **Paciente:**
    - Acceso al portal web público.
    - Visualización de la cartilla de profesionales, terapias ofrecidas y disponibilidad horaria.
    - Gestión de perfil personal para visualizar sus turnos agendados (historial de turnos pasados y próximos).
    - Cancelación de turnos de forma autónoma desde el sistema con hasta 24 horas de anticipación (las cancelaciones con menor tiempo de aviso deben derivarse a través de WhatsApp).
- **Profesional:**
    - Gestión de agenda personal (visualización, creación y modificación de turnos de sus pacientes).
    - Visualización de agendas de otros colegas para facilitar la asignación de turnos.
    - _Nota: No poseen permisos para modificar la vista pública ni los valores de las terapias._
- **Administrador:**
    - Control total sobre el sistema y visión global de todos los pacientes y agendas profesionales.
    - Modificación de la información pública de la página (horarios de los profesionales y actualización de los valores de las terapias).
    - **Módulo de Gestión Administrativa:** Acceso exclusivo a un panel de liquidación para gestionar los cobros a los profesionales. El sistema calcula los montos a abonar en base a los módulos de horas asignadas (por ejemplo, módulos de 4 horas semanales), contabilizando la totalidad del módulo independientemente del nivel de ocupación (turnos efectivos).

## Integrantes

- Foricher Castellón, Juan.
- Franco, Adrian Emmanuel.
- Ramirez Labadie, Ignacio.
- Stallone, Ramiro.

## Tecnologías

- Node.js 24.20.0
- TypeScript
- Express
- Sequelize
- PostgreSQL
- Docker

## Requisitos

Antes de comenzar, es necesario tener instalado:

- Node.js 24.20.0 (si usás `nvm`, ejecutá `nvm use` para tomar `.nvmrc`)
- npm
- Git
- Docker con Docker Compose v2 (`docker compose`)
- Los puertos `3000` (API), `5432` (PostgreSQL) y `8080` (pgAdmin) libres

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/ignaciorlabadie/TF-Integrador-Backend.git
```

Ingresar al proyecto:

```bash
cd TF-Integrador-Backend
```

Si usás `nvm`, seleccionar la versión indicada en `.nvmrc`:

```bash
nvm use
```

Crear el archivo de variables de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

Completar en `.env` los valores necesarios. Como mínimo, definí `JWT_SECRET`.
Configurá también Brevo y Supabase si vas a probar emails o estudios.

> Para desarrollo local, `DATABASE_URL` debe quedar vacía o comentada: si tiene
> un valor, la API la usa en lugar de las variables `DB_*`.

Instalar las dependencias:

```bash
npm ci
```

## Ejecución

### Opción A: todo con Docker

Levantar PostgreSQL, la API y pgAdmin:

```bash
docker compose up --build
```

El servicio `app` carga todas las variables de `.env`. En Compose se fijan
`PORT=3000`, `DB_HOST=db` y `DB_PORT=5432` para la red interna de Docker.

En otra terminal, aplicar las migraciones y cargar los datos iniciales:

```bash
npm run db:migrate
npm run db:seed:all
```

> Los seeders son necesarios para crear el primer usuario `ADMIN`
> (`admin@tfi.local.com` / `Password123`). Si ya existe un administrador, podés
> omitirlos. Ejecutan `TRUNCATE ... CASCADE`, por lo que solo deben usarse en
> desarrollo.

La API queda disponible en `http://localhost:3000/api`, el healthcheck en
`http://localhost:3000/health` y Swagger en `http://localhost:3000/api-docs`.
pgAdmin queda en `http://localhost:8080` con las credenciales
`PGADMIN_DEFAULT_*` de `.env`.

> `/health` solo verifica la conexión con PostgreSQL, no que las migraciones
> estén aplicadas. Ejecutá las migraciones antes de probar los endpoints.

También se pueden ejecutar dentro del contenedor:

```bash
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed:all
```

### Opción B: API local con hot reload

Para desarrollar con `npm run dev`, levantá solo PostgreSQL en Docker:

```bash
docker compose up -d db
npm run db:migrate
npm run db:seed:all
npm run dev
```

> No levantes el servicio `app` al mismo tiempo: la API local y el contenedor
> usan el puerto `3000`. Si ya está corriendo, ejecutá
> `docker compose stop app`.

Para probar el build compilado en lugar de `npm run dev`:

```bash
npm run build
npm start
```

### Migraciones y seeders

- `npm run db:migrate` aplica las migraciones pendientes.
- `npm run db:seed:all` carga los datos iniciales y crea el primer `ADMIN`.
- Para reiniciar los datos de prueba, ejecutá `npm run db:seed:undo:all` y
  después `npm run db:seed:all`. Volver a ejecutar `db:seed:all` no trunca las
  tablas ni repite los seeders ya aplicados.
- Los comandos `db:*` usan `src/config/config.js`, que solo define el entorno
  `development`. En local mantené `NODE_ENV=development`; `production` es para
  Render.
- Si `DATABASE_URL` tiene un valor, los comandos ejecutados en el host apuntan a
  esa base remota, mientras que la app en Docker usa el PostgreSQL local. Para
  desarrollo local dejá `DATABASE_URL` vacía o comentada.

## Ambientes

| Ambiente            | API                                              | Healthcheck                                         |
| ------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Local               | `http://localhost:3000/api`                      | `http://localhost:3000/health`                      |
| Producción (Render) | `https://tf-integrador-backend.onrender.com/api` | `https://tf-integrador-backend.onrender.com/health` |

En local, la API usa las variables `DB_*` del archivo `.env` (con Docker, `app`
recibe todo `.env` y Compose fija `DB_HOST=db` y `DB_PORT=5432`). En Render se
usa `DATABASE_URL` (PostgreSQL en Neon) y las variables se configuran en el
panel del servicio.

### Variables de entorno

El archivo `.env.example` enumera todas las variables usadas por el proyecto.
Según el entorno, se agrupan de la siguiente manera.

#### Producción (Render)

| Variable                    | Descripción                                                                                                                                                   | Default / obligatoriedad                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `production` en Render. Solo con `development` se registra el SQL; fuera de `development` se exige Supabase y con `test` no corren recordatorios              | Opcional; si falta, Supabase interpreta `development`                           |
| `PORT`                      | Puerto HTTP del servidor                                                                                                                                      | `3000` (Render normalmente lo inyecta)                                          |
| `DATABASE_URL`              | Cadena de conexión a PostgreSQL (Neon). Tiene prioridad sobre `DB_*` y fuerza SSL con `rejectUnauthorized: true`                                              | Obligatoria en Render; sin ella se intenta `localhost` y el servidor no escucha |
| `JWT_SECRET`                | Clave para firmar y verificar los tokens JWT                                                                                                                  | Obligatoria al iniciar sesión y en rutas protegidas; no se valida al arrancar   |
| `JWT_EXPIRES_IN`            | Duración del token JWT                                                                                                                                        | `1d`                                                                            |
| `BCRYPT_SALT_ROUNDS`        | Rondas de hash de bcrypt                                                                                                                                      | `10`; solo se aceptan enteros entre `4` y `15`, si no se usa `10`               |
| `FRONTEND_URL`              | Base del frontend para los enlaces de recuperación (`/reset-password`) y bienvenida (`/login`). En producción: `https://trabajo-final-integrador.netlify.app` | Necesaria para esos emails; se ignoran las barras finales                       |
| `RESET_TOKEN_TTL_MINUTES`   | Minutos de validez del token de recuperación                                                                                                                  | `30`; debe ser entero positivo, si no se usa `30`                               |
| `BREVO_API_KEY`             | API key de Brevo para enviar emails                                                                                                                           | Opcional para arrancar; sin ella los envíos fallan y se registran en consola    |
| `EMAIL_FROM`                | Remitente verificado en Brevo                                                                                                                                 | Necesario para enviar emails                                                    |
| `EMAIL_FROM_NAME`           | Nombre visible del remitente                                                                                                                                  | `Sistema de Turnos`                                                             |
| `SUPABASE_URL`              | URL del proyecto de Supabase (estudios)                                                                                                                       | Obligatoria fuera de `development`; en local, sin ella los uploads dan `503`    |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (estudios)                                                                                                                       | Igual que `SUPABASE_URL`                                                        |
| `SUPABASE_BUCKET`           | Bucket de almacenamiento de estudios                                                                                                                          | `estudios-medicos`                                                              |
| `SUPABASE_SIGNED_URL_TTL`   | Segundos de validez de las URLs firmadas                                                                                                                      | `3600` (se convierte con `Number()`)                                            |

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son obligatorias cuando
> `NODE_ENV` no es `development`: la aplicación no inicia si faltan. En
> desarrollo la aplicación arranca sin ellas, pero subir estudios responde
> `503`.

#### Base de datos local / Docker

Estas variables se usan solo cuando `DATABASE_URL` está vacía o comentada. En
`docker compose`, `DB_HOST` se fija en `db` y `DB_PORT` en `5432`.

| Variable      | Descripción                | Default      |
| ------------- | -------------------------- | ------------ |
| `DB_HOST`     | Host de PostgreSQL         | `localhost`  |
| `DB_PORT`     | Puerto de PostgreSQL       | `5432`       |
| `DB_NAME`     | Nombre de la base de datos | `tfi_turnos` |
| `DB_USER`     | Usuario de PostgreSQL      | `postgres`   |
| `DB_PASSWORD` | Contraseña de PostgreSQL   | `postgres`   |

#### Recordatorios de turnos

| Variable                           | Descripción                                                                                   | Default / comportamiento                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `APP_TIMEZONE`                     | Zona horaria usada para calcular los recordatorios                                            | `America/Argentina/Buenos_Aires`                                                 |
| `RECORDATORIOS_TURNOS_HABILITADOS` | Habilita el job. Solo el string exacto `false` lo desactiva; `NODE_ENV=test` también lo omite | Habilitado si falta o tiene cualquier valor distinto de `false`                  |
| `RECORDATORIO_TURNO_INTERVALO_MS`  | Intervalo de ejecución en milisegundos                                                        | `600000` (10 minutos); si no es un número finito mayor que `0`, se usa ese valor |

`.env.example` deja los recordatorios deshabilitados en local porque requieren
Brevo para enviar emails.

#### pgAdmin (solo Docker local)

| Variable                   | Descripción                    |
| -------------------------- | ------------------------------ |
| `PGADMIN_DEFAULT_EMAIL`    | Email de acceso a pgAdmin      |
| `PGADMIN_DEFAULT_PASSWORD` | Contraseña de acceso a pgAdmin |

## Estructura del proyecto

```text
TF-Integrador-Backend/
├──.husky/
├──docs/
├──src/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── docs/
│   ├── errors/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── validators/
│   ├── app.ts
│   └── server.ts
├──tests/
│   ├── helpers/
│   ├── integration/
│   └── unit/
├──.dockerignore
├──.env.example
├──.gitignore
├──.nvmrc
├──.prettierignore
├──.prettierrc
├──docker-compose.yml
├──Dockerfile
├──eslint.config.js
├──package-lock.json
├──package.json
├──README.md
├──tsconfig.json
└──vitest.config.ts
```

## Documentación

La documentación interactiva de la API (Swagger UI) está disponible en:

| Ambiente            | Swagger UI                                            | Contrato OpenAPI                                                   |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Local               | `http://localhost:3000/api-docs`                      | `http://localhost:3000/api-docs/openapi.json`                      |
| Producción (Render) | `https://tf-integrador-backend.onrender.com/api-docs` | `https://tf-integrador-backend.onrender.com/api-docs/openapi.json` |

La especificación OpenAPI se genera con `swagger-jsdoc` a partir de las
anotaciones `@openapi` en `src/routes/`.

La documentación detallada de la API está en [`docs/`](./docs/README.md):

- [Autenticación](./docs/auth.md): login, perfil y recuperación de contraseña.
- [Usuarios](./docs/usuarios.md): alta y gestión de cuentas.
- [Pacientes](./docs/pacientes.md): registro, perfil propio y administración.
- [Roles](./docs/roles.md): roles disponibles y responsabilidades.
- [Profesionales](./docs/profesionales.md): perfiles y cuentas asociadas.
- [Turnos](./docs/turnos.md): creación, actualización y cancelación.
- [Agendas](./docs/agendas.md): disponibilidad semanal de profesionales.
- [Espacios](./docs/espacios.md): espacios físicos y ocupación.
- [Asignaciones de espacio](./docs/asignaciones-espacio.md): asignaciones fijas y específicas.
- [Tarifas de espacio](./docs/tarifas-espacio.md): precios por hora y vigencia.
- [Estudios](./docs/estudios.md): estudios médicos, archivos y URL firmada.
- [Autorizaciones de estudio](./docs/autorizaciones-estudio.md): acceso de profesionales a estudios.
- [Modelo de datos](./docs/modelo-datos.md): tablas, relaciones y diagrama ER.

## Flujo de alta de usuarios

El rol de una cuenta **no lo decide el cliente**: se define por el endpoint que
se usa. Cada endpoint tiene una única semántica de rol.

| Endpoint              | Acceso                 | Rol                                            | Crea                                           |
| --------------------- | ---------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `POST /api/pacientes` | público                | `PACIENTE` (implícito)                         | `users` + `pacientes`, en una sola transacción |
| `POST /api/usuarios`  | `Bearer` + rol `ADMIN` | `PROFESIONAL` o `ADMIN` (explícito en el body) | `users`                                        |
| `GET /api/roles`      | público                | —                                              | — (lista los roles disponibles)                |

Reglas principales:

- El registro público es **únicamente** el de pacientes (`POST /api/pacientes`),
  que crea el usuario y su perfil juntos. Un paciente siempre tiene perfil.
- Las cuentas `PROFESIONAL` y `ADMIN` las crea un administrador autenticado
  en `POST /api/usuarios`. El body incluye `rol` y, opcionalmente, `activo: false`
  para pre-crear una cuenta inactiva.
- Intentar dar de alta un paciente por `POST /api/usuarios` devuelve `400` con el
  mensaje indicando que el alta de pacientes se hace en `POST /api/pacientes`.
- El primer usuario `ADMIN` se crea con los seeders
  (`admin@tfi.local.com` / `Password123`).
- La creación de usuario y perfil es atómica: si algo falla, no queda ni la
  cuenta ni el perfil.

Los payloads, respuestas y códigos de error están detallados en
[`docs/usuarios.md`](./docs/usuarios.md) y
[`docs/pacientes.md`](./docs/pacientes.md).

## Recuperación de contraseña

El flujo usa un token aleatorio de un solo uso, guardado hasheado en la base de
datos junto con su fecha de expiración.

| Endpoint                         | Acceso  | Descripción                                   |
| -------------------------------- | ------- | --------------------------------------------- |
| `POST /api/auth/forgot-password` | público | Solicita el envío del enlace de recuperación  |
| `POST /api/auth/reset-password`  | público | Establece la nueva contraseña usando el token |

El enlace enviado apunta a `${FRONTEND_URL}/reset-password?token=...`. Por
seguridad, `forgot-password` responde siempre `200` con un mensaje genérico,
exista o no el email, y el token expira según `RESET_TOKEN_TTL_MINUTES`.

El detalle del flujo, los payloads y las variables de entorno están en
[`docs/auth.md`](./docs/auth.md).

## Estado del proyecto

Proyecto en desarrollo.
