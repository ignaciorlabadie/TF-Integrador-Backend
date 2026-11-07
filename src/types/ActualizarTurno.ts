import type { EstadoTurno } from './EstadoTurno.js'

export interface ActualizarTurno {
    fecha?: string
    hora?: string
    motivo?: string
    observaciones?: string | null
    estado?: EstadoTurno
}
