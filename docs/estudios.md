# Estudios

Estudios médicos (`estudios`) de los pacientes y sus archivos. Los archivos se
guardan en Supabase Storage; la API no sirve el binario, sino una URL firmada
temporal.

## Resumen

| Método | Ruta                                 | Acceso                  | Descripción               |
| ------ | ------------------------------------ | ----------------------- | ------------------------- |
| `GET`  | `/api/estudios`                      | `ADMIN` o `PROFESIONAL` | Lista todos los estudios  |
| `GET`  | `/api/estudios/:id`                  | `ADMIN` o `PROFESIONAL` | Obtiene un estudio por ID |
| `GET`  | `/api/estudios/paciente/:pacienteId` | `ADMIN` o `PACIENTE`    | Estudios de un paciente   |
| `POST` | `/api/estudios`                      | `ADMIN`                 | Registra un estudio       |
| `PUT`  | `/api/estudios/:id/archivo`          | `ADMIN` o `PROFESIONAL` | Reemplaza el archivo      |
| `GET`  | `/api/estudios/:id/archivo`          | `ADMIN` o `PROFESIONAL` | URL firmada del archivo   |

---

## POST /api/estudios

Los datos se envían como `multipart/form-data` (no JSON).

| Campo         | Tipo   | Obligatorio | Descripción                   |
| ------------- | ------ | ----------- | ----------------------------- |
| `pacienteId`  | number | Sí          | ID del paciente existente     |
| `tipo`        | string | Sí          | Entre 1 y 100 caracteres      |
| `fecha`       | string | Sí          | `YYYY-MM-DD`                  |
| `descripcion` | string | Sí          | Texto libre, no vacío         |
| `archivo`     | file   | No          | PDF, JPEG o PNG, máximo 10 MB |

Ejemplo con `curl`:

```bash
curl -X POST http://localhost:3000/api/estudios \
  -H "Authorization: Bearer <token>" \
  -F "pacienteId=4" \
  -F "tipo=Radiografía" \
  -F "fecha=2026-11-20" \
  -F "descripcion=Control postoperatorio" \
  -F "archivo=@estudio.pdf"
```

Devuelve `201` con el estudio. `archivoURL` guarda la ruta interna en
Supabase (por ejemplo `estudios/4/archivo.pdf`) y es `null` si no se envió
archivo.

### Errores

| Código | Causa                                                                |
| ------ | -------------------------------------------------------------------- |
| `400`  | Falta algún campo obligatorio, fecha inválida o archivo no permitido |
| `401`  | Falta el token                                                       |
| `403`  | El token no es de un `ADMIN`                                         |
| `404`  | No existe el paciente                                                |

## GET /api/estudios

Devuelve `200` con todos los estudios ordenados por fecha descendente.

## GET /api/estudios/:id

Devuelve `200` con el estudio, el `paciente` (`id`, `nombre`, `apellido`,
`dni`) y sus autorizaciones con el profesional. Responde `400` si el ID es
inválido y `404` si no existe.

## GET /api/estudios/paciente/:pacienteId

Devuelve `200` con los estudios del paciente. Incluye solo las autorizaciones
con estado `DISPONIBLE` y `fechaVencimiento` no pasada. Responde `404` si el
paciente no existe.

## PUT /api/estudios/:id/archivo

`multipart/form-data` con un único campo `archivo`, obligatorio (PDF, JPEG o
PNG, hasta 10 MB). Reemplaza el archivo anterior y lo elimina del storage.
Devuelve `200` con el estudio actualizado. Responde `400` si falta el archivo
y `404` si no existe el estudio.

## GET /api/estudios/:id/archivo

Devuelve `200` con una URL firmada de Supabase y su validez:

```json
{
    "url": "https://.../archivo.pdf?token=...",
    "expiresIn": 3600
}
```

`expiresIn` se configura con `SUPABASE_SIGNED_URL_TTL` (por defecto `3600`
segundos). Responde `404` si no existe el estudio o si no tiene archivo.
