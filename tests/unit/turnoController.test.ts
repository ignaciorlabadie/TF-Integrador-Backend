import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/turnoService.js', () => ({
    turnoService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        cancelar: vi.fn(),
        obtenerAgendaConValidacion: vi.fn(),
    },
}))

import { turnoController } from '../../src/controllers/turnoController.js'
import { turnoService } from '../../src/services/turnoService.js'

function crearMocks(
    body: object = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {},
    usuario: { id: number; email: string; rol: string } = { id: 1, email: 'test@test.com', rol: 'PACIENTE' }
) {
    const req = {
        body,
        params,
        query,
        usuario,
    } as unknown as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const turno = {
    id: 5,
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    estado: 'CONFIRMADO',
    motivo: 'Control',
}

const datosCreacion = {
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    motivo: 'Control',
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('turnoController.listar', () => {
    it('llama al servicio con filtro de paciente para PACIENTE por defecto', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks()

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith({ pacienteId: 1 })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('pasa solo los filtros presentes para ADMIN', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            { fecha: '2027-10-25' },
            { id: 1, email: 'admin@test.com', rol: 'ADMIN' }
        )

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith({
            fecha: '2027-10-25',
        })
    })

    it('PACIENTE filtra solo por pacienteId', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            {},
            { id: 4, email: 'patient@test.com', rol: 'PACIENTE' }
        )

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith({ pacienteId: 4 })
    })

    it('PROFESIONAL filtra solo por profesionalId', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            {},
            { id: 2, email: 'prof@test.com', rol: 'PROFESIONAL' }
        )

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith({ profesionalId: 2 })
    })

    it('responde 200 con los filtros parseados para ADMIN', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            {
                profesionalId: '2',
                pacienteId: '4',
                fecha: '2027-10-25',
                estado: 'CONFIRMADO',
            },
            { id: 1, email: 'admin@test.com', rol: 'ADMIN' }
        )

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith({
            profesionalId: 2,
            pacienteId: 4,
            fecha: '2027-10-25',
            estado: 'CONFIRMADO',
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([turno])
        expect(next).not.toHaveBeenCalled()
    })

    it('deriva el error al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await turnoController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.buscarPorId', () => {
    it('responde 400 ante un id inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await turnoController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.buscarPorId).not.toHaveBeenCalled()
    })

    it('responde 200 con el turno', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({}, { id: '5' })

        await turnoController.buscarPorId(req, res, next)

        expect(turnoService.buscarPorId).toHaveBeenCalledWith(5)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.buscarPorId).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '5' })

        await turnoController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.crear', () => {
    beforeEach(() => {
        vi.mocked(turnoService.obtenerAgendaConValidacion).mockResolvedValue({
            id: 3,
            profesionalId: 2,
            diaSemana: 'LUNES',
            horaInicio: '09:00',
            horaFin: '17:00',
            duracionTurno: 30,
            activo: true,
        } as never)
    })

    it('responde 400 si faltan datos obligatorios', async () => {
        const { req, res, next } = crearMocks({
            ...datosCreacion,
            motivo: undefined,
        })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.crear).not.toHaveBeenCalled()
    })

    it('responde 201 con los datos normalizados y agenda validada', async () => {
        vi.mocked(turnoService.crear).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            ...datosCreacion,
            pacienteId: '4',
            profesionalId: '2',
            agendaId: '3',
        })

        await turnoController.crear(req, res, next)

        expect(turnoService.obtenerAgendaConValidacion).toHaveBeenCalledWith(
            2,
            3,
            'PACIENTE'
        )
        expect(turnoService.crear).toHaveBeenCalledWith({
            ...datosCreacion,
            pacienteId: 4,
            profesionalId: 2,
            agendaId: 3,
            observaciones: null,
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('convierte las observaciones a string y valida agenda', async () => {
        vi.mocked(turnoService.crear).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            ...datosCreacion,
            observaciones: 'Traer análisis',
        })

        await turnoController.crear(req, res, next)

        expect(turnoService.obtenerAgendaConValidacion).toHaveBeenCalledWith(
            2,
            3,
            'PACIENTE'
        )
        expect(turnoService.crear).toHaveBeenCalledWith({
            ...datosCreacion,
            observaciones: 'Traer análisis',
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('deriva error de agenda no encontrada al middleware', async () => {
        vi.mocked(turnoService.obtenerAgendaConValidacion).mockRejectedValue(
            new Error('Agenda no encontrada')
        )

        const { req, res, next } = crearMocks(datosCreacion)

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(new Error('Agenda no encontrada'))
        expect(res.status).not.toHaveBeenCalled()
    })

    it('devuelve error 403 si la agenda no pertenece al profesional', async () => {
        const { AppError } = await import('../../src/errors/AppError.js')

        vi.mocked(turnoService.obtenerAgendaConValidacion).mockRejectedValue(
            new AppError(403, 'La agenda no pertenece a este profesional')
        )

        const { req, res, next } = crearMocks(datosCreacion)

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 })
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('devuelve error 403 si la agenda no está activa', async () => {
        const { AppError } = await import('../../src/errors/AppError.js')

        vi.mocked(turnoService.obtenerAgendaConValidacion).mockRejectedValue(
            new AppError(403, 'La agenda no está activa')
        )

        const { req, res, next } = crearMocks({
            ...datosCreacion,
            agendaId: 999,
        })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 })
        )
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.actualizar', () => {
    it('responde 400 ante un id inválido', async () => {
        const { req, res, next } = crearMocks({ motivo: 'Otro' }, { id: 'abc' })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.actualizar).not.toHaveBeenCalled()
    })

    it('responde 400 si el body no tiene datos', async () => {
        const { req, res, next } = crearMocks({}, { id: '5' })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.actualizar).not.toHaveBeenCalled()
    })

    it('responde 200 con el turno actualizado', async () => {
        vi.mocked(turnoService.actualizar).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks(
            { motivo: 'Control actualizado' },
            { id: '5' }
        )

        await turnoController.actualizar(req, res, next)

        expect(turnoService.actualizar).toHaveBeenCalledWith(5, {
            motivo: 'Control actualizado',
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('pasa todos los campos actualizables al servicio', async () => {
        vi.mocked(turnoService.actualizar).mockResolvedValue(turno as never)

        const datos = {
            fecha: '2027-10-26',
            hora: '11:00',
            motivo: 'Control',
            observaciones: 'Traer análisis',
            estado: 'PENDIENTE',
        }
        const { req, res, next } = crearMocks(datos, { id: '5' })

        await turnoController.actualizar(req, res, next)

        expect(turnoService.actualizar).toHaveBeenCalledWith(5, datos)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.actualizar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({ motivo: 'Otro' }, { id: '5' })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.cancelar', () => {
    it('responde 400 ante un id inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await turnoController.cancelar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.cancelar).not.toHaveBeenCalled()
    })

    it('responde 200 con el turno cancelado', async () => {
        vi.mocked(turnoService.cancelar).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({}, { id: '5' })

        await turnoController.cancelar(req, res, next)

        expect(turnoService.cancelar).toHaveBeenCalledWith(5)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.cancelar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '5' })

        await turnoController.cancelar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})