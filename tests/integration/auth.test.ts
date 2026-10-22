import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

import { usuarioModel } from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(id: number, rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN') {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('POST /auth/login', () => {
    it('debe iniciar sesión correctamente', async () => {
        const hash = await bcrypt.hash('12345678', 10)

        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            password: hash,
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app).post('/auth/login').send({
            email: 'usuario@example.com',
            password: '12345678',
        })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.token).toBeTypeOf('string')
        expect(respuesta.body.usuario).toEqual({
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        })
    })

    it('debe rechazar credenciales incorrectas', async () => {
        const hash = await bcrypt.hash('12345678', 10)

        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            password: hash,
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app).post('/auth/login').send({
            email: 'usuario@example.com',
            password: 'incorrecta',
        })

        expect(respuesta.status).toBe(401)
    })

    it('debe rechazar datos faltantes', async () => {
        const respuesta = await request(app)
            .post('/auth/login')
            .send({ email: 'usuario@example.com' })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.findOne).not.toHaveBeenCalled()
    })
})

describe('GET /auth/me', () => {
    it('debe devolver el perfil del usuario autenticado', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual({
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        })
    })

    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/auth/me')

        expect(respuesta.status).toBe(401)
    })
})
