# Usuarios

Gestión de cuentas (`users`). Un usuario siempre tiene un rol:
`PACIENTE`, `PROFESIONAL` o `ADMIN`.

> El alta de **pacientes** no se hace por estos endpoints. Se realiza en
> [`POST /api/pacientes`](./pacientes.md), que crea la cuenta y su perfil juntos.

## Resumen

| Método  | Ruta                           | Acceso                      | Descripción                             |
| ------- | ------------------------------ | --------------------------- | --------------------------------------- |
| `POST`  | `/api/usuarios`                | `ADMIN`                     | Crea una cuenta `PROFESIONAL` o `ADMIN` |
| `GET`   | `/api/usuarios`                | `ADMIN`                     | Lista todas las cuentas                 |
| `GET`   | `/api/usuarios/email/:email`   | `ADMIN`                     | Busca una cuenta por email              |
| `GET`   | `/api/usuarios/:id`            | `ADMIN` o el propio usuario | Obtiene una cuenta por ID               |
| `PUT`   | `/api/usuarios/:id`            | `ADMIN` o el propio usuario | Actualiza email, contraseña o estado    |
| `PATCH` | `/api/usuarios/:id/desactivar` | `ADMIN`                     | Desactiva una cuenta                    |
| `PATCH` | `/api/usuarios/:id/reactivar`  | `ADMIN`                     | Reactiva una cuenta                     |

---

## POST /api/usuarios

Crea una cuenta de profesional o administrador. El rol **no** lo decide el
cliente libremente: el endpoint solo acepta `PROFESIONAL` o `ADMIN`.

**Acceso:** `Bearer` + rol `ADMIN`.

### Body

| Campo      | Tipo    | Obligatorio | Descripción                        |
| ---------- | ------- | ----------- | ---------------------------------- |
| `email`    | string  | Sí          | Email único de la cuenta           |
| `password` | string  | Sí          | Contraseña de 8 a 72 caracteres    |
| `rol`      | string  | Sí          | `PROFESIONAL` o `ADMIN`            |
| `activo`   | boolean | No          | Estado inicial. Por defecto `true` |

```json
{
    "email": "profesional@example.com",
    "password": "Password123",
    "rol": "PROFESIONAL"
}
```

Para pre-crear una cuenta inactiva:

```json
{
    "email": "profesional@example.com",
    "password": "Password123",
    "rol": "PROFESIONAL",
    "activo": false
}
```

### Respuesta `201`

```json
{
    "id": 6,
    "email": "profesional@example.com",
    "rol": "PROFESIONAL",
    "activo": true
}
```

### Errores

| Código | Mensaje                                                                            | Causa                        |
| ------ | ---------------------------------------------------------------------------------- | ---------------------------- |
| `400`  | `El email no tiene un formato válido`                                              | Email inválido               |
| `400`  | `La contraseña debe tener entre 8 y 72 caracteres`                                 | Contraseña inválida          |
| `400`  | `El rol debe ser uno de: PACIENTE, PROFESIONAL, ADMIN`                             | Rol desconocido              |
| `400`  | `El campo activo debe ser booleano`                                                | `activo` no es boolean       |
| `400`  | `El alta de pacientes se realiza en POST /pacientes (crea el usuario y su perfil)` | `rol: "PACIENTE"`            |
| `401`  | `Token de autorización requerido`                                                  | Falta el token               |
| `403`  | `No tenés permisos para realizar esta acción`                                      | El token no es de un `ADMIN` |
| `409`  | `El email ya está registrado`                                                      | El email ya existe           |

---

## GET /api/usuarios

Lista todas las cuentas. No incluye datos sensibles.

**Acceso:** `Bearer` + rol `ADMIN`.

### Respuesta `200`

```json
[
    {
        "id": 1,
        "email": "admin@tfi.local.com",
        "rol": "ADMIN",
        "activo": true,
        "createdAt": "2026-10-10T12:00:00.000Z",
        "updatedAt": "2026-10-10T12:00:00.000Z"
    }
]
```

### Errores

| Código | Mensaje                                       | Causa                        |
| ------ | --------------------------------------------- | ---------------------------- |
| `401`  | `Token de autorización requerido`             | Falta el token               |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN` |

---

## GET /api/usuarios/email/:email

Busca una cuenta por su email.

**Acceso:** `Bearer` + rol `ADMIN`.

### Parámetros

| Parámetro | Ubicación | Descripción    |
| --------- | --------- | -------------- |
| `email`   | path      | Email a buscar |

```http
GET /api/usuarios/email/profesional@example.com
```

### Respuesta `200`

```json
{
    "id": 6,
    "email": "profesional@example.com",
    "rol": "PROFESIONAL",
    "activo": true,
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z"
}
```

### Errores

| Código | Mensaje                                       | Causa                              |
| ------ | --------------------------------------------- | ---------------------------------- |
| `400`  | `El email es obligatorio`                     | El parámetro está vacío            |
| `401`  | `Token de autorización requerido`             | Falta el token                     |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN`       |
| `404`  | `Usuario no encontrado`                       | No existe una cuenta con ese email |

---

## GET /api/usuarios/:id

Obtiene una cuenta por su ID.

**Acceso:** `Bearer` + rol `ADMIN`, o el propio usuario autenticado.

### Parámetros

| Parámetro | Ubicación | Descripción             |
| --------- | --------- | ----------------------- |
| `id`      | path      | ID numérico del usuario |

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

| Código | Mensaje                                       | Causa                              |
| ------ | --------------------------------------------- | ---------------------------------- |
| `400`  | `El ID debe ser un número entero positivo`    | `id` no es un entero positivo      |
| `401`  | `Token de autorización requerido`             | Falta el token                     |
| `403`  | `No tenés permisos para realizar esta acción` | No es `ADMIN` ni el propio usuario |
| `404`  | `Usuario no encontrado`                       | No existe una cuenta con ese ID    |

---

## PUT /api/usuarios/:id

Actualiza el email, la contraseña o el estado de una cuenta.

**Acceso:** `Bearer` + rol `ADMIN`, o el propio usuario autenticado.

> Solo un `ADMIN` puede modificar el campo `activo`. Un usuario común puede
> cambiar su email y su contraseña, pero no activarse o desactivarse.

### Body

Se debe enviar al menos uno de los campos:

| Campo      | Tipo    | Obligatorio | Descripción                           |
| ---------- | ------- | ----------- | ------------------------------------- |
| `email`    | string  | No          | Nuevo email único                     |
| `password` | string  | No          | Nueva contraseña de 8 a 72 caracteres |
| `activo`   | boolean | No          | Solo `ADMIN`                          |

```json
{
    "password": "NuevaPassword123"
}
```

### Respuesta `200`

Devuelve la cuenta actualizada con los atributos públicos:

```json
{
    "id": 1,
    "email": "admin@tfi.local.com",
    "rol": "ADMIN",
    "activo": true,
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-11-06T12:00:00.000Z"
}
```

### Errores

| Código | Mensaje                                       | Causa                                                                          |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------ |
| `400`  | `Datos de actualización inválidos`            | No se envió ningún campo o alguno es inválido                                  |
| `401`  | `Token de autorización requerido`             | Falta el token                                                                 |
| `403`  | `No tenés permisos para realizar esta acción` | No es `ADMIN` ni el propio usuario, o intenta cambiar `activo` sin ser `ADMIN` |
| `404`  | `Usuario no encontrado`                       | No existe una cuenta con ese ID                                                |
| `409`  | `El email ya está registrado`                 | El nuevo email pertenece a otra cuenta                                         |

---

## PATCH /api/usuarios/:id/desactivar

Desactiva una cuenta. **No la elimina**: solo cambia `activo` a `false`. Un
usuario desactivado no puede iniciar sesión.

**Acceso:** `Bearer` + rol `ADMIN`.

### Respuesta `200`

```json
{
    "id": 6,
    "email": "profesional@example.com",
    "rol": "PROFESIONAL",
    "activo": false,
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-11-06T12:00:00.000Z"
}
```

### Errores

| Código | Mensaje                                       | Causa                              |
| ------ | --------------------------------------------- | ---------------------------------- |
| `400`  | `El ID debe ser un número entero positivo`    | `id` no es un entero positivo      |
| `401`  | `Token de autorización requerido`             | Falta el token                     |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN`       |
| `404`  | `Usuario no encontrado`                       | No existe una cuenta con ese ID    |
| `409`  | `El usuario ya está desactivado`              | La cuenta ya tenía `activo: false` |

---

## PATCH /api/usuarios/:id/reactivar

Reactiva una cuenta desactivada.

**Acceso:** `Bearer` + rol `ADMIN`.

### Respuesta `200`

```json
{
    "id": 6,
    "email": "profesional@example.com",
    "rol": "PROFESIONAL",
    "activo": true,
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-11-06T12:00:00.000Z"
}
```

### Errores

| Código | Mensaje                                       | Causa                             |
| ------ | --------------------------------------------- | --------------------------------- |
| `400`  | `El ID debe ser un número entero positivo`    | `id` no es un entero positivo     |
| `401`  | `Token de autorización requerido`             | Falta el token                    |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN`      |
| `404`  | `Usuario no encontrado`                       | No existe una cuenta con ese ID   |
| `409`  | `El usuario ya está activo`                   | La cuenta ya tenía `activo: true` |
