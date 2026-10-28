import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UniqueConstraintError } from 'sequelize'
import type { Transaction } from 'sequelize'

vi.mock('../../src/models/Usuario.js', () => ({
    default: {
        findAll: vi.fn(),
        findByPk: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
    },
}))

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
    },
}))

import Usuario from '../../src/models/Usuario.js'
import bcrypt from 'bcryptjs'

import { usuarioService } from '../../src/services/usuarioService.js'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('usuarioService', () => {
    it('debe listar usuarios', async () => {
        vi.mocked(Usuario.findAll).mockResolvedValue([])

        const resultado = await usuarioService.listar()

        expect(resultado).toEqual([])
        expect(Usuario.findAll).toHaveBeenCalledWith({
            attributes: { exclude: ['password'] },
        })
    })

    it('debe buscar un usuario por ID', async () => {
        vi.mocked(Usuario.findByPk).mockResolvedValue(null)

        const resultado = await usuarioService.buscarPorId(1)

        expect(resultado).toBeNull()
    })

    it('debe buscar un usuario por email normalizado', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)

        const resultado = await usuarioService.buscarPorEmail(
            ' Usuario@Example.com ',
        )

        expect(resultado).toBeNull()
        expect(Usuario.findOne).toHaveBeenCalledWith({
            where: { email: 'usuario@example.com' },
            attributes: { exclude: ['password'] },
        })
    })

    it('debe crear un usuario sin devolver la contraseña', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)
        vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never)
        vi.mocked(Usuario.create).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            password: 'hash',
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const resultado = await usuarioService.crear({
            email: 'usuario@example.com',
            password: '12345678',
            rol: 'PACIENTE',
        })

        expect(resultado).toEqual({
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        })

        expect(Usuario.create).toHaveBeenCalledWith(
            {
                email: 'usuario@example.com',
                password: 'hash',
                rol: 'PACIENTE',
            },
            {},
        )

        expect(bcrypt.hash).toHaveBeenCalledWith('12345678', 10)
    })

    it('debe rechazar un email ya registrado al crear', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
        } as never)

        await expect(
            usuarioService.crear({
                email: 'usuario@example.com',
                password: '12345678',
                rol: 'PACIENTE',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'El email ya está registrado',
        })

        expect(Usuario.create).not.toHaveBeenCalled()
    })

    it('debe normalizar el email al crear un usuario', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)
        vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never)
        vi.mocked(Usuario.create).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        } as never)

        await usuarioService.crear({
            email: '  Usuario@Example.com  ',
            password: '12345678',
            rol: 'PACIENTE',
        })

        expect(Usuario.findOne).toHaveBeenCalledWith({
            where: { email: 'usuario@example.com' },
        })
    })

    it('debe crear una cuenta dentro de la transacción recibida', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)
        vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never)
        vi.mocked(Usuario.create).mockResolvedValue({
            id: 7,
            email: 'usuario@example.com',
            password: 'hash',
            rol: 'PROFESIONAL',
            activo: true,
        } as never)

        const transaction = { id: 'tx-1' } as unknown as Transaction

        const cuenta = await usuarioService.crearCuenta(
            {
                email: '  Usuario@Example.com  ',
                password: 'Password123',
                rol: 'PROFESIONAL',
            },
            { transaction },
        )

        expect(cuenta.id).toBe(7)

        expect(Usuario.findOne).toHaveBeenCalledWith({
            where: { email: 'usuario@example.com' },
            transaction,
        })

        expect(Usuario.create).toHaveBeenCalledWith(
            {
                email: 'usuario@example.com',
                password: 'hash',
                rol: 'PROFESIONAL',
            },
            { transaction },
        )
    })

    it('debe crear la cuenta desactivada cuando se solicita', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)
        vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never)
        vi.mocked(Usuario.create).mockResolvedValue({
            id: 7,
            email: 'usuario@example.com',
            password: 'hash',
            rol: 'PROFESIONAL',
            activo: false,
        } as never)

        await usuarioService.crearCuenta({
            email: 'usuario@example.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
            activo: false,
        })

        expect(Usuario.create).toHaveBeenCalledWith(
            {
                email: 'usuario@example.com',
                password: 'hash',
                rol: 'PROFESIONAL',
                activo: false,
            },
            {},
        )
    })

    it('debe devolver 409 si la base rechaza el email duplicado', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)
        vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never)
        vi.mocked(Usuario.create).mockRejectedValue(
            new UniqueConstraintError({}),
        )

        await expect(
            usuarioService.crearCuenta({
                email: 'usuario@example.com',
                password: 'Password123',
                rol: 'PROFESIONAL',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'El email ya está registrado',
        })
    })

    it('debe actualizar un usuario', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk)
            .mockResolvedValueOnce(usuario as never)
            .mockResolvedValueOnce(usuario as never)

        const resultado = await usuarioService.actualizar(1, {
            activo: false,
        })

        expect(usuario.activo).toBe(false)
        expect(usuario.save).toHaveBeenCalled()
        expect(resultado).toBeDefined()
    })

    it('debe hashear la contraseña al actualizarla', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            password: 'hash-viejo',
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk)
            .mockResolvedValueOnce(usuario as never)
            .mockResolvedValueOnce(usuario as never)

        vi.mocked(bcrypt.hash).mockResolvedValue('hash-nuevo' as never)

        await usuarioService.actualizar(1, { password: '12345678' })

        expect(bcrypt.hash).toHaveBeenCalledWith('12345678', 10)
        expect(usuario.password).toBe('hash-nuevo')
        expect(usuario.save).toHaveBeenCalled()
    })

    it('debe rechazar la actualización si el usuario no existe', async () => {
        vi.mocked(Usuario.findByPk).mockResolvedValue(null)

        await expect(
            usuarioService.actualizar(999, { activo: false }),
        ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Usuario no encontrado',
        })
    })

    it('debe rechazar un email perteneciente a otro usuario', async () => {
        const usuario = {
            id: 1,
            email: 'actual@example.com',
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk).mockResolvedValueOnce(usuario as never)

        vi.mocked(Usuario.findOne).mockResolvedValue({
            id: 2,
            email: 'otro@example.com',
        } as never)

        await expect(
            usuarioService.actualizar(1, {
                email: 'otro@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'El email ya está registrado',
        })

        expect(usuario.save).not.toHaveBeenCalled()
    })

    it('debe desactivar un usuario', async () => {
        const usuario = {
            id: 1,
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk)
            .mockResolvedValueOnce(usuario as never)
            .mockResolvedValueOnce(usuario as never)

        const resultado = await usuarioService.desactivar(1)

        expect(usuario.activo).toBe(false)
        expect(usuario.save).toHaveBeenCalled()
        expect(resultado).toBeDefined()
    })

    it('debe rechazar la desactivación si el usuario no existe', async () => {
        vi.mocked(Usuario.findByPk).mockResolvedValue(null)

        await expect(usuarioService.desactivar(999)).rejects.toMatchObject({
            statusCode: 404,
            message: 'Usuario no encontrado',
        })
    })

    it('debe rechazar la desactivación de un usuario ya desactivado', async () => {
        const usuario = {
            id: 1,
            activo: false,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk).mockResolvedValue(usuario as never)

        await expect(usuarioService.desactivar(1)).rejects.toMatchObject({
            statusCode: 409,
            message: 'El usuario ya está desactivado',
        })

        expect(usuario.save).not.toHaveBeenCalled()
    })

    it('debe reactivar un usuario', async () => {
        const usuario = {
            id: 1,
            activo: false,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk)
            .mockResolvedValueOnce(usuario as never)
            .mockResolvedValueOnce(usuario as never)

        const resultado = await usuarioService.reactivar(1)

        expect(usuario.activo).toBe(true)
        expect(usuario.save).toHaveBeenCalled()
        expect(resultado).toBeDefined()
    })

    it('debe rechazar la reactivación si el usuario no existe', async () => {
        vi.mocked(Usuario.findByPk).mockResolvedValue(null)

        await expect(usuarioService.reactivar(999)).rejects.toMatchObject({
            statusCode: 404,
            message: 'Usuario no encontrado',
        })
    })

    it('debe rechazar la reactivación de un usuario ya activo', async () => {
        const usuario = {
            id: 1,
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(Usuario.findByPk).mockResolvedValue(usuario as never)

        await expect(usuarioService.reactivar(1)).rejects.toMatchObject({
            statusCode: 409,
            message: 'El usuario ya está activo',
        })

        expect(usuario.save).not.toHaveBeenCalled()
    })
})
