import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

vi.mock('../../src/services/authService.js', () => ({
    iniciarSesion: vi.fn(),
}))

vi.mock('../../src/services/usuarioService.js', () => ({
    usuarioService: {
        buscarPorId: vi.fn(),
    },
}))

import { iniciarSesion } from '../../src/services/authService.js'
import { usuarioService } from '../../src/services/usuarioService.js'
import { login, obtenerPerfil } from '../../src/controllers/authController.js'

function crearMocks(
    body: object = {},
    usuario?: { id: number; email: string; rol: string },
) {
    const req = {
        body,
        usuario,
    } as unknown as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response

    return { req, res }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('authController', () => {
    it('debe iniciar sesión correctamente', async () => {
        vi.mocked(iniciarSesion).mockResolvedValue({
            token: 'token-de-prueba',
            usuario: {
                id: 1,
                email: 'usuario@example.com',
                rol: 'PACIENTE',
                activo: true,
            },
        } as never)

        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: '12345678',
        })

        await login(req, res)

        expect(iniciarSesion).toHaveBeenCalledWith(
            'usuario@example.com',
            '12345678',
        )

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
            token: 'token-de-prueba',
            usuario: {
                id: 1,
                email: 'usuario@example.com',
                rol: 'PACIENTE',
                activo: true,
            },
        })
    })

    it('debe rechazar datos faltantes', async () => {
        const { req, res } = crearMocks({
            email: 'usuario@example.com',
        })

        await expect(login(req, res)).rejects.toMatchObject({
            statusCode: 400,
            message: 'Email y contraseña son obligatorios',
        })

        expect(iniciarSesion).not.toHaveBeenCalled()
    })

    it('debe rechazar un email vacío', async () => {
        const { req, res } = crearMocks({
            email: '   ',
            password: '12345678',
        })

        await expect(login(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(iniciarSesion).not.toHaveBeenCalled()
    })

    it('debe rechazar campos que no sean cadenas', async () => {
        const { req, res } = crearMocks({
            email: 123,
            password: '12345678',
        })

        await expect(login(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(iniciarSesion).not.toHaveBeenCalled()
    })

    it('debe devolver 401 si las credenciales son incorrectas', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(
            Object.assign(new Error('Email o contraseña incorrectos'), {
                statusCode: 401,
            }),
        )

        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'incorrecta',
        })

        await expect(login(req, res)).rejects.toMatchObject({
            statusCode: 401,
        })
    })

    it('debe devolver 403 si el usuario está desactivado', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(
            Object.assign(new Error('El usuario está desactivado'), {
                statusCode: 403,
            }),
        )

        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: '12345678',
        })

        await expect(login(req, res)).rejects.toMatchObject({
            statusCode: 403,
        })
    })

    it('debe propagar un error inesperado', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(
            new Error('Error de conexión con la base de datos'),
        )

        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: '12345678',
        })

        await expect(login(req, res)).rejects.toThrow(
            'Error de conexión con la base de datos',
        )
    })

    it('debe devolver el perfil del usuario autenticado', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        }

        vi.mocked(usuarioService.buscarPorId).mockResolvedValue(
            usuario as never,
        )

        const { req, res } = crearMocks({}, usuario)

        await obtenerPerfil(req, res)

        expect(usuarioService.buscarPorId).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 401 si no hay usuario autenticado', async () => {
        const { req, res } = crearMocks()

        await expect(obtenerPerfil(req, res)).rejects.toMatchObject({
            statusCode: 401,
        })
    })

    it('debe devolver 404 si el perfil no existe', async () => {
        vi.mocked(usuarioService.buscarPorId).mockResolvedValue(null)

        const { req, res } = crearMocks(
            {},
            {
                id: 1,
                email: 'usuario@example.com',
                rol: 'PACIENTE',
            },
        )

        await expect(obtenerPerfil(req, res)).rejects.toMatchObject({
            statusCode: 404,
        })
    })
})
