export const TIPOS_ASIGNACION = ['FIJA', 'ESPECIFICA'] as const

export type TipoAsignacionEspacio = (typeof TIPOS_ASIGNACION)[number]
