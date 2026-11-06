# Autenticación

Endpoints montados bajo `/api/auth`.

## Resumen

| Método | Ruta                        | Acceso      | Descripción                                 |
| ------ | --------------------------- | ----------- | ------------------------------------------- |
| `POST` | `/api/auth/login`           | Público     | Inicia sesión y devuelve un JWT             |
| `GET`  | `/api/auth/me`              | Autenticado | Devuelve el perfil del usuario del token    |
| `POST` | `/api/auth/forgot-password` | Público     | Solicita el enlace de recuperación          |
| `POST` | `/api/auth/reset-password`  | Público     | Establece una nueva contraseña con el token |

---

## POST /api/auth/login

Inicia sesión con email y contraseña. El email se normaliza antes de buscarlo.

**Acceso:** público.

### Body

| Campo      | Tipo   | Obligatorio | Descripción               |
| ---------- | ------ | ----------- | ------------------------- |
| `email`    | string | Sí          | Email de la cuenta        |
| `password` | string | Sí          | Contraseña en texto plano |

```json
{
    "email": "admin@tfi.local.com",
    "password": "Password123"
}
```

### Respuesta `200`

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
        "id": 1,
        "email": "admin@tfi.local.com",
        "rol": "ADMIN",
        "activo": true
    }
}
```

### Errores

| Código | Mensaje                               | Causa                                          |
| ------ | ------------------------------------- | ---------------------------------------------- |
| `400`  | `Email y contraseña son obligatorios` | Falta `email` o `password`, o están vacíos     |
| `401`  | `Email o contraseña incorrectos`      | El email no existe o la contraseña no coincide |
| `403`  | `El usuario está desactivado`         | La cuenta existe pero `activo` es `false`      |
| `500`  | `JWT_SECRET no está configurado`      | Falta la variable de entorno                   |

---

## GET /api/auth/me

Devuelve el perfil público del usuario autenticado (sin datos sensibles).

**Acceso:** autenticado (`Bearer`).

### Respuesta `200`

```json
{
    "id": 1,
    "email": "admin@tfi.local.com",
    "rol": "ADMIN",
    "activo": true,
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z"
}
```

### Errores

| Código | Mensaje                                                         | Causa                             |
| ------ | --------------------------------------------------------------- | --------------------------------- |
| `401`  | `Token de autorización requerido` / `Token inválido o expirado` | Falta el token o no es válido     |
| `404`  | `Usuario no encontrado`                                         | El usuario del token ya no existe |

---

## POST /api/auth/forgot-password

Solicita el envío de un enlace para restablecer la contraseña.

**Acceso:** público.

### Body

| Campo   | Tipo   | Obligatorio | Descripción        |
| ------- | ------ | ----------- | ------------------ |
| `email` | string | Sí          | Email de la cuenta |

```json
{
    "email": "usuario@example.com"
}
```

### Respuesta `200`

La respuesta es **siempre la misma**, exista o no el email y esté activo o no,
para no revelar qué cuentas están registradas:

```json
{
    "mensaje": "Si el email está registrado, vas a recibir un enlace de recuperación"
}
```

### Comportamiento

- Si el email no existe o el usuario está desactivado, no se envía nada.
- Si existe y está activo:
    1. Se genera un token aleatorio de 64 caracteres hexadecimales.
    2. Se guarda **solo su hash SHA-256** en `users.resetPasswordTokenHash`.
    3. Se guarda la expiración en `users.resetPasswordExpiresAt` según
       `RESET_TOKEN_TTL_MINUTES` (por defecto `30` minutos).
    4. Se envía un email con el enlace
       `${FRONTEND_URL}/reset-password?token=<token>`.
- Si el envío del email falla, el error se registra en el servidor pero el
  endpoint igual responde `200` (evita filtrar información).
- El token es de un solo uso: se invalida al restablecer la contraseña.

### Errores

| Código | Mensaje                               | Causa                                  |
| ------ | ------------------------------------- | -------------------------------------- |
| `400`  | `El email no tiene un formato válido` | `email` ausente o con formato inválido |

> Si falta `FRONTEND_URL` o falla el servicio de email, el error se registra en
> el servidor pero la respuesta sigue siendo `200`, por la misma razón de no
> filtrar información.

---

## POST /api/auth/reset-password

Establece una nueva contraseña usando el token recibido por email.

**Acceso:** público.

### Body

| Campo      | Tipo   | Obligatorio | Descripción                          |
| ---------- | ------ | ----------- | ------------------------------------ |
| `token`    | string | Sí          | Token recibido en el enlace          |
| `password` | string | Sí          | Nueva contraseña (8 a 72 caracteres) |

```json
{
    "token": "token-recibido-por-email",
    "password": "NuevaPassword123"
}
```

### Respuesta `200`

```json
{
    "mensaje": "Contraseña actualizada correctamente"
}
```

### Comportamiento

- Se hashea el token recibido y se busca el usuario por
  `resetPasswordTokenHash`.
- El token debe existir y no estar expirado.
- Al finalizar, se guarda la contraseña hasheada con bcrypt y se limpian
  `resetPasswordTokenHash` y `resetPasswordExpiresAt`.

### Errores

| Código | Mensaje                                            | Causa                        |
| ------ | -------------------------------------------------- | ---------------------------- |
| `400`  | `El token es obligatorio`                          | `token` ausente o vacío      |
| `400`  | `La contraseña debe tener entre 8 y 72 caracteres` | Contraseña inválida          |
| `400`  | `El enlace es inválido o expiró`                   | Token inexistente o expirado |

---

## Variables de entorno

```env
JWT_SECRET=cambiar-esto
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10

FRONTEND_URL=http://localhost:5173
RESET_TOKEN_TTL_MINUTES=30

BREVO_API_KEY=<tu-api-key-de-brevo>
EMAIL_FROM=remitente-verificado@example.com
EMAIL_FROM_NAME=Sistema de Turnos
```

El envío de emails usa la API HTTP de Brevo (no SMTP), porque los servicios
gratuitos de Render bloquean los puertos SMTP salientes. El email de
`EMAIL_FROM` debe estar verificado en Brevo.
