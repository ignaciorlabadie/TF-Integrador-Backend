import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UniqueConstraintError } from 'sequelize'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

vi.mock('../../src/models/Usuario.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.usuarioModel }
})

vi.mock('../../src/config/database.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.databaseMock() }
})

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}))

import bcrypt from 'bcryptjs'
import {
    estudioModel,
    pacienteModel,
    transactionMock,
    turnoModel,
    usuarioModel,
} from '../helpers/mocksModelos.js'

import { pacienteService } from '../../src/services/pacienteService.js'

const datos = {
    email: 'paciente@example.com',
    password: 'Password123',
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    fechaNacimiento: '1990-05-14',
    direccion: 'Calle Falsa 123',
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never)
    vi.mocked(transactionMock).mockImplementation(
        async (callback: (transaction: unknown) => unknown) =>
            callback({ id: 'transaccion-mock' }),
    )
})

describe('pacienteService.crear', () => {
    it('debe crear el usuario y el perfil dentro de una misma transacción', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({
            id: 10,
        } as never)
        vi.mocked(pacienteModel.create).mockResolvedValue({
            id: 3,
        } as never)
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
            usuarioId: 10,
        } as never)

        const resultado = await pacienteService.crear(datos)

        expect(transactionMock).toHaveBeenCalledTimes(1)

        expect(usuarioModel.create).toHaveBeenCalledWith(
            {
                email: 'paciente@example.com',
                password: 'hash',
                rol: 'PACIENTE',
            },
            { transaction: { id: 'transaccion-mock' } },
        )

        expect(pacienteModel.create).toHaveBeenCalledWith(
            {
                usuarioId: 10,
                nombre: 'Ana',
                apellido: 'Gomez',
                dni: '12345678',
                telefono: '+5491112345678',
                fechaNacimiento: '1990-05-14',
                direccion: 'Calle Falsa 123',
            },
            { transaction: { id: 'transaccion-mock' } },
        )

        expect(resultado).toEqual({ id: 3, usuarioId: 10 })
    })

    it('debe normalizar el email al crear el paciente', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(pacienteModel.create).mockResolvedValue({ id: 3 } as never)
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
        } as never)

        await pacienteService.crear({
            ...datos,
            email: '  Paciente@Example.com  ',
        })

        expect(usuarioModel.findOne).toHaveBeenCalledWith({
            where: { email: 'paciente@example.com' },
            transaction: { id: 'transaccion-mock' },
        })
    })

    it('debe rechazar un email ya registrado sin crear el perfil', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'paciente@example.com',
        } as never)

        await expect(pacienteService.crear(datos)).rejects.toMatchObject({
            statusCode: 409,
            message: 'El email ya está registrado',
        })

        expect(usuarioModel.create).not.toHaveBeenCalled()
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un DNI ya registrado sin crear el usuario', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue({
            id: 3,
            dni: '12345678',
        } as never)

        await expect(pacienteService.crear(datos)).rejects.toMatchObject({
            statusCode: 409,
            message: 'El DNI ya está registrado',
        })

        expect(usuarioModel.create).not.toHaveBeenCalled()
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })

    it('debe devolver 409 si la base rechaza el DNI duplicado', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(pacienteModel.create).mockRejectedValue(
            new UniqueConstraintError({}),
        )

        await expect(pacienteService.crear(datos)).rejects.toMatchObject({
            statusCode: 409,
            message: 'El DNI ya está registrado',
        })
    })

    it('debe propagar un error inesperado al crear el perfil', async () => {
        const error = new Error('Error inesperado')

        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(pacienteModel.create).mockRejectedValue(error)

        await expect(pacienteService.crear(datos)).rejects.toBe(error)
    })
})

describe('pacienteService.listar', () => {
    it('debe listar pacientes con su usuario ordenados por id', async () => {
        vi.mocked(pacienteModel.findAll).mockResolvedValue([])

        const resultado = await pacienteService.listar()

        expect(resultado).toEqual([])
        expect(pacienteModel.findAll).toHaveBeenCalledWith({
            include: [
                {
                    model: expect.anything(),
                    as: 'usuario',
                    attributes: {
                        exclude: [
                            'password',
                            'resetPasswordTokenHash',
                            'resetPasswordExpiresAt',
                        ],
                    },
                },
            ],
            order: [['id', 'ASC']],
        })
    })
})

describe('pacienteService.buscarPorId', () => {
    it('debe buscar un paciente por ID con su usuario', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        const resultado = await pacienteService.buscarPorId(3)

        expect(resultado).toBeNull()
        expect(pacienteModel.findByPk).toHaveBeenCalledWith(3, {
            include: [
                {
                    model: expect.anything(),
                    as: 'usuario',
                    attributes: {
                        exclude: [
                            'password',
                            'resetPasswordTokenHash',
                            'resetPasswordExpiresAt',
                        ],
                    },
                },
            ],
        })
    })
})

describe('pacienteService.buscarPorUsuarioId', () => {
    it('debe buscar el perfil usando el usuarioId', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)

        const resultado = await pacienteService.buscarPorUsuarioId(10)

        expect(resultado).toBeNull()
        expect(pacienteModel.findOne).toHaveBeenCalledWith({
            where: { usuarioId: 10 },
            include: [
                {
                    model: expect.anything(),
                    as: 'usuario',
                    attributes: {
                        exclude: [
                            'password',
                            'resetPasswordTokenHash',
                            'resetPasswordExpiresAt',
                        ],
                    },
                },
            ],
        })
    })
})

describe('pacienteService.actualizar', () => {
    it('debe rechazar la actualización si el paciente no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        await expect(
            pacienteService.actualizar(999, { nombre: 'Ana' }),
        ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Paciente no encontrado',
        })
    })

    it('debe actualizar los campos enviados', async () => {
        const paciente = {
            id: 3,
            dni: '12345678',
            nombre: 'Ana',
            apellido: 'Gomez',
            telefono: '+5491112345678',
            fechaNacimiento: '1990-05-14',
            direccion: 'Calle Falsa 123',
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk)
            .mockResolvedValueOnce(paciente as never)
            .mockResolvedValueOnce({
                ...paciente,
                nombre: 'Ana Maria',
            } as never)

        const resultado = await pacienteService.actualizar(3, {
            nombre: 'Ana Maria',
            apellido: 'Gomez Diaz',
            telefono: '+5491198765432',
            fechaNacimiento: '1991-06-15',
            direccion: 'Nueva Direccion 456',
        })

        expect(paciente.nombre).toBe('Ana Maria')
        expect(paciente.apellido).toBe('Gomez Diaz')
        expect(paciente.telefono).toBe('+5491198765432')
        expect(paciente.fechaNacimiento).toBe('1991-06-15')
        expect(paciente.direccion).toBe('Nueva Direccion 456')
        expect(paciente.save).toHaveBeenCalled()
        expect(resultado).toBeDefined()
    })

    it('debe permitir mantener el mismo DNI sin consultar duplicados', async () => {
        const paciente = {
            id: 3,
            dni: '12345678',
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk)
            .mockResolvedValueOnce(paciente as never)
            .mockResolvedValueOnce(paciente as never)

        await pacienteService.actualizar(3, { dni: '12345678' })

        expect(pacienteModel.findOne).not.toHaveBeenCalled()
        expect(paciente.save).toHaveBeenCalled()
    })

    it('debe actualizar el DNI si no pertenece a otro paciente', async () => {
        const paciente = {
            id: 3,
            dni: '12345678',
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk)
            .mockResolvedValueOnce(paciente as never)
            .mockResolvedValueOnce(paciente as never)
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)

        await pacienteService.actualizar(3, { dni: '87654321' })

        expect(pacienteModel.findOne).toHaveBeenCalledWith({
            where: { dni: '87654321' },
        })
        expect(paciente.dni).toBe('87654321')
        expect(paciente.save).toHaveBeenCalled()
    })

    it('debe rechazar un DNI perteneciente a otro paciente', async () => {
        const paciente = {
            id: 3,
            dni: '12345678',
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk).mockResolvedValueOnce(
            paciente as never,
        )
        vi.mocked(pacienteModel.findOne).mockResolvedValue({
            id: 4,
            dni: '87654321',
        } as never)

        await expect(
            pacienteService.actualizar(3, { dni: '87654321' }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'El DNI ya está registrado',
        })

        expect(paciente.save).not.toHaveBeenCalled()
    })
})

describe('pacienteService.eliminar', () => {
    it('debe rechazar la eliminación si el paciente no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        await expect(pacienteService.eliminar(999)).rejects.toMatchObject({
            statusCode: 404,
            message: 'Paciente no encontrado',
        })
    })

    it('debe rechazar la eliminación si tiene turnos asociados', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
            usuarioId: 10,
            destroy: vi.fn(),
        } as never)
        vi.mocked(turnoModel.count).mockResolvedValue(1 as never)
        vi.mocked(estudioModel.count).mockResolvedValue(0 as never)

        await expect(pacienteService.eliminar(3)).rejects.toMatchObject({
            statusCode: 409,
        })

        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('debe rechazar la eliminación si tiene estudios asociados', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
            usuarioId: 10,
            destroy: vi.fn(),
        } as never)
        vi.mocked(turnoModel.count).mockResolvedValue(0 as never)
        vi.mocked(estudioModel.count).mockResolvedValue(2 as never)

        await expect(pacienteService.eliminar(3)).rejects.toMatchObject({
            statusCode: 409,
        })

        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('debe eliminar el perfil y la cuenta en una transacción', async () => {
        const paciente = {
            id: 3,
            usuarioId: 10,
            destroy: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk).mockResolvedValue(paciente as never)
        vi.mocked(turnoModel.count).mockResolvedValue(0 as never)
        vi.mocked(estudioModel.count).mockResolvedValue(0 as never)

        await pacienteService.eliminar(3)

        expect(transactionMock).toHaveBeenCalledTimes(1)
        expect(paciente.destroy).toHaveBeenCalledWith({
            transaction: { id: 'transaccion-mock' },
        })
        expect(usuarioModel.destroy).toHaveBeenCalledWith({
            where: { id: 10 },
            transaction: { id: 'transaccion-mock' },
        })
    })
})
