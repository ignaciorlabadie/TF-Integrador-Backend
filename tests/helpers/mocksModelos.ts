import { vi } from 'vitest'

function crearModeloMock() {
    return {
        findAll: vi.fn(),
        findAllByPk: vi.fn(),
        findByPk: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        destroy: vi.fn(),
        hasOne: vi.fn(),
        belongsTo: vi.fn(),
        hasMany: vi.fn(),
        belongsToMany: vi.fn(),
    }
}

export const usuarioModel = crearModeloMock()
export const pacienteModel = crearModeloMock()
export const profesionalModel = crearModeloMock()
export const turnoModel = crearModeloMock()
export const agendaModel = crearModeloMock()
export const estudioModel = crearModeloMock()
export const autorizacionEstudioModel = crearModeloMock()
export const espacioModel = crearModeloMock()
export const asignacionEspacioModel = crearModeloMock()
export const tarifaEspaciosModel = crearModeloMock()

export function modelosMock() {
    return {
        Usuario: usuarioModel,
        Paciente: pacienteModel,
        Profesional: profesionalModel,
        Turno: turnoModel,
        Agenda: agendaModel,
        Estudio: estudioModel,
        AutorizacionEstudio: autorizacionEstudioModel,
        Espacio: espacioModel,
        AsignacionEspacio: asignacionEspacioModel,
        TarifaEspacios: tarifaEspaciosModel,
    }
}

export const transactionMock = vi.fn(
    async (callback: (transaction: unknown) => unknown) =>
        callback({ id: 'transaccion-mock' }),
)

export function databaseMock() {
    return {
        authenticate: vi.fn(),
        transaction: transactionMock,
    }
}
