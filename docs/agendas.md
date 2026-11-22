# Agendas

Agendas semanales de los profesionales (`agendas`). Definen los días y rangos
horarios en los que se pueden crear turnos.

## Resumen

| Método  | Ruta                                      | Acceso  | Descripción               |
| ------- | ----------------------------------------- | ------- | ------------------------- |
| `GET`   | `/api/agendas`                            | Token   | Lista agendas con filtros |
| `GET`   | `/api/agendas/profesional/:profesionalId` | Token   | Agendas de un profesional |
| `GET`   | `/api/agendas/:id`                        | Token   | Obtiene una agenda por ID |
| `POST`  | `/api/agendas`                            | `ADMIN` | Crea una agenda           |
| `PUT`   | `/api/agendas/:id`                        | `ADMIN` | Actualiza una agenda      |
| `PATCH` | `/api/agendas/:id/desactivar`             | `ADMIN` | Desactiva una agenda      |
| `PATCH` | `/api/agendas/:id/activar`                | `ADMIN` | Activa una agenda         |

Todas requieren `Authorization: Bearer <token>`.

---

## POST /api/agendas

### Body

| Campo           | Tipo   | Obligatorio | Descripción                       |
| --------------- | ------ | ----------- | --------------------------------- |
| `profesionalId` | number | Sí          | ID del profesional                |
| `diaSemana`     | string | Sí          | `LUNES` a `DOMINGO`               |
| `horaInicio`    | string | Sí          | `HH:mm`                           |
| `horaFin`       | string | Sí          | `HH:mm`, posterior a `horaInicio` |
| `duracionTurno` | number | Sí          | Entero > 0, minutos por turno     |

```json
{
    "profesionalId": 2,
    "diaSemana": "LUNES",
    "horaInicio": "09:00",
    "horaFin": "12:00",
    "duracionTurno": 30
}
```

`activo` se inicializa en `true`. Devuelve `201` con la agenda y el
profesional asociado.

### Errores

| Código | Causa                                                        |
| ------ | ------------------------------------------------------------ |
| `400`  | Faltan campos, día/hora inválidos o duración mayor al rango  |
| `401`  | Falta el token                                               |
| `403`  | El token no es de un `ADMIN`                                 |
| `404`  | No existe el profesional                                     |
| `409`  | Ya hay una agenda activa para ese profesional, día y horario |

---

## GET /api/agendas

Devuelve `200` con todas las agendas y su profesional.

### Filtros (query)

| Parámetro       | Tipo    | Descripción        |
| --------------- | ------- | ------------------ |
| `profesionalId` | number  | ID del profesional |
| `activo`        | boolean | `true` o `false`   |

## GET /api/agendas/profesional/:profesionalId

Devuelve `200` con las agendas del profesional indicado; `404` si no existe.

## GET /api/agendas/:id

Devuelve `200` con la agenda solicitada; `400` si el ID es inválido y `404` si
no existe.

---

## PUT /api/agendas/:id

Actualiza `diaSemana`, `horaInicio`, `horaFin` y/o `duracionTurno`.
`profesionalId` y `activo` no son modificables. Para poder alterar una agenda
con turnos futuros fuera del nuevo horario hay que enviar:

```json
{
    "horaFin": "11:00",
    "cancelarTurnosAfectados": true
}
```

Devuelve `200` con la agenda actualizada. Sin ese flag, responde `409` cuando
hay turnos afectados. También responde `409` si la nueva combinación coincide
con otra agenda activa.

## PATCH /api/agendas/:id/desactivar

Body opcional:

```json
{ "cancelarTurnosFuturos": true }
```

Sin el flag, responde `409` si existen turnos futuros. Si la agenda ya estaba
inactiva la operación es idempotente. Devuelve **`204` sin cuerpo**.

### Errores comunes

| Código | Causa                                     |
| ------ | ----------------------------------------- |
| `400`  | Body vacío en PUT o flag no booleano      |
| `401`  | Falta el token                            |
| `403`  | El token no es de un `ADMIN`              |
| `404`  | No existe la agenda                       |
| `409`  | Conflicto con turnos u otra agenda activa |

---

## PATCH /api/agendas/:id/activar

Reactiva una agenda inactiva. Es idempotente: si ya estaba activa devuelve la
agenda sin cambios. Verifica que no exista otra agenda activa del mismo
profesional, día y rango horario.

Devuelve **`200` con la agenda completa** (incluye su profesional). No requiere
body.

### Errores

| Código | Causa                                                        |
| ------ | ------------------------------------------------------------ |
| `400`  | El ID no es un entero positivo                               |
| `401`  | Falta el token                                               |
| `403`  | El token no es de un `ADMIN`                                 |
| `404`  | No existe la agenda                                          |
| `409`  | Ya hay una agenda activa para ese profesional, día y horario |
