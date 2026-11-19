# Espacios

Espacios físicos del consultorio (`espacios`) y su ocupación. Los espacios
pueden ser `GIMNASIO` o `CONSULTORIO`, estar adelante o atrás, y activarse o
desactivarse sin borrarlos.

## Resumen

| Método   | Ruta                           | Acceso                  | Descripción                   |
| -------- | ------------------------------ | ----------------------- | ----------------------------- |
| `GET`    | `/api/espacios/ocupacion`      | `ADMIN` o `PROFESIONAL` | Ocupación por rango de fechas |
| `GET`    | `/api/espacios`                | Token                   | Lista espacios con filtros    |
| `GET`    | `/api/espacios/:id`            | Token                   | Obtiene un espacio por ID     |
| `POST`   | `/api/espacios`                | `ADMIN`                 | Crea un espacio               |
| `PUT`    | `/api/espacios/:id`            | `ADMIN`                 | Actualiza un espacio          |
| `PATCH`  | `/api/espacios/:id/desactivar` | `ADMIN`                 | Desactiva un espacio          |
| `PATCH`  | `/api/espacios/:id/reactivar`  | `ADMIN`                 | Reactiva un espacio           |
| `DELETE` | `/api/espacios/:id`            | `ADMIN`                 | Elimina un espacio            |

---

## POST /api/espacios

### Body

| Campo       | Tipo   | Obligatorio | Descripción                |
| ----------- | ------ | ----------- | -------------------------- |
| `nombre`    | string | Sí          | Entre 1 y 100 caracteres   |
| `tipo`      | string | Sí          | `GIMNASIO` o `CONSULTORIO` |
| `ubicacion` | string | Sí          | `ADELANTE` o `ATRAS`       |

```json
{
    "nombre": "Consultorio 1",
    "tipo": "CONSULTORIO",
    "ubicacion": "ADELANTE"
}
```

Devuelve `201` con el espacio (`activo: true`). Errores: `400` si faltan datos
o los enum son inválidos, `401` sin token, `403` si no es `ADMIN`.

## GET /api/espacios

Devuelve `200` con un array de espacios. Filtros opcionales (query):

| Parámetro   | Tipo    | Descripción                |
| ----------- | ------- | -------------------------- |
| `activo`    | boolean | `true` o `false`           |
| `tipo`      | string  | `GIMNASIO` o `CONSULTORIO` |
| `ubicacion` | string  | `ADELANTE` o `ATRAS`       |

Un filtro inválido responde `400`.

## GET /api/espacios/:id

Devuelve `200` con el espacio. Responde `400` si el ID no es un entero
positivo y `404` si no existe.

## GET /api/espacios/ocupacion

Consulta la ocupación de los espacios entre dos fechas.

**Acceso:** `Bearer` + rol `ADMIN` o `PROFESIONAL`.

### Query obligatoria

| Parámetro | Tipo   | Descripción  |
| --------- | ------ | ------------ |
| `start`   | string | `YYYY-MM-DD` |
| `end`     | string | `YYYY-MM-DD` |

Ejemplo: `GET /api/espacios/ocupacion?start=2026-11-16&end=2026-11-22`.

### Respuesta `200`

```json
{
    "data": [
        {
            "id": 1,
            "nombre": "Consultorio 1",
            "tipo": "CONSULTORIO",
            "ubicacion": "ADELANTE",
            "activo": true,
            "asignaciones": [
                {
                    "id": 10,
                    "tipo": "FIJA",
                    "diaSemana": "LUNES",
                    "horaInicio": "09:00:00",
                    "horaFin": "12:00:00",
                    "profesional": {
                        "id": 2,
                        "nombre": "Maria",
                        "apellido": "Lopez"
                    }
                }
            ]
        }
    ]
}
```

Se incluyen todas las asignaciones `FIJA` y las `ESPECIFICA` cuyo `fecha`
esté entre `start` y `end`. Faltan los parámetros o están mal formateados da
`400`.

## PUT /api/espacios/:id

Actualiza `nombre`, `tipo` y/o `ubicacion`. Hay que enviar al menos uno.
Devuelve `200` con el espacio actualizado; `400` si el body está vacío o los
datos son inválidos; `404` si no existe.

## PATCH /api/espacios/:id/desactivar y /reactivar

Cambian `activo` a `false` o `true`. Son idempotentes y responden `200` con el
espacio. Solo `ADMIN`; `404` si no existe.

## DELETE /api/espacios/:id

Elimina el espacio y responde **`204` sin cuerpo**. Responde `409` si tiene
asignaciones o tarifas asociadas: en ese caso conviene desactivarlo.
