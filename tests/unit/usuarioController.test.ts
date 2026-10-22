import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

vi.mock('../../src/services/usuarioService.js', () => ({
    listarUsuarios: vi.fn(),
    buscarUsuarioPorId: vi.fn(),
    buscarUsuarioPorEmail: vi.fn(),
    crearUsuario: vi.fn(),
    actualizarUsuario: vi.fn(),
    desactivarUsuario: vi.fn(),
    reactivarUsuario: vi.fn(),
}))

import {
    listarUsuarios,
    buscarUsuarioPorId,
    buscarUsuarioPorEmail,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
} from '../../src/services/usuarioService.js'

import {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    obtenerUsuarioPorEmail,
    crearUsuarioController,
    modificarUsuario,
    desactivarUsuarioController,
    reactivarUsuarioController,
} from '../../src/controllers/usuarioController.js'

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

    return { req, res }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('usuarioController', () => {
    it('debe listar usuarios', async () => {
        vi.mocked(listarUsuarios).mockResolvedValue([])

        const { req, res } = crearMocks()

        await obtenerUsuarios(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([])
    })

    it('debe propagar el error si falla el listado', async () => {
        vi.mocked(listarUsuarios).mockRejectedValue(new Error('Error de DB'))

        const { req, res } = crearMocks()

        await expect(obtenerUsuarios(req, res)).rejects.toThrow('Error de DB')
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe buscar un usuario por ID', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        }

        vi.mocked(buscarUsuarioPorId).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks({}, { id: '1' })

        await obtenerUsuarioPorId(req, res)

        expect(buscarUsuarioPorId).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe rechazar un ID inválido', async () => {
        const { req, res } = crearMocks({}, { id: 'abc' })

        await expect(obtenerUsuarioPorId(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(buscarUsuarioPorId).not.toHaveBeenCalled()
    })

    it('debe devolver 404 si el usuario no existe', async () => {
        vi.mocked(buscarUsuarioPorId).mockResolvedValue(null)

        const { req, res } = crearMocks({}, { id: '999' })

        await expect(obtenerUsuarioPorId(req, res)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('debe buscar un usuario por email', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        }

        vi.mocked(buscarUsuarioPorEmail).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks(
            {},
            {
                email: 'usuario@example.com',
            },
        )

        await obtenerUsuarioPorEmail(req, res)

        expect(buscarUsuarioPorEmail).toHaveBeenCalledWith(
            'usuario@example.com',
        )
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 404 si no encuentra el email', async () => {
        vi.mocked(buscarUsuarioPorEmail).mockResolvedValue(null)

        const { req, res } = crearMocks(
            {},
            {
                email: 'inexistente@example.com',
            },
        )

        await expect(obtenerUsuarioPorEmail(req, res)).rejects.toMatchObject({
            statusCode: 404,
        })
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

            vi.mocked(crearUsuario).mockResolvedValue(usuario as never)

            const { req, res } = crearMocks({
                email: 'usuario@example.com',
                password: 'Password123',
                rol,
            })

            await crearUsuarioController(req, res)

            expect(crearUsuario).toHaveBeenCalledWith({
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

        vi.mocked(crearUsuario).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: false,
        })

        await crearUsuarioController(req, res)

        expect(crearUsuario).toHaveBeenCalledWith({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: false,
        })
    })

    it('debe rechazar el alta de un paciente', async () => {
        const { req, res } = crearMocks({
            email: 'paciente@example.com',
            password: 'Password123',
            rol: 'PACIENTE',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
            message: MENSAJES.ALTA_PACIENTE_EN_PACIENTES,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar un rol inválido', async () => {
        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'SUPERVISOR',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar un email inválido al crear', async () => {
        const { req, res } = crearMocks({
            email: 'no-es-un-email',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar una contraseña corta al crear', async () => {
        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'corta',
            rol: 'PROFESIONAL',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar una contraseña más larga que el límite de bcrypt', async () => {
        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'a'.repeat(73),
            rol: 'PROFESIONAL',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar un campo activo que no sea booleano', async () => {
        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: 'sí',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar datos inválidos al crear', async () => {
        const { req, res } = crearMocks({
            email: '',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(crearUsuario).not.toHaveBeenCalled()
    })

    it('debe devolver 409 si el email ya está registrado', async () => {
        vi.mocked(crearUsuario).mockRejectedValue(
            Object.assign(new Error('El email ya está registrado'), {
                statusCode: 409,
            }),
        )

        const { req, res } = crearMocks({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        await expect(crearUsuarioController(req, res)).rejects.toMatchObject({
            statusCode: 409,
        })
    })

    it('debe actualizar un usuario como administrador', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: false,
        }

        vi.mocked(actualizarUsuario).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks(
            { activo: false },
            { id: '1' },
            { id: 99, email: 'admin@test.com', rol: 'ADMIN' },
        )

        await modificarUsuario(req, res)

        expect(actualizarUsuario).toHaveBeenCalledWith(1, {
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

        vi.mocked(actualizarUsuario).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks(
            { password: '12345678' },
            { id: '1' },
            { id: 1, email: 'usuario@example.com', rol: 'PACIENTE' },
        )

        await modificarUsuario(req, res)

        expect(actualizarUsuario).toHaveBeenCalledWith(1, {
            email: undefined,
            activo: undefined,
            password: '12345678',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe impedir que un usuario no admin modifique el campo activo', async () => {
        const { req, res } = crearMocks(
            { activo: false },
            { id: '1' },
            { id: 1, email: 'usuario@example.com', rol: 'PACIENTE' },
        )

        await expect(modificarUsuario(req, res)).rejects.toMatchObject({
            statusCode: 403,
        })

        expect(actualizarUsuario).not.toHaveBeenCalled()
    })

    it('debe rechazar una actualización sin datos', async () => {
        const { req, res } = crearMocks({}, { id: '1' })

        await expect(modificarUsuario(req, res)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(actualizarUsuario).not.toHaveBeenCalled()
    })

    it('debe devolver 404 al actualizar un usuario inexistente', async () => {
        vi.mocked(actualizarUsuario).mockRejectedValue(
            Object.assign(new Error('Usuario no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res } = crearMocks(
            { activo: false },
            { id: '999' },
            { id: 99, email: 'admin@test.com', rol: 'ADMIN' },
        )

        await expect(modificarUsuario(req, res)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('debe desactivar un usuario', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: false,
        }

        vi.mocked(desactivarUsuario).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks({}, { id: '1' })

        await desactivarUsuarioController(req, res)

        expect(desactivarUsuario).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 404 al desactivar un usuario inexistente', async () => {
        vi.mocked(desactivarUsuario).mockRejectedValue(
            Object.assign(new Error('Usuario no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res } = crearMocks({}, { id: '999' })

        await expect(
            desactivarUsuarioController(req, res),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('debe devolver 409 si el usuario ya está desactivado', async () => {
        vi.mocked(desactivarUsuario).mockRejectedValue(
            Object.assign(new Error('El usuario ya está desactivado'), {
                statusCode: 409,
            }),
        )

        const { req, res } = crearMocks({}, { id: '1' })

        await expect(
            desactivarUsuarioController(req, res),
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('debe reactivar un usuario', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: true,
        }

        vi.mocked(reactivarUsuario).mockResolvedValue(usuario as never)

        const { req, res } = crearMocks({}, { id: '1' })

        await reactivarUsuarioController(req, res)

        expect(reactivarUsuario).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(usuario)
    })

    it('debe devolver 404 al reactivar un usuario inexistente', async () => {
        vi.mocked(reactivarUsuario).mockRejectedValue(
            Object.assign(new Error('Usuario no encontrado'), {
                statusCode: 404,
            }),
        )

        const { req, res } = crearMocks({}, { id: '999' })

        await expect(
            reactivarUsuarioController(req, res),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('debe devolver 409 si el usuario ya está activo', async () => {
        vi.mocked(reactivarUsuario).mockRejectedValue(
            Object.assign(new Error('El usuario ya está activo'), {
                statusCode: 409,
            }),
        )

        const { req, res } = crearMocks({}, { id: '1' })

        await expect(
            reactivarUsuarioController(req, res),
        ).rejects.toMatchObject({ statusCode: 409 })
    })
})
