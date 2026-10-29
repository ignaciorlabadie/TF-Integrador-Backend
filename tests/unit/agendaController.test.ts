import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/agendaService.js', () => ({
    agendaService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
    },
}))

import { agendaService } from '../../src/services/agendaService.js'
import { agendaController } from '../../src/controllers/agendaController.js'

type UsuarioToken = {
    id: number
    email: string
    rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN'
}

function crearMocks(
    body: object = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {},
    usuario?: UsuarioToken,
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
        send: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const agenda = {
    id: 10,
    profesionalId: 1,
    diaSemana: 'LUNES',
    horaInicio: '08:00',
    horaFin: '12:00',
    duracionTurno: 60,
    activo: true,
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('agendaController.listar', () => {
    it('debe responder 200 con la lista de agendas', async () => {
        vi.mocked(agendaService.listar).mockResolvedValue([agenda] as never)

        const { req, res, next } = crearMocks()

        await agendaController.listar(req, res, next)

        expect(agendaService.listar).toHaveBeenCalledWith({})
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([agenda])
        expect(next).not.toHaveBeenCalled()
    })

    it('debe parsear los filtros profesionalId y activo desde el query', async () => {
        vi.mocked(agendaService.listar).mockResolvedValue([agenda] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            { profesionalId: '1', activo: 'false' },
        )

        await agendaController.listar(req, res, next)

        expect(agendaService.listar).toHaveBeenCalledWith({
            profesionalId: 1,
            activo: false,
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe responder 400 si profesionalId no es un entero positivo', async () => {
        const { req, res, next } = crearMocks(
            {},
            {},
            { profesionalId: 'abc' },
        )

        await agendaController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(agendaService.listar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si activo no es true/false', async () => {
        const { req, res, next } = crearMocks({}, {}, { activo: 'si' })

        await agendaController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(agendaService.listar).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(agendaService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await agendaController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('agendaController.buscarPorId', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await agendaController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(agendaService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la agenda no existe', async () => {
        vi.mocked(agendaService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await agendaController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la agenda', async () => {
        vi.mocked(agendaService.buscarPorId).mockResolvedValue(agenda as never)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await agendaController.buscarPorId(req, res, next)

        expect(agendaService.buscarPorId).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(agenda)
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(agendaService.buscarPorId).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await agendaController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})
