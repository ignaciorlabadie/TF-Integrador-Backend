export const ROLES = ['PACIENTE', 'PROFESIONAL', 'ADMIN'] as const

export type Rol = (typeof ROLES)[number]
