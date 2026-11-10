export const DIAS_SEMANA = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
] as const

export type DiaSemana = (typeof DIAS_SEMANA)[number]
