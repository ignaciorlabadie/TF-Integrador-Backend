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

- Node.js 24.20.0
- npm
- Git
- Docker

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/ignaciorlabadie/TF-Integrador-Backend.git
```

Ingresar al proyecto:

```bash
cd TF-Integrador-Backend
```

Crear el archivo de variables de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

Completar en `.env` los valores necesarios (`JWT_SECRET`, `BREVO_API_KEY`, etc.).

> Para desarrollo local, `DATABASE_URL` debe quedar vacía o comentada: si tiene
> un valor, la API la usa en lugar de las variables `DB_*`.

Instalar las dependencias:

```bash
npm ci
```

## Ejecución

Levantar la base de datos y la aplicación:

```bash
docker compose up --build
```

En otra terminal, ejecutar las migraciones:

```bash
npm run db:migrate
```

Cargar los datos de prueba (opcional):

```bash
npm run db:seed:all
```

> Los seeders ejecutan `TRUNCATE ... CASCADE`, por lo que reinician las tablas y
> solo deben usarse en desarrollo.

También se pueden ejecutar dentro del contenedor:

```bash
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed:all
```

## Ambientes

| Ambiente            | API                                              | Healthcheck                                         |
| ------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Local               | `http://localhost:3000/api`                      | `http://localhost:3000/health`                      |
| Producción (Render) | `https://tf-integrador-backend.onrender.com/api` | `https://tf-integrador-backend.onrender.com/health` |

En local, la API usa las variables `DB_*` del archivo `.env`. En Render se usa
`DATABASE_URL` (PostgreSQL en Neon) y las variables se configuran en el panel
del servicio.

### Variables de entorno en Render

| Variable                    | Descripción                                               |
| --------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`              | Cadena de conexión a PostgreSQL (Neon)                    |
| `JWT_SECRET`                | Clave para firmar los tokens JWT                          |
| `JWT_EXPIRES_IN`            | Duración del token (por ejemplo, `1d`)                    |
| `BCRYPT_SALT_ROUNDS`        | Rondas de hash de bcrypt (por ejemplo, `10`)              |
| `FRONTEND_URL`              | URL del frontend usada en el enlace de recuperación       |
| `RESET_TOKEN_TTL_MINUTES`   | Minutos de validez del token de recuperación              |
| `BREVO_API_KEY`             | API key de Brevo para enviar emails                       |
| `EMAIL_FROM`                | Remitente verificado en Brevo                             |
| `EMAIL_FROM_NAME`           | Nombre visible del remitente                              |
| `SUPABASE_URL`              | URL del proyecto de Supabase (estudios)                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (estudios)                   |
| `SUPABASE_BUCKET`           | Bucket de almacenamiento (por defecto `estudios-medicos`) |
| `SUPABASE_SIGNED_URL_TTL`   | Segundos de validez de las URLs firmadas                  |
| `NODE_ENV`                  | `production` en Render                                    |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son obligatorias fuera de
desarrollo: la aplicación no inicia si faltan.

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

La documentación detallada de la API está en [`docs/`](./docs/README.md):

- [Autenticación](./docs/auth.md): login, perfil y recuperación de contraseña.
- [Usuarios](./docs/usuarios.md): alta y gestión de cuentas.
- [Pacientes](./docs/pacientes.md): registro, perfil propio y administración.
- [Roles](./docs/roles.md): roles disponibles y responsabilidades.
- [Modelo de datos](./docs/modelo-datos.md): tablas `users` y `pacientes`.

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
