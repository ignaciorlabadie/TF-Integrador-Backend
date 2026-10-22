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
git clone https://github.com/ignaciorlabadie/sistema-de-turnos.git
```

Ingresar al proyecto:

```bash
cd sistema-de-turnos
```

Instalar las dependencias:

```bash
npm ci
```

## Ejecución

Para levantar el proyecto:

```bash
docker compose up --build
```

Para ejecutar las migraciones:

```bash
npm run db:migrate
```

## Estructura del proyecto

```text
sistema-de-turnos/
├──.husky
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
├──.env
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
└──tsconfig.json
```

## Flujo de alta de usuarios

El rol de una cuenta **no lo decide el cliente**: se define por el endpoint que
se usa. Cada endpoint tiene una única semántica de rol.

| Endpoint | Acceso | Rol | Crea |
| --- | --- | --- | --- |
| `POST /pacientes` | público | `PACIENTE` (implícito) | `users` + `pacientes`, en una sola transacción |
| `POST /usuarios` | `Bearer` + rol `ADMIN` | `PROFESIONAL` o `ADMIN` (explícito en el body) | `users` |
| `GET /roles` | público | — | — (lista los roles disponibles) |

Reglas del flujo:

- El registro público es **únicamente** el de pacientes (`POST /pacientes`),
  que crea el usuario y su perfil juntos. Un paciente siempre tiene perfil.
- Las cuentas `PROFESIONAL` y `ADMIN` las crea un administrador autenticado
  en `POST /usuarios`. El body incluye `rol` y, opcionalmente, `activo: false`
  para pre-crear una cuenta inactiva.
- Intentar dar de alta un paciente por `POST /usuarios` devuelve `400` con el
  mensaje indicando que el alta de pacientes se hace en `POST /pacientes`.
- El primer usuario `ADMIN` se crea con los seeders
  (`admin@tfi.local.com` / `Password123`).
- La creación de usuario y perfil es atómica: si algo falla, no queda ni la
  cuenta ni el perfil.

Payloads:

```jsonc
// POST /pacientes
{
    "email": "paciente@example.com",
    "password": "Password123",
    "nombre": "Ana",
    "apellido": "Gomez",
    "dni": "12345678",
    "telefono": "+5491112345678",
    "fechaNacimiento": "1990-05-14",
    "direccion": "Calle Falsa 123"
}

// POST /usuarios (Bearer de un ADMIN)
{
    "email": "profesional@example.com",
    "password": "Password123",
    "rol": "PROFESIONAL"
}
```

Los errores siempre responden `{ "mensaje": "..." }` con los códigos `400`
(validación), `401` (sin autenticación), `403` (sin permisos), `404` (no
encontrado) y `409` (email o DNI ya registrados).

## Estado del proyecto

Proyecto en desarrollo.
