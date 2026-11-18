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

    it('debe responder 200 sin filtros', async () => {
        vi.mocked(tarifaEspacioService.listar).mockResolvedValue([] as never)

        const { req, res, next } = crearMocks()

        await tarifaEspacioController.listar(req, res, next)

        expect(tarifaEspacioService.listar).toHaveBeenCalledWith({})
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([])
    })

    it('debe parsear vigente=false', async () => {
        vi.mocked(tarifaEspacioService.listar).mockResolvedValue([] as never)

        const { req, res, next } = crearMocks({}, {}, { vigente: 'false' })

        await tarifaEspacioController.listar(req, res, next)

        expect(tarifaEspacioService.listar).toHaveBeenCalledWith({
            vigente: false,
        })
    })

    it('debe responder 400 si espacioId es inválido', async () => {
        const { req, res, next } = crearMocks({}, {}, { espacioId: 'abc' })

        await tarifaEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.listar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si vigente no es true o false', async () => {
        const { req, res, next } = crearMocks({}, {}, { vigente: 'quizas' })

        await tarifaEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.listar).not.toHaveBeenCalled()
    })

    it('debe delegar un error inesperado', async () => {
        const error = new Error('Error de DB')
        vi.mocked(tarifaEspacioService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await tarifaEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
    })
})

describe('tarifaEspacioController.buscarPorId', () => {
    it('debe responder 200 con la tarifa', async () => {
        vi.mocked(tarifaEspacioService.buscarPorId).mockResolvedValue(
            tarifa as never,
        )

        const { req, res, next } = crearMocks({}, { id: '1' })

        await tarifaEspacioController.buscarPorId(req, res, next)

        expect(tarifaEspacioService.buscarPorId).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(tarifa)
        expect(next).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el ID es inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await tarifaEspacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la tarifa no existe', async () => {
        vi.mocked(tarifaEspacioService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await tarifaEspacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })
})

describe('tarifaEspacioController.crear', () => {
    it('debe responder 201 con la tarifa creada', async () => {
        vi.mocked(tarifaEspacioService.crear).mockResolvedValue(tarifa as never)

        const datos = {
            espacioId: 10,
            precioPorHora: '1500.50',
            fechaDesde: '2026-01-01',
            fechaHasta: null,
        }

        const { req, res, next } = crearMocks(datos)

        await tarifaEspacioController.crear(req, res, next)

        expect(tarifaEspacioService.crear).toHaveBeenCalledWith(datos)
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(tarifa)
        expect(next).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el body está vacío', async () => {
        const { req, res, next } = crearMocks()

        await tarifaEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si falta fechaDesde', async () => {
        const { req, res, next } = crearMocks({
            espacioId: 10,
            precioPorHora: '1500.50',
        })

        await tarifaEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si espacioId no es entero positivo', async () => {
        const { req, res, next } = crearMocks({
            espacioId: 'abc',
            precioPorHora: '1500.50',
            fechaDesde: '2026-01-01',
        })

        await tarifaEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.crear).not.toHaveBeenCalled()
    })
})

describe('tarifaEspacioController.actualizar', () => {
    it('debe responder 200 con la tarifa actualizada', async () => {
        vi.mocked(tarifaEspacioService.actualizar).mockResolvedValue(
            tarifa as never,
        )

        const datos = {
            espacioId: 10,
            precioPorHora: '1600.00',
            fechaDesde: '2026-01-01',
            fechaHasta: null,
        }

        const { req, res, next } = crearMocks(datos, { id: '1' })

        await tarifaEspacioController.actualizar(req, res, next)

        expect(tarifaEspacioService.actualizar).toHaveBeenCalledWith(1, datos)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(tarifa)
        expect(next).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el body está vacío', async () => {
        const { req, res, next } = crearMocks({}, { id: '1' })

        await tarifaEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si falta fechaDesde', async () => {
        const { req, res, next } = crearMocks(
            { espacioId: 10, precioPorHora: '1600.00' },
            { id: '1' },
        )

        await tarifaEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si espacioId no es entero positivo', async () => {
        const { req, res, next } = crearMocks(
            {
                espacioId: 'abc',
                precioPorHora: '1600.00',
                fechaDesde: '2026-01-01',
            },
            { id: '1' },
        )

        await tarifaEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el ID es inválido', async () => {
        const { req, res, next } = crearMocks(
            {
                espacioId: 10,
                precioPorHora: '1600.00',
                fechaDesde: '2026-01-01',
            },
            { id: 'abc' },
        )

        await tarifaEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.actualizar).not.toHaveBeenCalled()
    })
})

describe('tarifaEspacioController.eliminar', () => {
    it('debe responder 204', async () => {
        vi.mocked(tarifaEspacioService.eliminar).mockResolvedValue(undefined)

        const { req, res, next } = crearMocks({}, { id: '1' })

        await tarifaEspacioController.eliminar(req, res, next)

        expect(tarifaEspacioService.eliminar).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.send).toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el ID es inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await tarifaEspacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.eliminar).not.toHaveBeenCalled()
    })
})

describe('tarifaEspacioController.obtenerVigente', () => {
    it('debe responder 200 con la tarifa vigente del espacio', async () => {
        vi.mocked(tarifaEspacioService.obtenerVigente).mockResolvedValue(
            tarifa as never,
        )

        const { req, res, next } = crearMocks({}, {}, { espacioId: '10' })

        await tarifaEspacioController.obtenerVigente(req, res, next)

        expect(tarifaEspacioService.obtenerVigente).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(tarifa)
        expect(next).not.toHaveBeenCalled()
    })

    it('debe responder 404 si no hay tarifa vigente', async () => {
        vi.mocked(tarifaEspacioService.obtenerVigente).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, {}, { espacioId: '10' })

        await tarifaEspacioController.obtenerVigente(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe responder 400 si espacioId es inválido', async () => {
        const { req, res, next } = crearMocks({}, {}, { espacioId: 'abc' })

        await tarifaEspacioController.obtenerVigente(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(tarifaEspacioService.obtenerVigente).not.toHaveBeenCalled()
    })
})
