# Profesionales

Gestión de los perfiles profesionales (`profesionales`). Cada perfil se asocia
a una cuenta de usuario con rol `PROFESIONAL` y puede tener agendas,
asignaciones de espacio y autorizaciones de estudio.

> El alta de la cuenta se hace en [`POST /api/usuarios`](./usuarios.md); el
> perfil se crea después con `POST /api/profesionales`.

## Resumen

| Método | Ruta                           | Acceso                          | Descripción                    |
| ------ | ------------------------------ | ------------------------------- | ------------------------------ |
| `GET`  | `/api/profesionales`           | Cualquier usuario autenticado   | Lista todos los profesionales  |
| `GET`  | `/api/profesionales/mi-perfil` | Usuario autenticado             | Perfil del usuario autenticado |
| `GET`  | `/api/profesionales/:id`       | Cualquier usuario autenticado   | Obtiene un perfil por ID       |
| `POST` | `/api/profesionales`           | `ADMIN`                         | Crea un perfil profesional     |
| `PUT`  | `/api/profesionales/:id`       | `ADMIN` o el propio profesional | Actualiza un perfil            |

---

## POST /api/profesionales

Crea el perfil de una cuenta `PROFESIONAL` existente.

**Acceso:** `Bearer` + rol `ADMIN`.

### Body

| Campo          | Tipo   | Obligatorio | Descripción                            |
| -------------- | ------ | ----------- | -------------------------------------- |
| `usuarioId`    | number | Sí          | ID de una cuenta con rol `PROFESIONAL` |
| `nombre`       | string | Sí          | Entre 2 y 100 caracteres               |
| `apellido`     | string | Sí          | Entre 2 y 100 caracteres               |
| `dni`          | string | Sí          | Entre 7 y 8 dígitos, único             |
| `telefono`     | string | Sí          | Entre 6 y 25 dígitos, con `+` opcional |
| `matricula`    | string | Sí          | Entre 1 y 30 caracteres, única         |
| `especialidad` | string | Sí          | Entre 2 y 100 caracteres               |

```json
{
    "usuarioId": 6,
    "nombre": "Maria",
    "apellido": "Lopez",
    "dni": "23456789",
    "telefono": "+5491112345678",
    "matricula": "MP-12345",
    "especialidad": "Clínica médica"
}
```

### Respuesta `201`

Devuelve el perfil creado, incluido `usuario` sin datos sensibles.

### Errores

| Código | Causa                                                            |
| ------ | ---------------------------------------------------------------- |
| `400`  | Faltan campos obligatorios, ID inválido o datos con formato malo |
| `401`  | Falta el token                                                   |
| `403`  | El token no es de un `ADMIN`                                     |
| `404`  | No existe la cuenta indicada por `usuarioId`                     |
| `409`  | DNI, matrícula o perfil ya registrados                           |

---

## GET /api/profesionales

Lista todos los perfiles ordenados por `id` ascendente, con su usuario
asociado. **Acceso:** cualquier usuario autenticado (`200`).

## GET /api/profesionales/mi-perfil

Devuelve el perfil vinculado a la cuenta del token. No acepta parámetros.

**Acceso:** usuario autenticado. Responde `404` si la cuenta no tiene perfil.

## GET /api/profesionales/:id

Devuelve un perfil por ID. Responde `400` si el ID no es un entero positivo y
`404` si no existe. **Acceso:** cualquier usuario autenticado.

## PUT /api/profesionales/:id

Actualiza los campos `nombre`, `apellido`, `dni`, `telefono`, `matricula` y
`especialidad`. Hay que enviar al menos uno. `usuarioId` se ignora aunque se
envíe.

**Acceso:** `ADMIN` o el propio profesional; si no, `403`.

### Errores

| Código | Causa                                            |
| ------ | ------------------------------------------------ |
| `400`  | Body vacío o datos inválidos                     |
| `401`  | Falta el token                                   |
| `403`  | No es ADMIN ni el propio profesional             |
| `404`  | No existe el perfil                              |
| `409`  | El DNI o la matrícula ya pertenece a otro perfil |
