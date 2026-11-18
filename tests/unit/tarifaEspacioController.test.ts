import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/tarifaEspacioService.js', () => ({
    tarifaEspacioService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        eliminar: vi.fn(),
        obtenerVigente: vi.fn(),
    },
}))

import { tarifaEspacioService } from '../../src/services/tarifaEspacioService.js'
import { tarifaEspacioController } from '../../src/controllers/tarifaEspacioController.js'

function crearMocks(
    body: object = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {},
) {
    const req = { body, params, query } as unknown as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const tarifa = {
    id: 1,
    espacioId: 10,
    precioPorHora: '1500.00',
    fechaDesde: '2026-01-01',
    fechaHasta: null,
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('tarifaEspacioController.listar', () => {
    it('debe parsear los filtros desde el query y responder 200', async () => {
        vi.mocked(tarifaEspacioService.listar).mockResolvedValue([
            tarifa,
        ] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            { espacioId: '10', vigente: 'true' },
        )

        await tarifaEspacioController.listar(req, res, next)

        expect(tarifaEspacioService.listar).toHaveBeenCalledWith({
            espacioId: 10,
            vigente: true,
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([tarifa])
        expect(next).not.toHaveBeenCalled()
    })
})
