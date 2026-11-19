# Asignaciones de espacio

Asignaciones (`asignaciones_espacios`) de un espacio a un profesional. Pueden
ser `FIJA` (por día de semana) o `ESPECIFICA` (por fecha puntual), siempre con
un rango horario.

## Resumen

| Método   | Ruta                            | Acceso                  | Descripción              |
| -------- | ------------------------------- | ----------------------- | ------------------------ |
| `GET`    | `/api/asignaciones-espacio`     | `ADMIN` o `PROFESIONAL` | Lista asignaciones       |
| `GET`    | `/api/asignaciones-espacio/:id` | `ADMIN` o `PROFESIONAL` | Obtiene una asignación   |
| `POST`   | `/api/asignaciones-espacio`     | `ADMIN` o `PROFESIONAL` | Crea una asignación      |
| `PUT`    | `/api/asignaciones-espacio/:id` | `ADMIN` o `PROFESIONAL` | Actualiza una asignación |
| `DELETE` | `/api/asignaciones-espacio/:id` | `ADMIN` o `PROFESIONAL` | Elimina una asignación   |

Un `PROFESIONAL` solo puede ver y modificar sus propias asignaciones, crear
`ESPECIFICA` para sí mismo y no puede convertirlas en `FIJA`.

---

## POST /api/asignaciones-espacio

### Body

| Campo           | Tipo   | Obligatorio | Descripción                                |
| --------------- | ------ | ----------- | ------------------------------------------ |
| `espacioId`     | number | Sí          | ID del espacio (debe estar activo)         |
| `profesionalId` | number | Sí          | ID del profesional                         |
| `tipo`          | string | Sí          | `FIJA` o `ESPECIFICA`                      |
| `diaSemana`     | string | Condicional | Obligatorio si `FIJA`; `LUNES` a `DOMINGO` |
| `fecha`         | string | Condicional | Obligatorio si `ESPECIFICA`; `YYYY-MM-DD`  |
| `horaInicio`    | string | Sí          | `HH:mm`                                    |
| `horaFin`       | string | Sí          | `HH:mm`, posterior a `horaInicio`          |

Asignación fija:

```json
{
    "espacioId": 3,
    "profesionalId": 2,
    "tipo": "FIJA",
    "diaSemana": "LUNES",
    "horaInicio": "09:00",
    "horaFin": "12:00"
}
```

Asignación específica:

```json
{
    "espacioId": 3,
    "profesionalId": 2,
    "tipo": "ESPECIFICA",
    "fecha": "2026-11-20",
    "horaInicio": "09:00",
    "horaFin": "12:00"
}
```

Devuelve `201` con la asignación, incluidos `espacio` y `profesional`.

### Errores

| Código | Causa                                                                                     |
| ------ | ----------------------------------------------------------------------------------------- |
| `400`  | Faltan campos, ID/tipo/día/hora/fecha inválidos, o combinación FIJA/ESPECIFICA incorrecta |
| `401`  | Falta el token                                                                            |
| `403`  | El profesional intenta una asignación `FIJA` o ajena                                      |
| `404`  | No existe el espacio o el profesional                                                     |
| `409`  | El espacio está inactivo o la asignación se superpone con otra                            |

---

## GET /api/asignaciones-espacio

Devuelve `200` con las asignaciones. Filtros opcionales (query): `espacioId`,
`profesionalId` y `tipo`. Si el token es de un profesional, se ignora
`profesionalId` y se fuerza el suyo.

## GET /api/asignaciones-espacio/:id

Devuelve `200` con la asignación y sus relaciones. Un profesional recibe `403`
si la asignación es de otro.

## PUT /api/asignaciones-espacio/:id

Acepta los mismos campos que `POST`, todos opcionales. Vuelven a aplicarse las
reglas de `FIJA`/`ESPECIFICA`, el orden horario y la restricción de
superposición. Devuelve `200` con la asignación actualizada.

## DELETE /api/asignaciones-espacio/:id

Elimina la asignación y devuelve **`204` sin cuerpo**. Un profesional solo
puede borrar las suyas.
