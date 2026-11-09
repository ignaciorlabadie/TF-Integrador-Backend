export const UBICACIONES_ESPACIO = ['ADELANTE', 'ATRAS'] as const

export type UbicacionEspacio = (typeof UBICACIONES_ESPACIO)[number]
