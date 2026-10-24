import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/profesionalService.js', () => ({
    profesionalService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        buscarPorUsuarioId: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
    },
}))

import { profesionalService } from '../../src/services/profesionalService.js'
import { profesionalController } from '../../src/controllers/profesionalController.js'
import { AppError } from '../../src/errors/AppError.js'

type UsuarioToken = {
    id: number
    email: string
    rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN'
}

function crearMocks(
    body: object = {},
    params: Record<string, string> = {},
    usuario?: UsuarioToken,
) {
    const req = {
        body,
        params,
        usuario,
    } as unknown as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const profesional = {
    id: 3,
    usuarioId: 77,
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    matricula: 'MP-12345',
    especialidad: 'Cardiología',
}

const datosCreacion = {
    usuarioId: 10,
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    matricula: 'MP-12345',
    especialidad: 'Cardiología',
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('profesionalController.listar', () => {
    it('debe responder 200 con la lista de profesionales', async () => {
        vi.mocked(profesionalService.listar).mockResolvedValue([
            profesional,
        ] as never)

        const { req, res, next } = crearMocks()

        await profesionalController.listar(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([profesional])
        expect(next).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')

        vi.mocked(profesionalService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await profesionalController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('profesionalController.buscarPorId', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await profesionalController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(profesionalService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await profesionalController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 200 con los datos del profesional', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks({}, { id: '3' })

        await profesionalController.buscarPorId(req, res, next)

        expect(profesionalService.buscarPorId).toHaveBeenCalledWith(3)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(profesional)
    })
})

describe('profesionalController.buscarPorUsuarioId', () => {
    it('debe responder 401 si no hay usuario autenticado', async () => {
        const { req, res, next } = crearMocks()

        await profesionalController.buscarPorUsuarioId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401 }),
        )
        expect(profesionalService.buscarPorUsuarioId).not.toHaveBeenCalled()
    })

    it('debe consultar el perfil usando el usuarioId del token', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks(
            {},
            {},
            {
                id: 77,
                email: 'profe@test.com',
                rol: 'PROFESIONAL',
            },
        )

        await profesionalController.buscarPorUsuarioId(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).toHaveBeenCalledWith(77)
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe responder 404 si la cuenta no tiene perfil profesional', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(null)

        const { req, res, next } = crearMocks(
            {},
            {},
            {
                id: 77,
                email: 'profe@test.com',
                rol: 'PROFESIONAL',
            },
        )

        await profesionalController.buscarPorUsuarioId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })
})

describe('profesionalController.crear', () => {
    it('debe responder 400 si faltan campos obligatorios', async () => {
        const { req, res, next } = crearMocks({ nombre: 'Ana' })

        await profesionalController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(profesionalService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 ante un DNI inválido', async () => {
        const { req, res, next } = crearMocks({
            ...datosCreacion,
            dni: '123',
        })

        await profesionalController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(profesionalService.crear).not.toHaveBeenCalled()
    })

    it('debe delegar los errores de negocio del servicio', async () => {
        vi.mocked(profesionalService.crear).mockRejectedValue(
            new AppError(409, 'La matrícula ya está registrada'),
        )

        const { req, res, next } = crearMocks(datosCreacion)

        await profesionalController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 201 enviando solo los campos permitidos', async () => {
        vi.mocked(profesionalService.crear).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks({
            ...datosCreacion,
            rol: 'ADMIN',
            password: 'secreta',
        })

        await profesionalController.crear(req, res, next)

        expect(profesionalService.crear).toHaveBeenCalledWith(datosCreacion)
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(profesional)
    })
})

describe('profesionalController.actualizar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks(
            { nombre: 'Nuevo' },
            { id: 'abc' },
        )

        await profesionalController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(profesionalService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el body está vacío', async () => {
        const { req, res, next } = crearMocks(
            {},
            { id: '3' },
            {
                id: 77,
                email: 'profe@test.com',
                rol: 'PROFESIONAL',
            },
        )

        await profesionalController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(profesionalService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks(
            { nombre: 'Nuevo' },
            { id: '999' },
            { id: 77, email: 'profe@test.com', rol: 'PROFESIONAL' },
        )

        await profesionalController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(profesionalService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un profesional intenta modificar un perfil ajeno', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks(
            { nombre: 'Nuevo' },
            { id: '3' },
            { id: 999, email: 'otro@test.com', rol: 'PROFESIONAL' },
        )

        await profesionalController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(profesionalService.actualizar).not.toHaveBeenCalled()
    })

    it('debe permitir a un profesional modificar su propio perfil', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(profesionalService.actualizar).mockResolvedValue({
            ...profesional,
            nombre: 'Nuevo',
        } as never)

        const { req, res, next } = crearMocks(
            { nombre: 'Nuevo' },
            { id: '3' },
            { id: 77, email: 'profe@test.com', rol: 'PROFESIONAL' },
        )

        await profesionalController.actualizar(req, res, next)

        expect(profesionalService.actualizar).toHaveBeenCalledWith(3, {
            nombre: 'Nuevo',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe permitir a un ADMIN modificar un perfil ajeno', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(profesionalService.actualizar).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks(
            { matricula: 'MP-99999' },
            { id: '3' },
            { id: 1, email: 'admin@test.com', rol: 'ADMIN' },
        )

        await profesionalController.actualizar(req, res, next)

        expect(profesionalService.actualizar).toHaveBeenCalledWith(3, {
            matricula: 'MP-99999',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe descartar usuarioId del payload de actualización', async () => {
        vi.mocked(profesionalService.buscarPorId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(profesionalService.actualizar).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks(
            { nombre: 'Nuevo', usuarioId: 999 },
            { id: '3' },
            { id: 1, email: 'admin@test.com', rol: 'ADMIN' },
        )

        await profesionalController.actualizar(req, res, next)

        expect(profesionalService.actualizar).toHaveBeenCalledWith(3, {
            nombre: 'Nuevo',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })
})
