/**
 * Qué turnos puede ver un usuario según su rol:
 * - ADMIN: todos.
 * - PACIENTE / PROFESIONAL: los de su perfil. Si la cuenta no tiene perfil
 *   asociado, ninguno.
 */
export type AlcanceTurnos =
    | { tipo: 'TODOS' }
    | { tipo: 'PACIENTE'; pacienteId: number }
    | { tipo: 'PROFESIONAL'; profesionalId: number }
    | { tipo: 'NINGUNO' }

export function turnoDentroDelAlcance(
    turno: { pacienteId: number; profesionalId: number },
    alcance: AlcanceTurnos,
): boolean {
    switch (alcance.tipo) {
        case 'TODOS':
            return true
        case 'PACIENTE':
            return Number(turno.pacienteId) === alcance.pacienteId
        case 'PROFESIONAL':
            return Number(turno.profesionalId) === alcance.profesionalId
        case 'NINGUNO':
            return false
    }
}
