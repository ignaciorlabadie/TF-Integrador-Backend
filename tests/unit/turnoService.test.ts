import { Op } from 'sequelize'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

vi.mock('../../src/config/database.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.databaseMock() }
})

vi.mock('../../src/services/emailService.js', () => ({
    enviarEmailTurnoCreado: vi.fn(),
    enviarEmailTurnoCancelado: vi.fn(),
}))

import { ATRIBUTOS_USUARIO_PUBLICOS } from '../../src/models/atributosUsuario.js'
import {
    enviarEmailTurnoCreado,
    enviarEmailTurnoCancelado,
} from '../../src/services/emailService.js'
import { turnoService } from '../../src/services/turnoService.js'
import {
    agendaModel,
    pacienteModel,
    transactionMock,
    turnoModel,
    usuarioModel,
} from '../helpers/mocksModelos.js'

function crearTurnoMock() {
    return {
        id: 5,
        pacienteId: 4,
        profesionalId: 2,
        agendaId: 3,
        fecha: '2027-10-25',
        hora: '10:00',
        estado: 'CONFIRMADO',
        motivo: 'Control',
        observaciones: null,
        recordatorioEnviadoAt: null as Date | null,
        save: vi.fn(),
    }
}

function turnoConRelaciones() {
    return {
        ...crearTurnoMock(),
        paciente: {
            id: 4,
            nombre: 'Ana',
            usuario: { email: 'ana@test.com' },
        },
        profesional: { id: 2, nombre: 'Juan' },
    }
}

const datosCrear = {
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    motivo: 'Control',
}

const includeEsperado = expect.arrayContaining([
    expect.objectContaining({
        model: pacienteModel,
        as: 'paciente',
        include: expect.arrayContaining([
            expect.objectContaining({
                model: usuarioModel,
                as: 'usuario',
                attributes: ATRIBUTOS_USUARIO_PUBLICOS,
            }),
        ]),
    }),
])

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(transactionMock).mockImplementation((callback) =>
        callback({ id: 'transaccion-mock' }),
    )
    vi.mocked(turnoModel.findOne).mockResolvedValue(null)
    vi.mocked(turnoModel.create).mockResolvedValue({ id: 5 } as never)
    vi.mocked(turnoModel.findByPk).mockResolvedValue(crearTurnoMock() as never)
    vi.mocked(turnoModel.findAll).mockResolvedValue([crearTurnoMock()] as never)
    vi.mocked(agendaModel.findByPk).mockResolvedValue({
        estaDisponible: vi.fn().mockResolvedValue(true),
    } as never)
    vi.mocked(enviarEmailTurnoCreado).mockResolvedValue(undefined)
    vi.mocked(enviarEmailTurnoCancelado).mockResolvedValue(undefined)
})

describe('turnoService.crear', () => {
    it('crea el turno dentro de una transacción con estado CONFIRMADO', async () => {
        await turnoService.crear(datosCrear)

        expect(transactionMock).toHaveBeenCalledTimes(1)
        expect(turnoModel.create).toHaveBeenCalledWith(
            {
                ...datosCrear,
                observaciones: null,
                estado: 'CONFIRMADO',
            },
            { transaction: { id: 'transaccion-mock' } },
        )
    })

    it('rechaza otro turno activo en la misma fecha y hora', async () => {
        vi.mocked(turnoModel.findOne).mockResolvedValue({} as never)

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(turnoModel.findOne).toHaveBeenCalledWith({
            where: {
                profesionalId: 2,
                fecha: '2027-10-25',
                hora: '10:00',
                estado: { [Op.not]: 'CANCELADO' },
            },
        })
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('falla con 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 404,
        })
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('falla con 409 si el horario no está disponible en la agenda', async () => {
        const estaDisponible = vi.fn().mockResolvedValue(false)
        vi.mocked(agendaModel.findByPk).mockResolvedValue({
            estaDisponible,
        } as never)

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(estaDisponible).toHaveBeenCalledWith('2027-10-25', '10:00')
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('envía el email de creación con los datos del paciente y profesional', async () => {
        vi.mocked(turnoModel.create).mockResolvedValue({
            id: 5,
            fecha: datosCrear.fecha,
            hora: datosCrear.hora,
        } as never)
        vi.mocked(turnoModel.findByPk).mockResolvedValue(
            turnoConRelaciones() as never,
        )

        await turnoService.crear(datosCrear)

        expect(enviarEmailTurnoCreado).toHaveBeenCalledWith(
            'ana@test.com',
            'Ana',
            '2027-10-25',
            '10:00',
            'Juan',
        )
    })

    it('no envía email si faltan relaciones en el turno creado', async () => {
        await turnoService.crear(datosCrear)

        expect(enviarEmailTurnoCreado).not.toHaveBeenCalled()
    })
})

describe('turnoService.listar', () => {
    it('aplica los filtros y ordena por fecha y hora', async () => {
        await turnoService.listar({
            profesionalId: 2,
            pacienteId: 4,
            fecha: '2027-10-25',
            estado: 'CONFIRMADO',
        })

        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    profesionalId: 2,
                    pacienteId: 4,
                    fecha: '2027-10-25',
                    estado: 'CONFIRMADO',
                },
                order: [
                    ['fecha', 'ASC'],
                    ['hora', 'ASC'],
                ],
            }),
        )
    })

    it('usa un where vacío si no hay filtros', async () => {
        await turnoService.listar()

        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: {} }),
        )
    })
})

describe('turnoService.buscarPorId', () => {
    it('falla con 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        await expect(turnoService.buscarPorId(5)).rejects.toMatchObject({
            statusCode: 404,
        })
    })
})

describe('turnoService.actualizar', () => {
    it('falla con 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        await expect(
            turnoService.actualizar(5, { motivo: 'Otro' }),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza el cambio si otro turno ocupa la fecha y hora', async () => {
        vi.mocked(turnoModel.findOne).mockResolvedValue({} as never)

        await expect(
            turnoService.actualizar(5, {
                fecha: '2027-10-26',
                hora: '11:00',
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('falla con 404 si la agenda no existe al cambiar fecha y hora', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        await expect(
            turnoService.actualizar(5, {
                fecha: '2027-10-26',
                hora: '11:00',
            }),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('falla con 409 si la nueva fecha y hora no están disponibles', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue({
            estaDisponible: vi.fn().mockResolvedValue(false),
        } as never)

        await expect(
            turnoService.actualizar(5, {
                fecha: '2027-10-26',
                hora: '11:00',
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('actualiza los campos y reinicia el recordatorio al cambiar fecha o hora', async () => {
        const turno = crearTurnoMock()
        turno.recordatorioEnviadoAt = new Date('2026-11-20T10:00:00.000Z')
        vi.mocked(turnoModel.findByPk).mockResolvedValue(turno as never)

        await turnoService.actualizar(5, {
            fecha: '2027-10-26',
            hora: '11:00',
            motivo: 'Control actualizado',
            observaciones: 'Traer análisis',
            estado: 'PENDIENTE',
        })

        expect(turno).toMatchObject({
            fecha: '2027-10-26',
            hora: '11:00',
            motivo: 'Control actualizado',
            observaciones: 'Traer análisis',
            estado: 'PENDIENTE',
            recordatorioEnviadoAt: null,
        })
        expect(turno.save).toHaveBeenCalledTimes(1)
    })

    it('no reinicia el recordatorio si solo cambia el motivo', async () => {
        const turno = crearTurnoMock()
        const enviado = new Date('2026-11-20T10:00:00.000Z')
        turno.recordatorioEnviadoAt = enviado
        vi.mocked(turnoModel.findByPk).mockResolvedValue(turno as never)

        await turnoService.actualizar(5, { motivo: 'Otro motivo' })

        expect(turno.recordatorioEnviadoAt).toBe(enviado)
        expect(turnoModel.findOne).not.toHaveBeenCalled()
    })
})

describe('turnoService.cancelar', () => {
    it('falla con 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        await expect(turnoService.cancelar(5)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('marca el turno como cancelado y envía el email', async () => {
        const turno = turnoConRelaciones()
        vi.mocked(turnoModel.findByPk).mockResolvedValue(turno as never)

        await turnoService.cancelar(5)

        expect(turno.estado).toBe('CANCELADO')
        expect(turno.save).toHaveBeenCalledTimes(1)
        expect(enviarEmailTurnoCancelado).toHaveBeenCalledWith(
            'ana@test.com',
            'Ana',
            '2027-10-25',
            '10:00',
            'Juan',
        )
    })
})

describe('turnoService: atributos públicos del usuario', () => {
    it('listar pide los atributos públicos en el usuario del paciente', async () => {
        await turnoService.listar()

        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('buscarPorId pide los atributos públicos en el usuario del paciente', async () => {
        await turnoService.buscarPorId(5)

        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('crear pide los atributos públicos al recuperar el turno', async () => {
        await turnoService.crear(datosCrear)

        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('actualizar pide los atributos públicos al recuperar el turno', async () => {
        await turnoService.actualizar(5, { motivo: 'Nuevo motivo' })

        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('cancelar pide los atributos públicos al recuperar el turno', async () => {
        await turnoService.cancelar(5)

        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })
})
