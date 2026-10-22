import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    pacienteModel,
    transactionMock,
    usuarioModel,
} from '../helpers/mocksModelos.js'

import { crearPaciente } from '../../src/services/pacienteService.js'

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

describe('pacienteService.crearPaciente', () => {
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

        const resultado = await crearPaciente(datos)

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

        await crearPaciente({ ...datos, email: '  Paciente@Example.com  ' })

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

        await expect(crearPaciente(datos)).rejects.toMatchObject({
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

        await expect(crearPaciente(datos)).rejects.toMatchObject({
            statusCode: 409,
            message: 'El DNI ya está registrado',
        })

        expect(usuarioModel.create).not.toHaveBeenCalled()
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })
})
