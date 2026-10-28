import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/usuarioService.js', () => ({
    usuarioService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        buscarPorEmail: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        desactivar: vi.fn(),
        reactivar: vi.fn(),
    },
}))

import { usuarioService } from '../../src/services/usuarioService.js'
import { usuarioController } from '../../src/controllers/usuarioController.js'
import { MENSAJES } from '../../src/errors/mensajes.js'

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

beforeEach(() => {
    vi.clearAllMocks()
})

describe('usuarioController', () => {
    it('debe listar usuarios', async () => {
        vi.mocked(usuarioService.listar).mockResolvedValue([])

        const { req, res, next } = crearMocks()

        await usuarioController.listar(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([])
    })

    it('debe propagar el error si falla el listado', async () => {
        const error = new Error('Error de DB')

        vi.mocked(usuarioService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await usuarioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe buscar un usuario por ID', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        }

        vi.mocked(usuarioService.buscarPorId).mockResolvedValue(
            usuario as never,
        )

        const { req, res, next } = crearMocks({}, { id: '1' })

        await usuarioController.buscarPorId(req, res, next)

        expect(usuarioService.buscarPorId).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe rechazar un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await usuarioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe devolver 404 si el usuario no existe', async () => {
        vi.mocked(usuarioService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await usuarioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe buscar un usuario por email', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        }

        vi.mocked(usuarioService.buscarPorEmail).mockResolvedValue(
            usuario as never,
        )

        const { req, res, next } = crearMocks(
            {},
            {
                email: 'usuario@example.com',
            },
        )

        await usuarioController.buscarPorEmail(req, res, next)

        expect(usuarioService.buscarPorEmail).toHaveBeenCalledWith(
            'usuario@example.com',
        )
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 404 si no encuentra el email', async () => {
        vi.mocked(usuarioService.buscarPorEmail).mockResolvedValue(null)

        const { req, res, next } = crearMocks(
            {},
            {
                email: 'inexistente@example.com',
            },
        )

        await usuarioController.buscarPorEmail(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it.each(['PROFESIONAL', 'ADMIN'] as const)(
        'debe crear un usuario con rol %s',
        async (rol) => {
            const usuario = {
                id: 1,
                email: 'usuario@example.com',
                rol,
                activo: true,
            }

            vi.mocked(usuarioService.crear).mockResolvedValue(usuario as never)

            const { req, res, next } = crearMocks({
                email: 'usuario@example.com',
                password: 'Password123',
                rol,
            })

            await usuarioController.crear(req, res, next)

            expect(usuarioService.crear).toHaveBeenCalledWith({
                email: 'usuario@example.com',
                password: 'Password123',
                rol,
            })
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(usuario)
        },
    )

    it('debe crear un usuario desactivado', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            rol: 'PROFESIONAL',
            activo: false,
        }

        vi.mocked(usuarioService.crear).mockResolvedValue(usuario as never)

        const { req, res, next } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: false,
        })

        await usuarioController.crear(req, res, next)

        expect(usuarioService.crear).toHaveBeenCalledWith({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: false,
        })
    })

    it('debe rechazar el alta de un paciente', async () => {
        const { req, res, next } = crearMocks({
            email: 'paciente@example.com',
            password: 'Password123',
            rol: 'PACIENTE',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                message: MENSAJES.ALTA_PACIENTE_EN_PACIENTES,
            }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe rechazar un rol inválido', async () => {
        const { req, res, next } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'SUPERVISOR',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe rechazar un email inválido al crear', async () => {
        const { req, res, next } = crearMocks({
            email: 'no-es-un-email',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe rechazar una contraseña corta al crear', async () => {
        const { req, res, next } = crearMocks({
            email: 'usuario@example.com',
            password: 'corta',
            rol: 'PROFESIONAL',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe rechazar una contraseña más larga que el límite de bcrypt', async () => {
        const { req, res, next } = crearMocks({
            email: 'usuario@example.com',
            password: 'a'.repeat(73),
            rol: 'PROFESIONAL',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe rechazar un campo activo que no sea booleano', async () => {
        const { req, res, next } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: 'sí',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe rechazar datos inválidos al crear', async () => {
        const { req, res, next } = crearMocks({
            email: '',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.crear).not.toHaveBeenCalled()
    })

    it('debe devolver 409 si el email ya está registrado', async () => {
        vi.mocked(usuarioService.crear).mockRejectedValue(
            Object.assign(new Error('El email ya está registrado'), {
                statusCode: 409,
            }),
        )

        const { req, res, next } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        await usuarioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
    })

    it('debe actualizar un usuario como administrador', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: false,
        }

        vi.mocked(usuarioService.actualizar).mockResolvedValue(usuario as never)

        const { req, res, next } = crearMocks(
            { activo: false },
            { id: '1' },
            { id: 99, email: 'admin@test.com', rol: 'ADMIN' },
        )

        await usuarioController.actualizar(req, res, next)

        expect(usuarioService.actualizar).toHaveBeenCalledWith(1, {
            email: undefined,
            activo: false,
            password: undefined,
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe permitir al propio usuario cambiar su contraseña', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: true,
        }

        vi.mocked(usuarioService.actualizar).mockResolvedValue(usuario as never)

        const { req, res, next } = crearMocks(
            { password: '12345678' },
            { id: '1' },
            { id: 1, email: 'usuario@example.com', rol: 'PACIENTE' },
        )

        await usuarioController.actualizar(req, res, next)

        expect(usuarioService.actualizar).toHaveBeenCalledWith(1, {
            email: undefined,
            activo: undefined,
            password: '12345678',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe impedir que un usuario no admin modifique el campo activo', async () => {
        const { req, res, next } = crearMocks(
            { activo: false },
            { id: '1' },
            { id: 1, email: 'usuario@example.com', rol: 'PACIENTE' },
        )

        await usuarioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(usuarioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe rechazar una actualización sin datos', async () => {
        const { req, res, next } = crearMocks({}, { id: '1' })

        await usuarioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(usuarioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe devolver 404 al actualizar un usuario inexistente', async () => {
        vi.mocked(usuarioService.actualizar).mockRejectedValue(
            Object.assign(new Error('Usuario no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res, next } = crearMocks(
            { activo: false },
            { id: '999' },
            { id: 99, email: 'admin@test.com', rol: 'ADMIN' },
        )

        await usuarioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe desactivar un usuario', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: false,
        }

        vi.mocked(usuarioService.desactivar).mockResolvedValue(usuario as never)

        const { req, res, next } = crearMocks({}, { id: '1' })

        await usuarioController.desactivar(req, res, next)

        expect(usuarioService.desactivar).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 404 al desactivar un usuario inexistente', async () => {
        vi.mocked(usuarioService.desactivar).mockRejectedValue(
            Object.assign(new Error('Usuario no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await usuarioController.desactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe devolver 409 si el usuario ya está desactivado', async () => {
        vi.mocked(usuarioService.desactivar).mockRejectedValue(
            Object.assign(new Error('El usuario ya está desactivado'), {
                statusCode: 409,
            }),
        )

        const { req, res, next } = crearMocks({}, { id: '1' })

        await usuarioController.desactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
    })

    it('debe reactivar un usuario', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: true,
        }

        vi.mocked(usuarioService.reactivar).mockResolvedValue(usuario as never)

        const { req, res, next } = crearMocks({}, { id: '1' })

        await usuarioController.reactivar(req, res, next)

        expect(usuarioService.reactivar).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 404 al reactivar un usuario inexistente', async () => {
        vi.mocked(usuarioService.reactivar).mockRejectedValue(
            Object.assign(new Error('Usuario no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await usuarioController.reactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('debe devolver 409 si el usuario ya está activo', async () => {
        vi.mocked(usuarioService.reactivar).mockRejectedValue(
            Object.assign(new Error('El usuario ya está activo'), {
                statusCode: 409,
            }),
        )

        const { req, res, next } = crearMocks({}, { id: '1' })

        await usuarioController.reactivar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
    })
})
