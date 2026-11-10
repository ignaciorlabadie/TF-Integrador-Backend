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

vi.mock('../../src/services/emailService.js', () => ({
    enviarEmailRecuperacion: vi.fn(),
}))

import { usuarioModel } from '../helpers/mocksModelos.js'
import { enviarEmailRecuperacion } from '../../src/services/emailService.js'
import { hashearToken } from '../../src/utils/tokens.js'
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
    vi.stubEnv('FRONTEND_URL', 'https://turnos.example.com')
    vi.stubEnv('RESET_TOKEN_TTL_MINUTES', '30')
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('POST /api/auth/login', () => {
    it('debe iniciar sesión correctamente', async () => {
        const hash = await bcrypt.hash('12345678', 10)

        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            password: hash,
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app).post('/api/auth/login').send({
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

        const respuesta = await request(app).post('/api/auth/login').send({
            email: 'usuario@example.com',
            password: 'incorrecta',
        })

        expect(respuesta.status).toBe(401)
    })

    it('debe rechazar datos faltantes', async () => {
        const respuesta = await request(app)
            .post('/api/auth/login')
            .send({ email: 'usuario@example.com' })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.findOne).not.toHaveBeenCalled()
    })
})

describe('GET /api/auth/me', () => {
    it('debe devolver el perfil del usuario autenticado', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app)
            .get('/api/auth/me')
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
        const respuesta = await request(app).get('/api/auth/me')

        expect(respuesta.status).toBe(401)
    })
})

describe('POST /api/auth/forgot-password', () => {
    it('debe enviar el enlace si el usuario existe', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            password: 'hash',
            rol: 'PACIENTE',
            activo: true,
            resetPasswordTokenHash: null,
            resetPasswordExpiresAt: null,
            save: vi.fn().mockResolvedValue(undefined),
        }

        vi.mocked(usuarioModel.findOne).mockResolvedValue(usuario as never)

        const respuesta = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: ' Usuario@Example.com ' })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.mensaje).toBeTypeOf('string')
        expect(usuario.save).toHaveBeenCalled()
        expect(enviarEmailRecuperacion).toHaveBeenCalledWith(
            'usuario@example.com',
            expect.stringMatching(
                /^https:\/\/turnos\.example\.com\/reset-password\?token=[a-f0-9]{64}$/,
            ),
        )
    })

    it('debe responder igual si el email no existe', async () => {
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'noexiste@example.com' })

        expect(respuesta.status).toBe(200)
        expect(enviarEmailRecuperacion).not.toHaveBeenCalled()
    })

    it('debe rechazar un email inválido', async () => {
        const respuesta = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'no-es-un-email' })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.findOne).not.toHaveBeenCalled()
    })
})

describe('POST /api/auth/reset-password', () => {
    it('debe actualizar la contraseña con un token válido', async () => {
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            password: 'hash-viejo',
            rol: 'PACIENTE',
            activo: true,
            resetPasswordTokenHash: hashearToken('token-valido'),
            resetPasswordExpiresAt: new Date(Date.now() + 60_000),
            save: vi.fn().mockResolvedValue(undefined),
        }

        vi.mocked(usuarioModel.findOne).mockResolvedValue(usuario as never)

        const respuesta = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'token-valido', password: 'NuevaPassword123' })

        expect(respuesta.status).toBe(200)
        expect(usuario.password).not.toBe('hash-viejo')
        expect(usuario.resetPasswordTokenHash).toBeNull()
        expect(usuario.resetPasswordExpiresAt).toBeNull()
        expect(usuario.save).toHaveBeenCalled()
    })

    it('debe rechazar un token inválido o expirado', async () => {
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'token-invalido', password: 'NuevaPassword123' })

        expect(respuesta.status).toBe(400)
    })

    it('debe rechazar una contraseña inválida', async () => {
        const respuesta = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'token-valido', password: 'corta' })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.findOne).not.toHaveBeenCalled()
    })

    it('debe rechazar un token faltante', async () => {
        const respuesta = await request(app)
            .post('/api/auth/reset-password')
            .send({ password: 'NuevaPassword123' })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.findOne).not.toHaveBeenCalled()
    })

    it('debe rechazar un token expirado', async () => {
        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            password: 'hash-viejo',
            rol: 'PACIENTE',
            activo: true,
            resetPasswordTokenHash: hashearToken('token-expirado'),
            resetPasswordExpiresAt: new Date(Date.now() - 60_000),
            save: vi.fn(),
        } as never)

        const respuesta = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'token-expirado', password: 'NuevaPassword123' })

        expect(respuesta.status).toBe(400)
    })
})

describe('POST /api/auth/login (usuario desactivado)', () => {
    it('debe responder 403 si la cuenta está desactivada', async () => {
        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'usuario@example.com',
            password: 'hash',
            rol: 'PACIENTE',
            activo: false,
        } as never)

        const respuesta = await request(app).post('/api/auth/login').send({
            email: 'usuario@example.com',
            password: '12345678',
        })

        expect(respuesta.status).toBe(403)
        expect(respuesta.body).not.toHaveProperty('token')
    })
})

describe('GET /api/auth/me (validaciones)', () => {
    it('debe responder 401 con un token inválido', async () => {
        const respuesta = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer token-invalido')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 404 si la cuenta ya no existe', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${tokenPara(999, 'PACIENTE')}`)

        expect(respuesta.status).toBe(404)
    })
})

describe('POST /api/auth/forgot-password (validaciones)', () => {
    it('debe rechazar un email faltante', async () => {
        const respuesta = await request(app)
            .post('/api/auth/forgot-password')
            .send({})

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.findOne).not.toHaveBeenCalled()
    })

    it('debe responder 200 aunque falte FRONTEND_URL', async () => {
        vi.stubEnv('FRONTEND_URL', '')
        const usuario = {
            id: 1,
            email: 'usuario@example.com',
            password: 'hash',
            rol: 'PACIENTE',
            activo: true,
            resetPasswordTokenHash: null,
            resetPasswordExpiresAt: null,
            save: vi.fn().mockResolvedValue(undefined),
        }
        vi.mocked(usuarioModel.findOne).mockResolvedValue(usuario as never)
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        try {
            const respuesta = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'usuario@example.com' })

            expect(respuesta.status).toBe(200)
            expect(usuario.save).toHaveBeenCalled()
            expect(enviarEmailRecuperacion).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalled()
        } finally {
            consoleError.mockRestore()
        }
    })
})
