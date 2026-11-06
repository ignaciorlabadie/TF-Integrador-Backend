# Pacientes

Registro y gestión de pacientes. Cada paciente tiene un perfil en `pacientes`
y una cuenta asociada en `users` con rol `PACIENTE`.

> El alta pública de un paciente crea **ambos registros en una sola
> transacción**: si falla cualquier paso, no queda ni la cuenta ni el perfil.

## Resumen

| Método   | Ruta                 | Acceso      | Descripción                                 |
| -------- | -------------------- | ----------- | ------------------------------------------- |
| `POST`   | `/api/pacientes`     | Público     | Registra un paciente (cuenta + perfil)      |
| `GET`    | `/api/pacientes`     | `ADMIN`     | Lista todos los pacientes                   |
| `GET`    | `/api/pacientes/me`  | Autenticado | Devuelve el perfil del paciente autenticado |
| `PUT`    | `/api/pacientes/me`  | Autenticado | Actualiza el perfil propio                  |
| `GET`    | `/api/pacientes/:id` | `ADMIN`     | Obtiene un paciente por ID                  |
| `PUT`    | `/api/pacientes/:id` | `ADMIN`     | Actualiza un paciente                       |
| `DELETE` | `/api/pacientes/:id` | `ADMIN`     | Elimina un paciente y su cuenta             |

> `GET /me` y `PUT /me` están pensados para usuarios con perfil de paciente.
> Si el usuario autenticado no tiene perfil de paciente (por ejemplo, un
> `ADMIN` o un `PROFESIONAL`), responden `404`.

---

## POST /api/pacientes

Registro público de pacientes. Crea la cuenta (`rol: PACIENTE`) y el perfil en
una transacción.

**Acceso:** público.

### Body

| Campo             | Tipo   | Obligatorio | Descripción                            |
| ----------------- | ------ | ----------- | -------------------------------------- |
| `email`           | string | Sí          | Email único de la cuenta               |
| `password`        | string | Sí          | Contraseña de 8 a 72 caracteres        |
| `nombre`          | string | Sí          | Entre 2 y 100 caracteres               |
| `apellido`        | string | Sí          | Entre 2 y 100 caracteres               |
| `dni`             | string | Sí          | Entre 7 y 8 dígitos, único             |
| `telefono`        | string | Sí          | Entre 6 y 25 dígitos, con `+` opcional |
| `fechaNacimiento` | string | Sí          | Fecha `YYYY-MM-DD`, no futura          |
| `direccion`       | string | Sí          | Entre 3 y 150 caracteres               |

```json
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
```

### Respuesta `201`

```json
{
    "id": 3,
    "usuarioId": 10,
    "nombre": "Ana",
    "apellido": "Gomez",
    "dni": "12345678",
    "telefono": "+5491112345678",
    "fechaNacimiento": "1990-05-14",
    "direccion": "Calle Falsa 123",
    "createdAt": "2026-11-06T12:00:00.000Z",
    "updatedAt": "2026-11-06T12:00:00.000Z",
    "usuario": {
        "id": 10,
        "email": "paciente@example.com",
        "rol": "PACIENTE",
        "activo": true,
        "createdAt": "2026-11-06T12:00:00.000Z",
        "updatedAt": "2026-11-06T12:00:00.000Z"
    }
}
```

### Errores

| Código | Mensaje                                                             | Causa                             |
| ------ | ------------------------------------------------------------------- | --------------------------------- |
| `400`  | `Datos de paciente inválidos`                                       | El body no es un objeto           |
| `400`  | `El email no tiene un formato válido`                               | Email inválido                    |
| `400`  | `La contraseña debe tener entre 8 y 72 caracteres`                  | Contraseña inválida               |
| `400`  | `El nombre debe tener entre 2 y 100 caracteres`                     | Nombre inválido                   |
| `400`  | `El apellido debe tener entre 2 y 100 caracteres`                   | Apellido inválido                 |
| `400`  | `El DNI debe tener entre 7 y 8 dígitos`                             | DNI inválido                      |
| `400`  | `El teléfono debe tener entre 6 y 25 dígitos, con prefijo opcional` | Teléfono inválido                 |
| `400`  | `La fecha de nacimiento no es válida`                               | Formato incorrecto o fecha futura |
| `400`  | `La dirección debe tener entre 3 y 150 caracteres`                  | Dirección inválida                |
| `409`  | `El email ya está registrado`                                       | El email ya existe                |
| `409`  | `El DNI ya está registrado`                                         | El DNI ya existe                  |

---

## GET /api/pacientes

Lista todos los pacientes junto con su cuenta de usuario.

**Acceso:** `Bearer` + rol `ADMIN`.

### Respuesta `200`

```json
[
    {
        "id": 1,
        "usuarioId": 4,
        "nombre": "Juan",
        "apellido": "Perez",
        "dni": "30111222",
        "telefono": "1122334455",
        "fechaNacimiento": "1990-05-14",
        "direccion": "Av. Siempreviva 742",
        "createdAt": "2026-10-10T12:00:00.000Z",
        "updatedAt": "2026-10-10T12:00:00.000Z",
        "usuario": {
            "id": 4,
            "email": "paciente1@tfi.local.com",
            "rol": "PACIENTE",
            "activo": true,
            "createdAt": "2026-10-10T12:00:00.000Z",
            "updatedAt": "2026-10-10T12:00:00.000Z"
        }
    }
]
```

Los pacientes se devuelven ordenados por `id` ascendente.

### Errores

| Código | Mensaje                                       | Causa                        |
| ------ | --------------------------------------------- | ---------------------------- |
| `401`  | `Token de autorización requerido`             | Falta el token               |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN` |

---

## GET /api/pacientes/me

Devuelve el perfil del paciente asociado al usuario autenticado.

**Acceso:** autenticado (`Bearer`).

### Respuesta `200`

```json
{
    "id": 1,
    "usuarioId": 4,
    "nombre": "Juan",
    "apellido": "Perez",
    "dni": "30111222",
    "telefono": "1122334455",
    "fechaNacimiento": "1990-05-14",
    "direccion": "Av. Siempreviva 742",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z",
    "usuario": {
        "id": 4,
        "email": "paciente1@tfi.local.com",
        "rol": "PACIENTE",
        "activo": true,
        "createdAt": "2026-10-10T12:00:00.000Z",
        "updatedAt": "2026-10-10T12:00:00.000Z"
    }
}
```

### Errores

| Código | Mensaje                           | Causa                                              |
| ------ | --------------------------------- | -------------------------------------------------- |
| `401`  | `Token de autorización requerido` | Falta el token                                     |
| `401`  | `Autenticación requerida`         | El token no contiene un usuario                    |
| `404`  | `Paciente no encontrado`          | El usuario autenticado no tiene perfil de paciente |

---

## PUT /api/pacientes/me

Actualiza los datos del perfil del paciente autenticado. No permite cambiar el
email ni la contraseña (para eso se usa `PUT /api/usuarios/:id`).

**Acceso:** autenticado (`Bearer`).

### Body

Se debe enviar al menos uno de los campos:

| Campo             | Tipo   | Descripción                            |
| ----------------- | ------ | -------------------------------------- |
| `nombre`          | string | Entre 2 y 100 caracteres               |
| `apellido`        | string | Entre 2 y 100 caracteres               |
| `dni`             | string | Entre 7 y 8 dígitos, único             |
| `telefono`        | string | Entre 6 y 25 dígitos, con `+` opcional |
| `fechaNacimiento` | string | Fecha `YYYY-MM-DD`, no futura          |
| `direccion`       | string | Entre 3 y 150 caracteres               |

```json
{
    "telefono": "+5491198765432",
    "direccion": "Nueva Direccion 456"
}
```

### Respuesta `200`

Devuelve el paciente actualizado con su usuario:

```json
{
    "id": 1,
    "usuarioId": 4,
    "nombre": "Juan",
    "apellido": "Perez",
    "dni": "30111222",
    "telefono": "+5491198765432",
    "fechaNacimiento": "1990-05-14",
    "direccion": "Nueva Direccion 456",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-11-06T12:00:00.000Z",
    "usuario": {
        "id": 4,
        "email": "paciente1@tfi.local.com",
        "rol": "PACIENTE",
        "activo": true,
        "createdAt": "2026-10-10T12:00:00.000Z",
        "updatedAt": "2026-10-10T12:00:00.000Z"
    }
}
```

### Errores

| Código | Mensaje                            | Causa                                              |
| ------ | ---------------------------------- | -------------------------------------------------- |
| `400`  | `Datos de actualización inválidos` | No se envió ningún campo o alguno es inválido      |
| `401`  | `Token de autorización requerido`  | Falta el token                                     |
| `401`  | `Autenticación requerida`          | El token no contiene un usuario                    |
| `404`  | `Paciente no encontrado`           | El usuario autenticado no tiene perfil de paciente |
| `409`  | `El DNI ya está registrado`        | El DNI pertenece a otro paciente                   |

---

## GET /api/pacientes/:id

Obtiene un paciente por su ID, junto con su cuenta de usuario.

**Acceso:** `Bearer` + rol `ADMIN`.

### Parámetros

| Parámetro | Ubicación | Descripción              |
| --------- | --------- | ------------------------ |
| `id`      | path      | ID numérico del paciente |

### Respuesta `200`

```json
{
    "id": 1,
    "usuarioId": 4,
    "nombre": "Juan",
    "apellido": "Perez",
    "dni": "30111222",
    "telefono": "1122334455",
    "fechaNacimiento": "1990-05-14",
    "direccion": "Av. Siempreviva 742",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z",
    "usuario": {
        "id": 4,
        "email": "paciente1@tfi.local.com",
        "rol": "PACIENTE",
        "activo": true,
        "createdAt": "2026-10-10T12:00:00.000Z",
        "updatedAt": "2026-10-10T12:00:00.000Z"
    }
}
```

### Errores

| Código | Mensaje                                       | Causa                            |
| ------ | --------------------------------------------- | -------------------------------- |
| `400`  | `El ID debe ser un número entero positivo`    | `id` no es un entero positivo    |
| `401`  | `Token de autorización requerido`             | Falta el token                   |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN`     |
| `404`  | `Paciente no encontrado`                      | No existe un paciente con ese ID |

---

## PUT /api/pacientes/:id

Actualiza los datos de un paciente.

**Acceso:** `Bearer` + rol `ADMIN`.

### Body

Se debe enviar al menos uno de los campos:

| Campo             | Tipo   | Descripción                            |
| ----------------- | ------ | -------------------------------------- |
| `nombre`          | string | Entre 2 y 100 caracteres               |
| `apellido`        | string | Entre 2 y 100 caracteres               |
| `dni`             | string | Entre 7 y 8 dígitos, único             |
| `telefono`        | string | Entre 6 y 25 dígitos, con `+` opcional |
| `fechaNacimiento` | string | Fecha `YYYY-MM-DD`, no futura          |
| `direccion`       | string | Entre 3 y 150 caracteres               |

```json
{
    "direccion": "Otra Direccion 789"
}
```

### Respuesta `200`

Devuelve el paciente actualizado con su usuario (mismo formato que
`GET /api/pacientes/:id`).

### Errores

| Código | Mensaje                                       | Causa                                         |
| ------ | --------------------------------------------- | --------------------------------------------- |
| `400`  | `El ID debe ser un número entero positivo`    | `id` no es un entero positivo                 |
| `400`  | `Datos de actualización inválidos`            | No se envió ningún campo o alguno es inválido |
| `401`  | `Token de autorización requerido`             | Falta el token                                |
| `403`  | `No tenés permisos para realizar esta acción` | El token no es de un `ADMIN`                  |
| `404`  | `Paciente no encontrado`                      | No existe un paciente con ese ID              |
| `409`  | `El DNI ya está registrado`                   | El DNI pertenece a otro paciente              |

---

## DELETE /api/pacientes/:id

Elimina un paciente y su cuenta de usuario asociada en una transacción.

**Acceso:** `Bearer` + rol `ADMIN`.

### Parámetros

| Parámetro | Ubicación | Descripción              |
| --------- | --------- | ------------------------ |
| `id`      | path      | ID numérico del paciente |

### Respuesta `204`

Sin body.

### Comportamiento

- No se permite eliminar un paciente que tenga **turnos** o **estudios**
  asociados. En ese caso responde `409` y no borra nada.
- Si se puede eliminar, se borra primero el registro de `pacientes` y luego la
  cuenta de `users`, dentro de una misma transacción.

### Errores

| Código | Mensaje                                                                     | Causa                                    |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------- |
| `400`  | `El ID debe ser un número entero positivo`                                  | `id` no es un entero positivo            |
| `401`  | `Token de autorización requerido`                                           | Falta el token                           |
| `403`  | `No tenés permisos para realizar esta acción`                               | El token no es de un `ADMIN`             |
| `404`  | `Paciente no encontrado`                                                    | No existe un paciente con ese ID         |
| `409`  | `No se puede eliminar el paciente porque tiene turnos o estudios asociados` | El paciente tiene registros dependientes |
