export interface CrearTurno {
    pacienteId: number
    profesionalId: number
    agendaId: number
    fecha: string
    hora: string
    motivo: string
    observaciones?: string | null
}
