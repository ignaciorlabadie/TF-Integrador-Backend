import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/pacienteService.js', () => ({
    pacienteService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        buscarPorUsuarioId: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        eliminar: vi.fn(),
    },
}))

import { pacienteService } from '../../src/services/pacienteService.js'
import { pacienteController } from '../../src/controllers/pacienteController.js'

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
        send: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const paciente = {
    id: 3,
    usuarioId: 10,
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    fechaNacimiento: '1990-05-14',
    direccion: 'Calle Falsa 123',
    usuario: {
        id: 10,
        email: 'paciente@example.com',
        rol: 'PACIENTE',
        activo: true,
    },
}

const datosValidos = {
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    fechaNacimiento: '1990-05-14',
    direccion: 'Calle Falsa 123',
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('pacienteController.listar', () => {
    it('debe responder 200 con la lista de pacientes', async () => {
        vi.mocked(pacienteService.listar).mockResolvedValue([paciente] as never)

        const { req, res, next } = crearMocks()

        await pacienteController.listar(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([paciente])
    })

    it('debe delegar el error inesperado al middleware con next', async () => {
        const error = new Error('Error de DB')

        vi.mocked(pacienteService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await pacienteController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('pacienteController.buscarPorId', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await pacienteController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(pacienteService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await pacienteController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe responder 200 con el paciente', async () => {
        vi.mocked(pacienteService.buscarPorId).mockResolvedValue(
            paciente as never,
        )

        const { req, res, next } = crearMocks({}, { id: '3' })

        await pacienteController.buscarPorId(req, res, next)

        expect(pacienteService.buscarPorId).toHaveBeenCalledWith(3)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(paciente)
    })
})

describe('pacienteController.obtenerMiPerfil', () => {
    it('debe responder 401 si no hay usuario autenticado', async () => {
        const { req, res, next } = crearMocks()

        await pacienteController.obtenerMiPerfil(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401 }),
        )
        expect(pacienteService.buscarPorUsuarioId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el usuario no tiene perfil de paciente', async () => {
        vi.mocked(pacienteService.buscarPorUsuarioId).mockResolvedValue(null)

        const { req, res, next } = crearMocks(
            {},
            {},
            {
                id: 1,
                email: 'usuario@example.com',
                rol: 'ADMIN',
            },
        )

        await pacienteController.obtenerMiPerfil(req, res, next)

        expect(pacienteService.buscarPorUsuarioId).toHaveBeenCalledWith(1)
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe devolver el perfil del paciente autenticado', async () => {
        vi.mocked(pacienteService.buscarPorUsuarioId).mockResolvedValue(
            paciente as never,
        )

        const { req, res, next } = crearMocks(
            {},
            {},
            {
                id: 10,
                email: 'paciente@example.com',
                rol: 'PACIENTE',
            },
        )

        await pacienteController.obtenerMiPerfil(req, res, next)

        expect(pacienteService.buscarPorUsuarioId).toHaveBeenCalledWith(10)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(paciente)
    })
})

describe('pacienteController.crear', () => {
    it('debe responder 400 si los datos son inválidos', async () => {
        const { req, res, next } = crearMocks({
            ...datosValidos,
            email: 'no-es-un-email',
            password: 'Password123',
        })

        await pacienteController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 201 con el paciente creado', async () => {
        vi.mocked(pacienteService.crear).mockResolvedValue(paciente as never)

        const { req, res, next } = crearMocks({
            ...datosValidos,
            email: 'paciente@example.com',
            password: 'Password123',
        })

        await pacienteController.crear(req, res, next)

        expect(pacienteService.crear).toHaveBeenCalledWith({
            email: 'paciente@example.com',
            password: 'Password123',
            ...datosValidos,
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(paciente)
    })

    it('debe delegar el 409 de email o DNI duplicado', async () => {
        vi.mocked(pacienteService.crear).mockRejectedValue(
            Object.assign(new Error('El email ya está registrado'), {
                statusCode: 409,
            }),
        )

        const { req, res, next } = crearMocks({
            ...datosValidos,
            email: 'paciente@example.com',
            password: 'Password123',
        })

        await pacienteController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
    })
})

describe('pacienteController.actualizar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({ nombre: 'Ana' }, { id: 'abc' })

        await pacienteController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si no se envía ningún campo', async () => {
        const { req, res, next } = crearMocks({}, { id: '3' })

        await pacienteController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.actualizar).not.toHaveBeenCalled()
    })

    it.each([
        ['nombre', { nombre: 'A' }],
        ['apellido', { apellido: '' }],
        ['dni', { dni: '123' }],
        ['telefono', { telefono: 'abc' }],
        ['fechaNacimiento', { fechaNacimiento: '2099-01-01' }],
        ['direccion', { direccion: 'ab' }],
    ])('debe responder 400 con %s inválido', async (_campo, body) => {
        const { req, res, next } = crearMocks(body, { id: '3' })

        await pacienteController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 200 con el paciente actualizado', async () => {
        vi.mocked(pacienteService.actualizar).mockResolvedValue({
            ...paciente,
            telefono: '+5491198765432',
        } as never)

        const { req, res, next } = crearMocks(
            { telefono: '+5491198765432' },
            { id: '3' },
        )

        await pacienteController.actualizar(req, res, next)

        expect(pacienteService.actualizar).toHaveBeenCalledWith(3, {
            nombre: undefined,
            apellido: undefined,
            dni: undefined,
            telefono: '+5491198765432',
            fechaNacimiento: undefined,
            direccion: undefined,
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe delegar el 404 si el paciente no existe', async () => {
        vi.mocked(pacienteService.actualizar).mockRejectedValue(
            Object.assign(new Error('Paciente no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res, next } = crearMocks({ nombre: 'Ana' }, { id: '999' })

        await pacienteController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })
})

describe('pacienteController.actualizarMiPerfil', () => {
    it('debe responder 401 si no hay usuario autenticado', async () => {
        const { req, res, next } = crearMocks({ nombre: 'Ana' })

        await pacienteController.actualizarMiPerfil(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401 }),
        )
        expect(pacienteService.buscarPorUsuarioId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el usuario no tiene perfil de paciente', async () => {
        vi.mocked(pacienteService.buscarPorUsuarioId).mockResolvedValue(null)

        const { req, res, next } = crearMocks(
            { nombre: 'Ana' },
            {},
            { id: 1, email: 'admin@example.com', rol: 'ADMIN' },
        )

        await pacienteController.actualizarMiPerfil(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(pacienteService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si los datos son inválidos', async () => {
        vi.mocked(pacienteService.buscarPorUsuarioId).mockResolvedValue(
            paciente as never,
        )

        const { req, res, next } = crearMocks(
            { dni: '123' },
            {},
            { id: 10, email: 'paciente@example.com', rol: 'PACIENTE' },
        )

        await pacienteController.actualizarMiPerfil(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.actualizar).not.toHaveBeenCalled()
    })

    it('debe actualizar el perfil del paciente autenticado', async () => {
        vi.mocked(pacienteService.buscarPorUsuarioId).mockResolvedValue(
            paciente as never,
        )
        vi.mocked(pacienteService.actualizar).mockResolvedValue(
            paciente as never,
        )

        const { req, res, next } = crearMocks(
            { direccion: 'Nueva Direccion 456' },
            {},
            { id: 10, email: 'paciente@example.com', rol: 'PACIENTE' },
        )

        await pacienteController.actualizarMiPerfil(req, res, next)

        expect(pacienteService.actualizar).toHaveBeenCalledWith(
            3,
            expect.objectContaining({ direccion: 'Nueva Direccion 456' }),
        )
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(paciente)
    })
})

describe('pacienteController.eliminar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await pacienteController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(pacienteService.eliminar).not.toHaveBeenCalled()
    })

    it('debe responder 204 sin contenido si elimina', async () => {
        vi.mocked(pacienteService.eliminar).mockResolvedValue(undefined)

        const { req, res, next } = crearMocks({}, { id: '3' })

        await pacienteController.eliminar(req, res, next)

        expect(pacienteService.eliminar).toHaveBeenCalledWith(3)
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.send).toHaveBeenCalled()
    })

    it('debe delegar el 404 si el paciente no existe', async () => {
        vi.mocked(pacienteService.eliminar).mockRejectedValue(
            Object.assign(new Error('Paciente no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await pacienteController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe delegar el 409 si el paciente tiene registros asociados', async () => {
        vi.mocked(pacienteService.eliminar).mockRejectedValue(
            Object.assign(new Error('No se puede eliminar'), {
                statusCode: 409,
            }),
        )

        const { req, res, next } = crearMocks({}, { id: '3' })

        await pacienteController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
    })
})
