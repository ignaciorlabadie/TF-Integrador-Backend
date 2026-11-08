import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../src/errors/AppError.js'

vi.mock('../../src/services/espacioService.js', () => ({
    espacioService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        desactivar: vi.fn(),
        reactivar: vi.fn(),
        eliminar: vi.fn(),
        obtenerOcupacion: vi.fn(),
    },
}))

import { espacioService } from '../../src/services/espacioService.js'
import { espacioController } from '../../src/controllers/espacioController.js'

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

const espacio = {
    id: 10,
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
    activo: true,
}

const datosCreacion = {
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('espacioController.listar', () => {
    it('debe responder 200 con la lista de espacios', async () => {
        vi.mocked(espacioService.listar).mockResolvedValue([espacio] as never)

        const { req, res, next } = crearMocks()

        await espacioController.listar(req, res, next)

        expect(espacioService.listar).toHaveBeenCalledWith({})
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([espacio])
        expect(next).not.toHaveBeenCalled()
    })

    it('debe parsear los filtros desde el query', async () => {
        vi.mocked(espacioService.listar).mockResolvedValue([] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            { activo: 'false', tipo: 'GIMNASIO', ubicacion: 'ATRAS' },
        )

        await espacioController.listar(req, res, next)

        expect(espacioService.listar).toHaveBeenCalledWith({
            activo: false,
            tipo: 'GIMNASIO',
            ubicacion: 'ATRAS',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe responder 400 si activo no es true/false', async () => {
        const { req, res, next } = crearMocks({}, {}, { activo: 'si' })

        await espacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.listar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el tipo no es válido', async () => {
        const { req, res, next } = crearMocks({}, {}, { tipo: 'OTRO' })

        await espacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.listar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si la ubicación no es válida', async () => {
        const { req, res, next } = crearMocks({}, {}, { ubicacion: 'ARRIBA' })

        await espacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.listar).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await espacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.buscarPorId', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await espacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await espacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 200 con el espacio', async () => {
        vi.mocked(espacioService.buscarPorId).mockResolvedValue(
            espacio as never,
        )

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.buscarPorId(req, res, next)

        expect(espacioService.buscarPorId).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(espacio)
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.buscarPorId).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.crear', () => {
    it('debe responder 400 si faltan campos obligatorios', async () => {
        const { req, res, next } = crearMocks({ nombre: 'Sala 1' })

        await espacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el nombre es inválido', async () => {
        const { req, res, next } = crearMocks({
            ...datosCreacion,
            nombre: '   ',
        })

        await espacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el tipo es inválido', async () => {
        const { req, res, next } = crearMocks({
            ...datosCreacion,
            tipo: 'OTRO',
        })

        await espacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si la ubicación es inválida', async () => {
        const { req, res, next } = crearMocks({
            ...datosCreacion,
            ubicacion: 'ARRIBA',
        })

        await espacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 201 enviando solo los campos permitidos', async () => {
        vi.mocked(espacioService.crear).mockResolvedValue(espacio as never)

        const { req, res, next } = crearMocks({
            ...datosCreacion,
            nombre: '  Sala 1  ',
            activo: false,
            id: 99,
        })

        await espacioController.crear(req, res, next)

        expect(espacioService.crear).toHaveBeenCalledWith(datosCreacion)
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(espacio)
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.crear).mockRejectedValue(error)

        const { req, res, next } = crearMocks(datosCreacion)

        await espacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.actualizar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks(
            { nombre: 'Sala 2' },
            { id: 'abc' },
        )

        await espacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el body está vacío', async () => {
        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si un campo tiene un valor inválido', async () => {
        const { req, res, next } = crearMocks({ tipo: 'OTRO' }, { id: '10' })

        await espacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 200 con los datos actualizados', async () => {
        vi.mocked(espacioService.actualizar).mockResolvedValue({
            ...espacio,
            nombre: 'Sala 2',
        } as never)

        const { req, res, next } = crearMocks(
            { nombre: '  Sala 2  ' },
            { id: '10' },
        )

        await espacioController.actualizar(req, res, next)

        expect(espacioService.actualizar).toHaveBeenCalledWith(10, {
            nombre: 'Sala 2',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe ignorar campos no permitidos como activo', async () => {
        vi.mocked(espacioService.actualizar).mockResolvedValue(espacio as never)

        const { req, res, next } = crearMocks(
            { nombre: 'Sala 2', activo: false, id: 99 },
            { id: '10' },
        )

        await espacioController.actualizar(req, res, next)

        expect(espacioService.actualizar).toHaveBeenCalledWith(10, {
            nombre: 'Sala 2',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe delegar 404 si el espacio no existe', async () => {
        vi.mocked(espacioService.actualizar).mockRejectedValue(
            new AppError(404, 'Espacio no encontrado'),
        )

        const { req, res, next } = crearMocks(
            { nombre: 'Sala 2' },
            { id: '999' },
        )

        await espacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.actualizar).mockRejectedValue(error)

        const { req, res, next } = crearMocks(
            { nombre: 'Sala 2' },
            { id: '10' },
        )

        await espacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.desactivar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await espacioController.desactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.desactivar).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioService.desactivar).mockRejectedValue(
            new AppError(404, 'Espacio no encontrado'),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await espacioController.desactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 200 con el espacio desactivado', async () => {
        const desactivado = { ...espacio, activo: false }
        vi.mocked(espacioService.desactivar).mockResolvedValue(
            desactivado as never,
        )

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.desactivar(req, res, next)

        expect(espacioService.desactivar).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(desactivado)
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.desactivar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.desactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.reactivar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await espacioController.reactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.reactivar).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioService.reactivar).mockRejectedValue(
            new AppError(404, 'Espacio no encontrado'),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await espacioController.reactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 200 con el espacio reactivado', async () => {
        vi.mocked(espacioService.reactivar).mockResolvedValue(espacio as never)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.reactivar(req, res, next)

        expect(espacioService.reactivar).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(espacio)
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.reactivar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.reactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.eliminar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await espacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.eliminar).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioService.eliminar).mockRejectedValue(
            new AppError(404, 'Espacio no encontrado'),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await espacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 409 si tiene dependencias', async () => {
        vi.mocked(espacioService.eliminar).mockRejectedValue(
            new AppError(409, 'El espacio tiene asignaciones'),
        )

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 204 sin contenido si elimina correctamente', async () => {
        vi.mocked(espacioService.eliminar).mockResolvedValue(undefined)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.eliminar(req, res, next)

        expect(espacioService.eliminar).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.send).toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.eliminar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '10' })

        await espacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('espacioController.obtenerOcupacion', () => {
    it('debe responder 400 si falta start o end', async () => {
        const { req, res, next } = crearMocks({}, {}, { start: '2026-10-05' })

        await espacioController.obtenerOcupacion(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(espacioService.obtenerOcupacion).not.toHaveBeenCalled()
    })

    it('debe responder 200 con los espacios en data', async () => {
        vi.mocked(espacioService.obtenerOcupacion).mockResolvedValue([
            espacio,
        ] as never)

        const { req, res, next } = crearMocks(
            {},
            {},
            { start: '2026-10-05', end: '2026-10-11' },
        )

        await espacioController.obtenerOcupacion(req, res, next)

        expect(espacioService.obtenerOcupacion).toHaveBeenCalledWith(
            '2026-10-05',
            '2026-10-11',
        )
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: [espacio] })
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')
        vi.mocked(espacioService.obtenerOcupacion).mockRejectedValue(error)

        const { req, res, next } = crearMocks(
            {},
            {},
            { start: '2026-10-05', end: '2026-10-11' },
        )

        await espacioController.obtenerOcupacion(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})
