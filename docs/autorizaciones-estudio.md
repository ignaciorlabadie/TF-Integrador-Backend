# Autorizaciones de estudio

Autorizaciones (`autorizaciones_estudio`) que permiten a un profesional
consultar el archivo de un estudio durante un período. El estado es
`DISPONIBLE` al crearla y pasa a `VENCIDO` al revocarla.

**Acceso:** todos los endpoints requieren `Bearer` + rol `ADMIN` o
`PROFESIONAL`.

## Resumen

| Método  | Ruta                                     | Descripción              |
| ------- | ---------------------------------------- | ------------------------ |
| `GET`   | `/api/autorizacionestudios`              | Lista autorizaciones     |
| `GET`   | `/api/autorizacionestudios/:id`          | Obtiene una autorización |
| `GET`   | `/api/autorizacionestudios/:id/vigencia` | Consulta si está vigente |
| `POST`  | `/api/autorizacionestudios`              | Crea una autorización    |
| `PATCH` | `/api/autorizacionestudios/:id/revocar`  | Revoca una autorización  |

---

## POST /api/autorizacionestudios

### Body

| Campo               | Tipo   | Obligatorio | Descripción                         |
| ------------------- | ------ | ----------- | ----------------------------------- |
| `estudioId`         | number | Sí          | ID del estudio                      |
| `profesionalId`     | number | Sí          | ID del profesional autorizado       |
| `fechaAutorizacion` | string | Sí          | `YYYY-MM-DD`                        |
| `fechaVencimiento`  | string | Sí          | `YYYY-MM-DD`, ≥ `fechaAutorizacion` |

```json
{
    "estudioId": 5,
    "profesionalId": 2,
    "fechaAutorizacion": "2026-11-01",
    "fechaVencimiento": "2026-12-01"
}
```

Devuelve `201` con `estado: "DISPONIBLE"`.

### Errores

| Código | Causa                                                                  |
| ------ | ---------------------------------------------------------------------- |
| `400`  | IDs inválidos, fechas mal formateadas o vencimiento anterior al inicio |
| `401`  | Falta el token                                                         |
| `403`  | El rol no es `ADMIN` ni `PROFESIONAL`                                  |
| `404`  | No existe el estudio o el profesional                                  |
| `409`  | Ya hay una autorización vigente para ese profesional y estudio         |

## GET /api/autorizacionestudios

Devuelve `200` con el listado de autorizaciones.

## GET /api/autorizacionestudios/:id

Devuelve `200` con la autorización; `400` si el ID no es un entero positivo y
`404` si no existe.

## GET /api/autorizacionestudios/:id/vigencia

Devuelve `200` con el estado calculado:

```json
{
    "id": 5,
    "estaVigente": true,
    "estaVencida": false
}
```

Está vigente si `estado === 'DISPONIBLE'` y `fechaVencimiento >=` la fecha
actual. Responde `404` si no existe la autorización.

## PATCH /api/autorizacionestudios/:id/revocar

Cambia el estado a `VENCIDO` y devuelve `200` con la autorización actualizada.
Responde `404` si no existe.
