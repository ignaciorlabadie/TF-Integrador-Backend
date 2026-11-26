import { Op } from 'sequelize'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
import {
    ATRIBUTOS_PROFESIONAL_PUBLICOS,
    turnoService,
} from '../../src/services/turnoService.js'
import { turnoDentroDelAlcance } from '../../src/utils/alcanceTurnos.js'
import {
    agendaModel,
    pacienteModel,
    profesionalModel,
    transactionMock,
    turnoModel,
    usuarioModel,
} from '../helpers/mocksModelos.js'

// 2027-10-25 y 2027-11-01 son lunes.
const LUNES = '2027-10-25'
const OTRO_LUNES = '2027-11-01'

function crearTurnoMock() {
    return {
        id: 5,
        pacienteId: 4,
        profesionalId: 2,
        agendaId: 3,
        fecha: LUNES,
        hora: '10:00:00',
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

// Agenda de los lunes de 08:00 a 12:00 con turnos de 30 minutos.
function crearAgendaMock(cambios: Record<string, unknown> = {}) {
    return {
        id: 3,
        profesionalId: 2,
        diaSemana: 'LUNES',
        horaInicio: '08:00:00',
        horaFin: '12:00:00',
        duracionTurno: 30,
        activo: true,
        estaDisponible: vi.fn().mockResolvedValue(true),
        ...cambios,
    }
}

const datosCrear = {
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: LUNES,
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
    vi.useFakeTimers({ toFake: ['Date'] })
    // Hora local: miércoles 20 de octubre de 2027, 09:00.
    vi.setSystemTime(new Date(2027, 9, 20, 9, 0))
    vi.mocked(transactionMock).mockImplementation((callback) =>
        callback({ id: 'transaccion-mock' }),
    )
    vi.mocked(turnoModel.findOne).mockResolvedValue(null)
    vi.mocked(turnoModel.create).mockResolvedValue({ id: 5 } as never)
    vi.mocked(turnoModel.findByPk).mockResolvedValue(crearTurnoMock() as never)
    vi.mocked(turnoModel.findAll).mockResolvedValue([crearTurnoMock()] as never)
    vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 4 } as never)
    vi.mocked(agendaModel.findByPk).mockResolvedValue(
        crearAgendaMock() as never,
    )
    vi.mocked(enviarEmailTurnoCreado).mockResolvedValue(undefined)
    vi.mocked(enviarEmailTurnoCancelado).mockResolvedValue(undefined)
})

afterEach(() => {
    vi.useRealTimers()
})

describe('turnoService.obtenerAlcance', () => {
    it('un ADMIN ve todos los turnos sin consultar perfiles', async () => {
        const alcance = await turnoService.obtenerAlcance({
            id: 1,
            rol: 'ADMIN',
        })

        expect(alcance).toEqual({ tipo: 'TODOS' })
        expect(pacienteModel.findOne).not.toHaveBeenCalled()
        expect(profesionalModel.findOne).not.toHaveBeenCalled()
    })

    it('traduce el usuario PACIENTE a su pacienteId', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue({ id: 4 } as never)

        const alcance = await turnoService.obtenerAlcance({
            id: 10,
            rol: 'PACIENTE',
        })

        expect(pacienteModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 10 } }),
        )
        expect(alcance).toEqual({ tipo: 'PACIENTE', pacienteId: 4 })
    })

    it('traduce el usuario PROFESIONAL a su profesionalId', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue({
            id: 2,
        } as never)

        const alcance = await turnoService.obtenerAlcance({
            id: 20,
            rol: 'PROFESIONAL',
        })

        expect(profesionalModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 20 } }),
        )
        expect(alcance).toEqual({ tipo: 'PROFESIONAL', profesionalId: 2 })
    })

    it('devuelve NINGUNO si la cuenta no tiene perfil', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)

        const alcance = await turnoService.obtenerAlcance({
            id: 10,
            rol: 'PACIENTE',
        })

        expect(alcance).toEqual({ tipo: 'NINGUNO' })
    })
})

describe('turnoDentroDelAlcance', () => {
    const turno = { pacienteId: 4, profesionalId: 2 }

    it('acepta cualquier turno para TODOS', () => {
        expect(turnoDentroDelAlcance(turno, { tipo: 'TODOS' })).toBe(true)
    })

    it('compara por pacienteId y profesionalId', () => {
        expect(
            turnoDentroDelAlcance(turno, { tipo: 'PACIENTE', pacienteId: 4 }),
        ).toBe(true)
        expect(
            turnoDentroDelAlcance(turno, { tipo: 'PACIENTE', pacienteId: 9 }),
        ).toBe(false)
        expect(
            turnoDentroDelAlcance(turno, {
                tipo: 'PROFESIONAL',
                profesionalId: 2,
            }),
        ).toBe(true)
        expect(
            turnoDentroDelAlcance(turno, {
                tipo: 'PROFESIONAL',
                profesionalId: 9,
            }),
        ).toBe(false)
    })

    it('rechaza todo para NINGUNO', () => {
        expect(turnoDentroDelAlcance(turno, { tipo: 'NINGUNO' })).toBe(false)
    })
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
                fecha: LUNES,
                hora: '10:00',
                estado: { [Op.not]: 'CANCELADO' },
            },
        })
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('falla con 404 si el paciente no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 404,
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

    it('falla con 400 si la agenda es de otro profesional', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(
            crearAgendaMock({ profesionalId: 99 }) as never,
        )

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 400,
        })
    })

    it('falla con 409 si la agenda está inactiva', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(
            crearAgendaMock({ activo: false }) as never,
        )

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 409,
        })
    })

    it('falla con 400 si la fecha no es el día de la agenda', async () => {
        await expect(
            turnoService.crear({ ...datosCrear, fecha: '2027-10-26' }),
        ).rejects.toMatchObject({ statusCode: 400 })
    })

    it.each([
        ['antes del inicio', '07:30'],
        ['en el último bloque que no entra completo', '12:00'],
        ['desalineada con la grilla', '10:15'],
    ])('falla con 400 si la hora queda %s', async (_caso, hora) => {
        await expect(
            turnoService.crear({ ...datosCrear, hora }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('acepta el último turno que entra completo en el bloque', async () => {
        await turnoService.crear({ ...datosCrear, hora: '11:30' })

        expect(turnoModel.create).toHaveBeenCalled()
    })

    it('falla con 400 si la fecha ya pasó', async () => {
        await expect(
            turnoService.crear({ ...datosCrear, fecha: '2027-10-18' }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(agendaModel.findByPk).not.toHaveBeenCalled()
    })

    it('falla con 400 si es hoy pero la hora ya pasó', async () => {
        vi.setSystemTime(new Date(2027, 9, 25, 10, 30))

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 400,
        })
    })

    it('falla con 409 si el horario no está disponible en la agenda', async () => {
        const agenda = crearAgendaMock({
            estaDisponible: vi.fn().mockResolvedValue(false),
        })
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agenda as never)

        await expect(turnoService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(agenda.estaDisponible).toHaveBeenCalledWith(LUNES, '10:00')
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
            LUNES,
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
            fecha: LUNES,
            estado: 'CONFIRMADO',
        })

        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    profesionalId: 2,
                    pacienteId: 4,
                    fecha: LUNES,
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

    it('pide solo los atributos públicos del profesional si se indica', async () => {
        await turnoService.listar({}, { profesionalCompleto: false })

        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.arrayContaining([
                    expect.objectContaining({
                        model: profesionalModel,
                        as: 'profesional',
                        attributes: ATRIBUTOS_PROFESIONAL_PUBLICOS,
                    }),
                ]),
            }),
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

describe('turnoService.horariosLibres', () => {
    beforeEach(() => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue({
            id: 2,
        } as never)
        vi.mocked(agendaModel.findAll).mockResolvedValue([
            crearAgendaMock({ horaInicio: '08:00:00', horaFin: '10:00:00' }),
        ] as never)
        vi.mocked(turnoModel.findAll).mockResolvedValue([])
    })

    it('falla con 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        await expect(
            turnoService.horariosLibres(2, LUNES),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('arma la grilla completa de la agenda', async () => {
        const horarios = await turnoService.horariosLibres(2, LUNES)

        expect(horarios).toEqual([
            { agendaId: 3, hora: '08:00' },
            { agendaId: 3, hora: '08:30' },
            { agendaId: 3, hora: '09:00' },
            { agendaId: 3, hora: '09:30' },
        ])
        expect(agendaModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { profesionalId: 2, diaSemana: 'LUNES', activo: true },
            }),
        )
    })

    it('descarta los horarios ocupados', async () => {
        vi.mocked(turnoModel.findAll).mockResolvedValue([
            { hora: '08:30:00' },
            { hora: '09:00:00' },
        ] as never)

        const horarios = await turnoService.horariosLibres(2, LUNES)

        expect(horarios.map((h) => h.hora)).toEqual(['08:00', '09:30'])
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    profesionalId: 2,
                    fecha: LUNES,
                    estado: { [Op.not]: 'CANCELADO' },
                },
            }),
        )
    })

    it('si la fecha es hoy descarta los horarios que ya pasaron', async () => {
        vi.setSystemTime(new Date(2027, 9, 25, 8, 45))

        const horarios = await turnoService.horariosLibres(2, LUNES)

        expect(horarios.map((h) => h.hora)).toEqual(['09:00', '09:30'])
    })

    it('devuelve una lista vacía para una fecha pasada', async () => {
        const horarios = await turnoService.horariosLibres(2, '2027-10-18')

        expect(horarios).toEqual([])
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })

    it('devuelve una lista vacía si no atiende ese día', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([])

        const horarios = await turnoService.horariosLibres(2, LUNES)

        expect(horarios).toEqual([])
    })

    it('combina varias agendas del mismo día ordenadas por hora', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([
            crearAgendaMock({
                id: 7,
                horaInicio: '14:00:00',
                horaFin: '15:00:00',
                duracionTurno: 60,
            }),
            crearAgendaMock({ horaInicio: '08:00:00', horaFin: '09:00:00' }),
        ] as never)

        const horarios = await turnoService.horariosLibres(2, LUNES)

        expect(horarios).toEqual([
            { agendaId: 3, hora: '08:00' },
            { agendaId: 3, hora: '08:30' },
            { agendaId: 7, hora: '14:00' },
        ])
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
                fecha: OTRO_LUNES,
                hora: '11:00',
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('valida la disponibilidad aunque solo cambie la hora', async () => {
        vi.mocked(turnoModel.findOne).mockResolvedValue({} as never)

        await expect(
            turnoService.actualizar(5, { hora: '11:00' }),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(turnoModel.findOne).toHaveBeenCalledWith({
            where: expect.objectContaining({ fecha: LUNES, hora: '11:00' }),
        })
    })

    it('falla con 404 si la agenda no existe al cambiar fecha y hora', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        await expect(
            turnoService.actualizar(5, {
                fecha: OTRO_LUNES,
                hora: '11:00',
            }),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('falla con 400 si la nueva hora queda fuera de la agenda', async () => {
        await expect(
            turnoService.actualizar(5, { hora: '13:00' }),
        ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('falla con 409 si la nueva fecha y hora no están disponibles', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(
            crearAgendaMock({
                estaDisponible: vi.fn().mockResolvedValue(false),
            }) as never,
        )

        await expect(
            turnoService.actualizar(5, {
                fecha: OTRO_LUNES,
                hora: '11:00',
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('actualiza los campos y reinicia el recordatorio al cambiar fecha o hora', async () => {
        const turno = crearTurnoMock()
        turno.recordatorioEnviadoAt = new Date('2026-11-20T10:00:00.000Z')
        vi.mocked(turnoModel.findByPk).mockResolvedValue(turno as never)

        await turnoService.actualizar(5, {
            fecha: OTRO_LUNES,
            hora: '11:00',
            motivo: 'Control actualizado',
            observaciones: 'Traer análisis',
            estado: 'PENDIENTE',
        })

        expect(turno).toMatchObject({
            fecha: OTRO_LUNES,
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

    it('no revalida si la hora enviada es la misma que la guardada', async () => {
        await turnoService.actualizar(5, { hora: '10:00' })

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

    it.each(['CANCELADO', 'COMPLETADO'])(
        'falla con 409 si el turno ya está %s',
        async (estado) => {
            vi.mocked(turnoModel.findByPk).mockResolvedValue({
                ...crearTurnoMock(),
                estado,
            } as never)

            await expect(turnoService.cancelar(5)).rejects.toMatchObject({
                statusCode: 409,
            })
            expect(enviarEmailTurnoCancelado).not.toHaveBeenCalled()
        },
    )

    it('marca el turno como cancelado y envía el email', async () => {
        const turno = turnoConRelaciones()
        vi.mocked(turnoModel.findByPk).mockResolvedValue(turno as never)

        await turnoService.cancelar(5)

        expect(turno.estado).toBe('CANCELADO')
        expect(turno.save).toHaveBeenCalledTimes(1)
        expect(enviarEmailTurnoCancelado).toHaveBeenCalledWith(
            'ana@test.com',
            'Ana',
            LUNES,
            '10:00:00',
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
