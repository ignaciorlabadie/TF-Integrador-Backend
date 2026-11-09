export const TIPOS_ESPACIO = ['GIMNASIO', 'CONSULTORIO'] as const

export type TipoEspacio = (typeof TIPOS_ESPACIO)[number]
