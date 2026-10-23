import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

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
import app from '../../src/app.js'

const datosPaciente = {
    email: 'paciente@test.com',
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
    vi.stubEnv('JWT_SECRET', 'secreto-de-prueba')
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-de-prueba' as never)
    vi.mocked(transactionMock).mockImplementation(
        async (callback: (transaction: unknown) => unknown) =>
            callback({ id: 'transaccion-mock' }),
    )
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('POST /api/pacientes', () => {
    it('debe registrar un paciente creando usuario y perfil en una transacción', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({
            id: 10,
            email: 'paciente@test.com',
            rol: 'PACIENTE',
            activo: true,
        } as never)
        vi.mocked(pacienteModel.create).mockResolvedValue({
            id: 3,
            usuarioId: 10,
            ...datosPaciente,
        } as never)
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
            usuarioId: 10,
            ...datosPaciente,
            usuario: {
                id: 10,
                email: 'paciente@test.com',
                rol: 'PACIENTE',
                activo: true,
            },
        } as never)

        const respuesta = await request(app)
            .post('/api/pacientes')
            .send(datosPaciente)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(3)
        expect(respuesta.body.usuario.email).toBe('paciente@test.com')

        expect(usuarioModel.create).toHaveBeenCalledWith(
            {
                email: 'paciente@test.com',
                password: 'hash-de-prueba',
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
    })

    it('debe normalizar el email al registrar', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(pacienteModel.create).mockResolvedValue({ id: 3 } as never)
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
        } as never)

        await request(app)
            .post('/api/pacientes')
            .send({ ...datosPaciente, email: '  Paciente@Test.com  ' })

        expect(usuarioModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'paciente@test.com' }),
            expect.anything(),
        )
    })

    it('debe rechazar un email inválido', async () => {
        const respuesta = await request(app)
            .post('/api/pacientes')
            .send({ ...datosPaciente, email: 'no-es-un-email' })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.create).not.toHaveBeenCalled()
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un DNI inválido', async () => {
        const respuesta = await request(app)
            .post('/api/pacientes')
            .send({ ...datosPaciente, dni: '123' })

        expect(respuesta.status).toBe(400)
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una fecha de nacimiento futura', async () => {
        const respuesta = await request(app)
            .post('/api/pacientes')
            .send({ ...datosPaciente, fechaNacimiento: '2099-01-01' })

        expect(respuesta.status).toBe(400)
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un email ya registrado', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'paciente@test.com',
        } as never)

        const respuesta = await request(app)
            .post('/api/pacientes')
            .send(datosPaciente)

        expect(respuesta.status).toBe(409)
        expect(usuarioModel.create).not.toHaveBeenCalled()
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un DNI ya registrado', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue({
            id: 3,
            dni: '12345678',
        } as never)

        const respuesta = await request(app)
            .post('/api/pacientes')
            .send(datosPaciente)

        expect(respuesta.status).toBe(409)
        expect(usuarioModel.create).not.toHaveBeenCalled()
        expect(pacienteModel.create).not.toHaveBeenCalled()
    })
})
