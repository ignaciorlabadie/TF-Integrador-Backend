export const ESTADOS_TURNO = [
    'PENDIENTE',
    'CONFIRMADO',
    'CANCELADO',
    'COMPLETADO',
] as const

export type EstadoTurno = (typeof ESTADOS_TURNO)[number]
