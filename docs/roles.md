# Roles

El sistema define tres roles fijos en `src/types/Rol.ts`:

```ts
export const ROLES = ['PACIENTE', 'PROFESIONAL', 'ADMIN'] as const
```

El rol de una cuenta se guarda en `users.rol` mediante un `ENUM` de PostgreSQL.
**No puede modificarse** a través de la API: se define al crear la cuenta.

## GET /api/roles

Lista los roles disponibles.

**Acceso:** público.

### Respuesta `200`

```json
["PACIENTE", "PROFESIONAL", "ADMIN"]
```

El orden es siempre el mismo, definido por la constante `ROLES`.

---

## Responsabilidades por rol

| Rol           | Alcance                                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PACIENTE`    | Acceso al portal público, visualización de la cartilla de profesionales y disponibilidad, gestión de su perfil y de sus turnos. Se registra en `POST /api/pacientes`.                                           |
| `PROFESIONAL` | Gestión de su agenda personal y de los turnos de sus pacientes. No modifica la vista pública ni los valores de las terapias. Su cuenta la crea un `ADMIN` en `POST /api/usuarios`.                              |
| `ADMIN`       | Control total del sistema: gestión de cuentas, pacientes, agendas, información pública y módulo de liquidación administrativa. Su cuenta se crea con los seeders o con `POST /api/usuarios` desde otro `ADMIN`. |

## Relación con las cuentas

- `POST /api/pacientes` crea siempre una cuenta con rol `PACIENTE`.
- `POST /api/usuarios` crea cuentas `PROFESIONAL` o `ADMIN` y rechaza
  explícitamente `PACIENTE`.
- El primer usuario `ADMIN` se crea con los seeders:
  `admin@tfi.local.com` / `Password123`.
