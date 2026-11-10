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
import jwt from 'jsonwebtoken'
import {
    estudioModel,
    pacienteModel,
    transactionMock,
    turnoModel,
    usuarioModel,
} from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(id: number, rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN') {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

const pacienteConUsuario = {
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
        email: 'paciente@test.com',
        rol: 'PACIENTE',
        activo: true,
    },
}

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

describe('GET /api/pacientes', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/pacientes')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .get('/api/pacientes')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
        expect(pacienteModel.findAll).not.toHaveBeenCalled()
    })

    it('debe listar pacientes a un administrador', async () => {
        vi.mocked(pacienteModel.findAll).mockResolvedValue([
            pacienteConUsuario,
        ] as never)

        const respuesta = await request(app)
            .get('/api/pacientes')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([pacienteConUsuario])
    })
})

describe('GET /api/pacientes/me', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/pacientes/me')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 404 si no tiene perfil de paciente', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/pacientes/me')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
        expect(pacienteModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 99 } }),
        )
    })

    it('debe devolver el perfil del paciente autenticado', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(
            pacienteConUsuario as never,
        )

        const respuesta = await request(app)
            .get('/api/pacientes/me')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(3)
    })
})

describe('PUT /api/pacientes/me', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .put('/api/pacientes/me')
            .send({ nombre: 'Ana Maria' })

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 404 si no tiene perfil de paciente', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/pacientes/me')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({ nombre: 'Ana Maria' })

        expect(respuesta.status).toBe(404)
        expect(pacienteModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar datos inválidos', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(
            pacienteConUsuario as never,
        )

        const respuesta = await request(app)
            .put('/api/pacientes/me')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)
            .send({ dni: '123' })

        expect(respuesta.status).toBe(400)
        expect(pacienteModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe actualizar el perfil del paciente autenticado', async () => {
        const paciente = {
            ...pacienteConUsuario,
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findOne).mockResolvedValue(
            pacienteConUsuario as never,
        )
        vi.mocked(pacienteModel.findByPk)
            .mockResolvedValueOnce(paciente as never)
            .mockResolvedValueOnce({
                ...pacienteConUsuario,
                nombre: 'Ana Maria',
            } as never)

        const respuesta = await request(app)
            .put('/api/pacientes/me')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)
            .send({ nombre: 'Ana Maria' })

        expect(respuesta.status).toBe(200)
        expect(paciente.save).toHaveBeenCalled()
        expect(respuesta.body.nombre).toBe('Ana Maria')
    })
})

describe('GET /api/pacientes/:id', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .get('/api/pacientes/abc')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(pacienteModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .get('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/pacientes/999')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe devolver el paciente', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(
            pacienteConUsuario as never,
        )

        const respuesta = await request(app)
            .get('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(3)
    })
})

describe('PUT /api/pacientes/:id', () => {
    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .put('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)
            .send({ nombre: 'Ana Maria' })

        expect(respuesta.status).toBe(403)
    })

    it('debe rechazar una actualización sin datos', async () => {
        const respuesta = await request(app)
            .put('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({})

        expect(respuesta.status).toBe(400)
        expect(pacienteModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/pacientes/999')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({ nombre: 'Ana Maria' })

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 409 si el DNI pertenece a otro paciente', async () => {
        const paciente = {
            ...pacienteConUsuario,
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk).mockResolvedValueOnce(
            paciente as never,
        )
        vi.mocked(pacienteModel.findOne).mockResolvedValue({
            id: 4,
            dni: '87654321',
        } as never)

        const respuesta = await request(app)
            .put('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({ dni: '87654321' })

        expect(respuesta.status).toBe(409)
        expect(paciente.save).not.toHaveBeenCalled()
    })

    it('debe actualizar el paciente', async () => {
        const paciente = {
            ...pacienteConUsuario,
            save: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk)
            .mockResolvedValueOnce(paciente as never)
            .mockResolvedValueOnce({
                ...pacienteConUsuario,
                telefono: '+5491198765432',
            } as never)

        const respuesta = await request(app)
            .put('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({ telefono: '+5491198765432' })

        expect(respuesta.status).toBe(200)
        expect(paciente.save).toHaveBeenCalled()
        expect(respuesta.body.telefono).toBe('+5491198765432')
    })
})

describe('DELETE /api/pacientes/:id', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .delete('/api/pacientes/abc')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(pacienteModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .delete('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(10, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .delete('/api/pacientes/999')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 409 si tiene registros asociados', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 3,
            usuarioId: 10,
            destroy: vi.fn(),
        } as never)
        vi.mocked(turnoModel.count).mockResolvedValue(1 as never)
        vi.mocked(estudioModel.count).mockResolvedValue(0 as never)

        const respuesta = await request(app)
            .delete('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(409)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('debe eliminar el paciente y su cuenta', async () => {
        const paciente = {
            id: 3,
            usuarioId: 10,
            destroy: vi.fn(),
        }

        vi.mocked(pacienteModel.findByPk).mockResolvedValue(paciente as never)
        vi.mocked(turnoModel.count).mockResolvedValue(0 as never)
        vi.mocked(estudioModel.count).mockResolvedValue(0 as never)

        const respuesta = await request(app)
            .delete('/api/pacientes/3')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(204)
        expect(paciente.destroy).toHaveBeenCalled()
        expect(usuarioModel.destroy).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 10 } }),
        )
    })
})
