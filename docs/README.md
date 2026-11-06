# Documentación de la API

Documentación de los módulos de **autenticación**, **usuarios**, **pacientes** y
**roles** del Sistema de Turnos.

## Documentos

| Documento                            | Contenido                                                     |
| ------------------------------------ | ------------------------------------------------------------- |
| [auth.md](./auth.md)                 | Login, perfil autenticado y recuperación de contraseña        |
| [usuarios.md](./usuarios.md)         | Alta y gestión de cuentas (`users`)                           |
| [pacientes.md](./pacientes.md)       | Registro público, perfil propio y administración de pacientes |
| [roles.md](./roles.md)               | Catálogo de roles disponibles                                 |
| [modelo-datos.md](./modelo-datos.md) | Tablas `users` y `pacientes`, relaciones y diagrama ER        |

## Convenciones

### URL base

Todos los endpoints se montan bajo el prefijo `/api`. La URL base depende del
ambiente:

| Ambiente            | URL base                                         |
| ------------------- | ------------------------------------------------ |
| Local               | `http://localhost:3000/api`                      |
| Producción (Render) | `https://tf-integrador-backend.onrender.com/api` |

El puerto local se configura con la variable de entorno `PORT` (por defecto
`3000`). Los ejemplos de esta documentación usan rutas relativas (`/api/...`);
se les debe anteponer la URL base del ambiente elegido.

### Endpoint de índice

`GET /api` responde `200` con un mensaje de bienvenida:

```json
{
    "mensaje": "API del sistema de turnos"
}
```

Las rutas de cada módulo están detalladas en los documentos de esta carpeta.

### Autenticación

Los endpoints protegidos requieren un token JWT en el header `Authorization`:

```http
Authorization: Bearer <token>
```

El token se obtiene con `POST /api/auth/login` y contiene `id`, `email` y `rol`
del usuario. Su duración se define con `JWT_EXPIRES_IN` (por defecto `1d`).

### Formato de las respuestas de error

Todos los errores responden con un objeto con la clave `mensaje`:

```json
{
    "mensaje": "El email ya está registrado"
}
```

### Códigos de estado

| Código | Significado           | Cuándo aparece                                                                            |
| ------ | --------------------- | ----------------------------------------------------------------------------------------- |
| `200`  | OK                    | Consulta o actualización exitosa                                                          |
| `201`  | Created               | Recurso creado correctamente                                                              |
| `204`  | No Content            | Eliminación exitosa (sin body)                                                            |
| `400`  | Bad Request           | Body inválido, campos faltantes o token de recuperación inválido/expirado                 |
| `401`  | Unauthorized          | Falta el token, es inválido o expiró; credenciales incorrectas                            |
| `403`  | Forbidden             | El rol o el usuario autenticado no tiene permisos                                         |
| `404`  | Not Found             | El recurso solicitado no existe                                                           |
| `409`  | Conflict              | Email o DNI ya registrados; usuario ya activo/desactivado; paciente con turnos o estudios |
| `500`  | Internal Server Error | Error inesperado o configuración faltante                                                 |

### Datos sensibles

Las respuestas de usuarios y pacientes **nunca** incluyen los campos
`password`, `resetPasswordTokenHash` ni `resetPasswordExpiresAt`. La lista
blanca de atributos públicos está en `src/models/atributosUsuario.ts`.

### Normalización

Los emails se normalizan antes de guardarse o buscarse: se eliminan los espacios
de los extremos y se convierten a minúsculas. Por lo tanto,
`Paciente@Test.com` y `paciente@test.com` se consideran el mismo email.

## Reglas de validación generales

| Campo                 | Regla                                                   |
| --------------------- | ------------------------------------------------------- |
| `email`               | Formato de email válido, máximo 254 caracteres          |
| `password`            | Entre 8 y 72 caracteres                                 |
| `nombre` / `apellido` | Entre 2 y 100 caracteres (sin contar espacios extremos) |
| `dni`                 | Entre 7 y 8 dígitos numéricos                           |
| `telefono`            | Entre 6 y 25 dígitos, con prefijo `+` opcional          |
| `fechaNacimiento`     | Formato `YYYY-MM-DD` y no puede ser futura              |
| `direccion`           | Entre 3 y 150 caracteres                                |
