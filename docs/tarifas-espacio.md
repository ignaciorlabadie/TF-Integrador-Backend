# Tarifas de espacio

Tarifas por hora (`tarifas_espacios`) de cada espacio. Una tarifa va desde
`fechaDesde` hasta `fechaHasta`; si `fechaHasta` es `null`, es la vigente.

## Resumen

| Método   | Ruta                           | Acceso                  | Descripción                  |
| -------- | ------------------------------ | ----------------------- | ---------------------------- |
| `GET`    | `/api/tarifas-espacio`         | `ADMIN` o `PROFESIONAL` | Lista tarifas                |
| `GET`    | `/api/tarifas-espacio/vigente` | `ADMIN` o `PROFESIONAL` | Tarifa vigente de un espacio |
| `GET`    | `/api/tarifas-espacio/:id`     | `ADMIN` o `PROFESIONAL` | Obtiene una tarifa por ID    |
| `POST`   | `/api/tarifas-espacio`         | `ADMIN`                 | Crea una tarifa              |
| `PUT`    | `/api/tarifas-espacio/:id`     | `ADMIN`                 | Actualiza una tarifa         |
| `DELETE` | `/api/tarifas-espacio/:id`     | `ADMIN`                 | Elimina una tarifa           |

---

## POST /api/tarifas-espacio

### Body

| Campo           | Tipo   | Obligatorio | Descripción                             |
| --------------- | ------ | ----------- | --------------------------------------- |
| `espacioId`     | number | Sí          | ID del espacio (debe estar activo)      |
| `precioPorHora` | number | Sí          | Mayor a 0, hasta 2 decimales            |
| `fechaDesde`    | string | Sí          | `YYYY-MM-DD`                            |
| `fechaHasta`    | string | No          | `YYYY-MM-DD`; si falta, queda en `null` |

```json
{
    "espacioId": 3,
    "precioPorHora": 150,
    "fechaDesde": "2026-11-01"
}
```

Devuelve `201` con la tarifa, `precioPorHora` como string decimal (`"150.00"`)
y el `espacio` asociado.

### Errores

| Código | Causa                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| `400`  | Faltan datos, precio inválido, fechas mal formateadas o `fechaDesde > fechaHasta` |
| `401`  | Falta el token                                                                    |
| `403`  | El token no es de un `ADMIN`                                                      |
| `404`  | No existe el espacio                                                              |
| `409`  | El espacio está inactivo o el rango se superpone con otra tarifa                  |

---

## GET /api/tarifas-espacio

Devuelve `200` con las tarifas ordenadas por `fechaDesde` y `id` descendente.

### Filtros (query)

| Parámetro   | Tipo    | Descripción                     |
| ----------- | ------- | ------------------------------- |
| `espacioId` | number  | ID del espacio                  |
| `vigente`   | boolean | `true` → `fechaHasta` en `null` |

## GET /api/tarifas-espacio/vigente?espacioId=3

Devuelve `200` con la tarifa vigente del espacio (`fechaHasta: null`) o `404`
si no hay ninguna. `espacioId` es obligatorio.

## GET /api/tarifas-espacio/:id

Devuelve `200` con la tarifa; `400` si el ID es inválido y `404` si no existe.

## PUT /api/tarifas-espacio/:id

Actualiza `espacioId`, `precioPorHora`, `fechaDesde` y/o `fechaHasta`. Hay que
enviar al menos uno. Vuelven a aplicarse las validaciones de precio, fechas,
espacio activo y superposición. Devuelve `200` con la tarifa actualizada.

## DELETE /api/tarifas-espacio/:id

Elimina la tarifa y devuelve **`204` sin cuerpo**. Responde `400` si el ID es
inválido y `404` si no existe.
