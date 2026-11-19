# Turnos

Gestión de turnos (`turnos`) del consultorio. Un turno pertenece a un paciente,
un profesional y una agenda, y puede tener recordatorios automáticos.

## Resumen

| Método   | Ruta              | Acceso       | Descripción                         |
| -------- | ----------------- | ------------ | ----------------------------------- |
| `GET`    | `/api/turnos`     | `ADMIN`      | Lista turnos con filtros opcionales |
| `GET`    | `/api/turnos/:id` | `ADMIN`      | Obtiene un turno por ID             |
| `POST`   | `/api/turnos`     | Token válido | Crea un turno                       |
| `PUT`    | `/api/turnos/:id` | Token válido | Actualiza o cambia el estado        |
| `DELETE` | `/api/turnos/:id` | Token válido | Cancela un turno (no lo elimina)    |

**Acceso:** las tres operaciones de escritura requieren solo `Bearer` (token
válido de cualquier rol).

---

## POST /api/turnos

El estado se fija automáticamente en `CONFIRMADO`, sea cual sea el valor que
venga en el body.

### Body

| Campo           | Tipo   | Obligatorio | Descripción              |
| --------------- | ------ | ----------- | ------------------------ |
| `pacienteId`    | number | Sí          | ID del paciente          |
| `profesionalId` | number | Sí          | ID del profesional       |
| `agendaId`      | number | Sí          | ID de la agenda          |
| `fecha`         | string | Sí          | `YYYY-MM-DD`             |
| `hora`          | string | Sí          | `HH:mm`                  |
| `motivo`        | string | Sí          | Entre 1 y 255 caracteres |
| `observaciones` | string | No          | Texto libre o `null`     |

```json
{
    "pacienteId": 4,
    "profesionalId": 2,
    "agendaId": 1,
    "fecha": "2026-11-20",
    "hora": "09:30",
    "motivo": "Control de rutina"
}
```

### Respuesta `201`

Devuelve el turno con `paciente`, `profesional` y `agenda` incluidos.

### Errores

| Código | Causa                                                                     |
| ------ | ------------------------------------------------------------------------- |
| `400`  | Faltan datos obligatorios                                                 |
| `401`  | Falta el token                                                            |
| `404`  | No existe la agenda                                                       |
| `409`  | El profesional ya tiene turno en esa fecha/hora o la agenda está inactiva |

---

## GET /api/turnos

**Acceso:** `Bearer` + rol `ADMIN`. Devuelve `200` con un array ordenado por
`fecha` y `hora` ascendente.

### Filtros (query)

| Parámetro       | Tipo   | Descripción                                           |
| --------------- | ------ | ----------------------------------------------------- |
| `profesionalId` | number | ID del profesional                                    |
| `pacienteId`    | number | ID del paciente                                       |
| `fecha`         | string | `YYYY-MM-DD`                                          |
| `estado`        | string | `PENDIENTE`, `CONFIRMADO`, `CANCELADO` o `COMPLETADO` |

Ejemplo: `GET /api/turnos?profesionalId=2&fecha=2026-11-20`.

## GET /api/turnos/:id

**Acceso:** `Bearer` + rol `ADMIN`. Responde `200` con el turno y sus
relaciones, `400` si el ID no es un entero positivo y `404` si no existe.

## PUT /api/turnos/:id

**Acceso:** `Bearer`. Hay que enviar al menos uno de los campos `fecha`, `hora`,
`motivo`, `observaciones` o `estado`. Los estados admitidos son `PENDIENTE`,
`CONFIRMADO`, `CANCELADO` y `COMPLETADO`.

Responde `200` con el turno actualizado. Si cambia `fecha` u `hora`, se
reinicia `recordatorioEnviadoAt` a `null` para volver a enviar el aviso.

### Errores

| Código | Causa                                        |
| ------ | -------------------------------------------- |
| `400`  | Body vacío o datos inválidos                 |
| `401`  | Falta el token                               |
| `404`  | No existe el turno o la agenda               |
| `409`  | Fecha/hora ya ocupada o agenda no disponible |

---

## DELETE /api/turnos/:id

**Acceso:** `Bearer`. Cancela el turno: devuelve **`200`** con la entidad
actualizada (`estado: "CANCELADO"`), no `204` ni un cuerpo vacío.

Responde `400` si el ID es inválido y `404` si el turno no existe.
