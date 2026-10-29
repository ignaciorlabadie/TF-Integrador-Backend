import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Op } from 'sequelize'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

import {
    agendaModel,
    profesionalModel,
    turnoModel,
} from '../helpers/mocksModelos.js'
import { agendaService } from '../../src/services/agendaService.js'

// 2027-10-25 es lunes (aprox. un año desde hoy en formato YYYY-MM-DD).
// Se usa para turnos futuros: al coincidir con el día de la agenda habilitada LUNES,
// los turnos solo quedan afectados por horario y no por el día.
const FECHA_LUNES_FUTURA = '2027-10-25'

const profesionalMock = {
    id: 1,
    nombre: 'Ana',
    apellido: 'Gomez',
    matricula: 'MP-12345',
    especialidad: 'Kinesiología',
}

const agendaActiva = {
    id: 10,
    profesionalId: 1,
    diaSemana: 'LUNES',
    horaInicio: '08:00',
    horaFin: '12:00',
    duracionTurno: 60,
    activo: true,
    profesional: profesionalMock,
    save: vi.fn(),
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('agendaService.listar', () => {
    it('debe listar agendas sin filtros', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([agendaActiva] as never)

        const resultado = await agendaService.listar()

        expect(agendaModel.findAll).toHaveBeenCalledWith({
            where: {},
            include: [
                {
                    model: profesionalModel,
                    as: 'profesional',
                    attributes: [
                        'id',
                        'nombre',
                        'apellido',
                        'matricula',
                        'especialidad',
                    ],
                },
            ],
            order: [['id', 'ASC']],
        })
        expect(resultado).toEqual([agendaActiva])
    })

    it('debe filtrar por profesionalId y validar que sea entero positivo', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([] as never)

        await agendaService.listar({ profesionalId: 1 })

        expect(agendaModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { profesionalId: 1 },
            }),
        )
    })

    it('debe rechazar profesionalId inválido con 400', async () => {
        await expect(
            agendaService.listar({ profesionalId: -1 }),
        ).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })

    it('debe filtrar por activo booleano', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([] as never)

        await agendaService.listar({ activo: true })

        expect(agendaModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { activo: true },
            }),
        )
    })

    it('debe rechazar activo no booleano con 400', async () => {
        await expect(
            agendaService.listar({ activo: 'true' as never }),
        ).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })
})

describe('agendaService.buscarPorId', () => {
    it('debe retornar la agenda con profesional incluido', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agendaActiva as never)

        const resultado = await agendaService.buscarPorId(10)

        expect(agendaModel.findByPk).toHaveBeenCalledWith(10, {
            include: [
                {
                    model: profesionalModel,
                    as: 'profesional',
                    attributes: [
                        'id',
                        'nombre',
                        'apellido',
                        'matricula',
                        'especialidad',
                    ],
                },
            ],
        })
        expect(resultado).toEqual(agendaActiva)
    })

    it('debe retornar null si no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        const resultado = await agendaService.buscarPorId(999)

        expect(resultado).toBeNull()
    })
})

describe('agendaService.listarPorProfesional', () => {
    it('debe rechazar con 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        await expect(
            agendaService.listarPorProfesional(1),
        ).rejects.toMatchObject({
            statusCode: 404,
        })
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })

    it('debe listar agendas del profesional', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalMock as never,
        )
        vi.mocked(agendaModel.findAll).mockResolvedValue([agendaActiva] as never)

        const resultado = await agendaService.listarPorProfesional(1)

        expect(agendaModel.findAll).toHaveBeenCalledWith({
            where: { profesionalId: 1 },
            include: [
                {
                    model: profesionalModel,
                    as: 'profesional',
                    attributes: [
                        'id',
                        'nombre',
                        'apellido',
                        'matricula',
                        'especialidad',
                    ],
                },
            ],
            order: [['id', 'ASC']],
        })
        expect(resultado).toEqual([agendaActiva])
    })

    it('debe aplicar filtro activo', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalMock as never,
        )
        vi.mocked(agendaModel.findAll).mockResolvedValue([] as never)

        await agendaService.listarPorProfesional(1, { activo: false })

        expect(agendaModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { profesionalId: 1, activo: false },
            }),
        )
    })

    it('debe rechazar activo no booleano con 400', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalMock as never,
        )

        await expect(
            agendaService.listarPorProfesional(1, { activo: 1 as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })
})

describe('agendaService.crear', () => {
    const datosCrear = {
        profesionalId: 1,
        diaSemana: 'LUNES' as const,
        horaInicio: '08:00',
        horaFin: '12:00',
        duracionTurno: 60,
    }

    it('debe rechazar horario inválido con 400', async () => {
        await expect(
            agendaService.crear({
                ...datosCrear,
                horaInicio: '13:00',
                horaFin: '09:00',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(profesionalModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar duración inválida con 400', async () => {
        await expect(
            agendaService.crear({ ...datosCrear, duracionTurno: 0 }),
        ).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(profesionalModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar duración mayor al intervalo con 400', async () => {
        await expect(
            agendaService.crear({
                ...datosCrear,
                horaInicio: '09:00',
                horaFin: '09:30',
                duracionTurno: 60,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(profesionalModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar día inválido con 400', async () => {
        await expect(
            agendaService.crear({
                ...datosCrear,
                diaSemana: 'LUNDI' as never,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('debe rechazar formato de hora inválido con 400', async () => {
        await expect(
            agendaService.crear({
                ...datosCrear,
                horaInicio: '9:00' as never,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('debe rechazar con 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        await expect(agendaService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 404,
        })
        expect(agendaModel.findOne).not.toHaveBeenCalled()
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar con 409 si existe superposición con otra agenda activa', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalMock as never,
        )
        vi.mocked(agendaModel.findOne).mockResolvedValue(agendaActiva as never)

        await expect(agendaService.crear(datosCrear)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe crear agenda válida sin superposición', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalMock as never,
        )
        vi.mocked(agendaModel.findOne).mockResolvedValue(null)
        vi.mocked(agendaModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agendaActiva as never)

        const resultado = await agendaService.crear(datosCrear)

        expect(agendaModel.create).toHaveBeenCalledWith({
            profesionalId: 1,
            diaSemana: 'LUNES',
            horaInicio: '08:00',
            horaFin: '12:00',
            duracionTurno: 60,
        })
        expect(resultado).toEqual(agendaActiva)
    })
})

describe('agendaService.actualizar', () => {
    it('debe rechazar con 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        await expect(
            agendaService.actualizar(999, { horaInicio: '10:00' }),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('no debe modificar si no hay cambios en el horario', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agenda as never)

        const resultado = await agendaService.actualizar(10, {})

        expect(agenda.save).not.toHaveBeenCalled()
        expect(resultado).toEqual(agenda)
    })

    it('debe rechazar con 400 si el nuevo horario es inválido', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agenda as never)

        await expect(
            agendaService.actualizar(10, {
                horaInicio: '14:00',
                horaFin: '13:00',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(agenda.save).not.toHaveBeenCalled()
    })

    it('debe rechazar con 409 si hay superposición con otra agenda activa', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agenda as never)
        vi.mocked(agendaModel.findOne).mockResolvedValue({ id: 99 } as never)

        await expect(
            agendaService.actualizar(10, { horaInicio: '11:00' }),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(agenda.save).not.toHaveBeenCalled()
    })

    it('debe bloquear actualización si hay turnos futuros afectados sin cancelarTurnosAfectados', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agenda as never)
            .mockResolvedValueOnce(agenda as never)
        vi.mocked(agendaModel.findOne).mockResolvedValue(null)
        const turnoAfectado = {
            id: 5,
            agendaId: 10,
            fecha: FECHA_LUNES_FUTURA,
            hora: '12:00',
            estado: 'PENDIENTE',
        }
        vi.mocked(turnoModel.findAll).mockResolvedValue([
            turnoAfectado,
        ] as never)

        await expect(
            agendaService.actualizar(10, { horaFin: '11:00' }),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(turnoModel.update).not.toHaveBeenCalled()
        expect(agenda.save).not.toHaveBeenCalled()
    })

    it('debe cancelar turnos afectados y actualizar si cancelarTurnosAfectados es true', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agenda as never)
            .mockResolvedValueOnce(agenda as never)
        vi.mocked(agendaModel.findOne).mockResolvedValue(null)
        const turnoAfectado = {
            id: 5,
            agendaId: 10,
            fecha: FECHA_LUNES_FUTURA,
            hora: '12:00',
            estado: 'CONFIRMADO',
        }
        vi.mocked(turnoModel.findAll).mockResolvedValue([
            turnoAfectado,
        ] as never)
        vi.mocked(turnoModel.update).mockResolvedValue([1] as never)

        const resultado = await agendaService.actualizar(
            10,
            { horaFin: '11:00' },
            { cancelarTurnosAfectados: true },
        )

        expect(turnoModel.update).toHaveBeenCalledWith(
            { estado: 'CANCELADO' },
            { where: { id: { [Op.in]: [5] } } },
        )
        expect(agenda.horaFin).toBe('11:00')
        expect(agenda.save).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(agenda)
    })

    it('debe considerar afectado un turno desalineado de la grilla', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agenda as never)
            .mockResolvedValueOnce(agenda as never)
        vi.mocked(agendaModel.findOne).mockResolvedValue(null)
        const turnoDesalineado = {
            id: 7,
            agendaId: 10,
            fecha: FECHA_LUNES_FUTURA,
            hora: '12:15',
            estado: 'PENDIENTE',
        }
        vi.mocked(turnoModel.findAll).mockResolvedValue([
            turnoDesalineado,
        ] as never)

        await expect(
            agendaService.actualizar(10, {
                duracionTurno: 30,
                horaFin: '13:00',
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
    })
})

describe('agendaService.desactivar', () => {
    it('debe rechazar con 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        await expect(agendaService.desactivar(999)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('debe ser idempotente si ya está inactiva', async () => {
        const agendaInactiva = {
            ...agendaActiva,
            activo: false,
            save: vi.fn(),
        }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agendaInactiva as never)
            .mockResolvedValueOnce(agendaInactiva as never)

        const resultado = await agendaService.desactivar(10)

        expect(turnoModel.findAll).not.toHaveBeenCalled()
        expect(agendaInactiva.save).not.toHaveBeenCalled()
        expect(resultado).toEqual(agendaInactiva)
    })

    it('debe bloquear desactivación si hay turnos futuros sin cancelarTurnosFuturos', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agenda as never)
            .mockResolvedValueOnce(agenda as never)
        const turnoFuturo = {
            id: 3,
            agendaId: 10,
            fecha: FECHA_LUNES_FUTURA,
            hora: '09:30',
            estado: 'CONFIRMADO',
        }
        vi.mocked(turnoModel.findAll).mockResolvedValue([turnoFuturo] as never)

        await expect(agendaService.desactivar(10)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(turnoModel.update).not.toHaveBeenCalled()
        expect(agenda.save).not.toHaveBeenCalled()
    })

    it('debe cancelar turnos futuros y desactivar si cancelarTurnosFuturos es true', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agenda as never)
            .mockResolvedValueOnce(agenda as never)
        const turnoFuturo = {
            id: 3,
            agendaId: 10,
            fecha: FECHA_LUNES_FUTURA,
            hora: '09:30',
            estado: 'PENDIENTE',
        }
        vi.mocked(turnoModel.findAll).mockResolvedValue([turnoFuturo] as never)
        vi.mocked(turnoModel.update).mockResolvedValue([1] as never)

        const resultado = await agendaService.desactivar(10, {
            cancelarTurnosFuturos: true,
        })

        expect(turnoModel.update).toHaveBeenCalledWith(
            { estado: 'CANCELADO' },
            { where: { id: { [Op.in]: [3] } } },
        )
        expect(agenda.activo).toBe(false)
        expect(agenda.save).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(agenda)
    })

    it('debe desactivar correctamente si no hay turnos futuros', async () => {
        const agenda = { ...agendaActiva, save: vi.fn() }
        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agenda as never)
            .mockResolvedValueOnce(agenda as never)
        vi.mocked(turnoModel.findAll).mockResolvedValue([] as never)

        const resultado = await agendaService.desactivar(10)

        expect(turnoModel.update).not.toHaveBeenCalled()
        expect(agenda.activo).toBe(false)
        expect(agenda.save).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(agenda)
    })
})