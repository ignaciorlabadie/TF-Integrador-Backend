import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
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

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}))

import bcrypt from 'bcryptjs'
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
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-de-prueba' as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('POST /usuarios', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).post('/api/usuarios').send({
            email: 'profesional@test.com',
            password: 'Password123',
            rol: 'PROFESIONAL',
        })

        expect(respuesta.status).toBe(401)
        expect(usuarioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)
            .send({
                email: 'profesional@test.com',
                password: 'Password123',
                rol: 'PROFESIONAL',
            })

        expect(respuesta.status).toBe(403)
        expect(usuarioModel.create).not.toHaveBeenCalled()
    })

    it('debe crear un profesional como administrador', async () => {
        vi.mocked(usuarioModel.findOne).mockResolvedValue(null)
        vi.mocked(usuarioModel.create).mockResolvedValue({
            id: 1,
            email: 'profesional@test.com',
            rol: 'PROFESIONAL',
            activo: true,
        } as never)

        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({
                email: 'profesional@test.com',
                password: 'Password123',
                rol: 'PROFESIONAL',
            })

        expect(respuesta.status).toBe(201)
        expect(respuesta.body).toEqual({
            id: 1,
            email: 'profesional@test.com',
            rol: 'PROFESIONAL',
            activo: true,
        })
    })

    it('debe rechazar el alta de un paciente', async () => {
        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({
                email: 'paciente@test.com',
                password: 'Password123',
                rol: 'PACIENTE',
            })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un rol inválido', async () => {
        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({
                email: 'usuario@test.com',
                password: 'Password123',
                rol: 'SUPERVISOR',
            })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un email inválido', async () => {
        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({
                email: 'no-es-un-email',
                password: 'Password123',
                rol: 'PROFESIONAL',
            })

        expect(respuesta.status).toBe(400)
        expect(usuarioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una contraseña corta', async () => {
        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({
                email: 'profesional@test.com',
                password: 'corta',
                rol: 'PROFESIONAL',
            })

        expect(respuesta.status).toBe(400)
    })

    it('debe rechazar un email ya registrado', async () => {
        vi.mocked(usuarioModel.findOne).mockResolvedValue({
            id: 1,
            email: 'profesional@test.com',
        } as never)

        const respuesta = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)
            .send({
                email: 'profesional@test.com',
                password: 'Password123',
                rol: 'PROFESIONAL',
            })

        expect(respuesta.status).toBe(409)
        expect(usuarioModel.create).not.toHaveBeenCalled()
    })
})

describe('GET /usuarios', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/usuarios')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
    })

    it('debe listar usuarios a un administrador', async () => {
        vi.mocked(usuarioModel.findAll).mockResolvedValue([])

        const respuesta = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([])
    })
})

describe('GET /api/usuarios/:id', () => {
    it('debe permitir al propio usuario ver su perfil', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 1,
            email: 'paciente@test.com',
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app)
            .get('/api/usuarios/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(1)
    })

    it('debe impedir que un paciente vea a otro usuario', async () => {
        const respuesta = await request(app)
            .get('/api/usuarios/2')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
        expect(usuarioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe permitir a un administrador ver cualquier usuario', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 2,
            email: 'otro@test.com',
            rol: 'PACIENTE',
            activo: true,
        } as never)

        const respuesta = await request(app)
            .get('/api/usuarios/2')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
    })
})

describe('PUT /api/usuarios/:id', () => {
    it('debe permitir al propio usuario cambiar su contraseña', async () => {
        const usuario = {
            id: 1,
            email: 'paciente@test.com',
            password: 'hash-viejo',
            rol: 'PACIENTE',
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(usuarioModel.findByPk).mockResolvedValue(usuario as never)

        const respuesta = await request(app)
            .put('/api/usuarios/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)
            .send({ password: 'nueva-clave-123' })

        expect(respuesta.status).toBe(200)
        expect(usuario.save).toHaveBeenCalled()
    })

    it('debe impedir que un usuario no admin modifique el campo activo', async () => {
        const respuesta = await request(app)
            .put('/api/usuarios/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)
            .send({ activo: false })

        expect(respuesta.status).toBe(403)
    })
})

describe('PATCH /api/usuarios/:id/desactivar', () => {
    it('debe desactivar un usuario como administrador', async () => {
        const usuario = {
            id: 1,
            email: 'paciente@test.com',
            activo: true,
            save: vi.fn(),
        }

        vi.mocked(usuarioModel.findByPk).mockResolvedValue(usuario as never)

        const respuesta = await request(app)
            .patch('/api/usuarios/1/desactivar')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(usuario.save).toHaveBeenCalled()
    })
})

describe('PATCH /api/usuarios/:id/reactivar', () => {
    it('debe reactivar un usuario como administrador', async () => {
        const usuario = {
            id: 1,
            email: 'paciente@test.com',
            activo: false,
            save: vi.fn(),
        }

        vi.mocked(usuarioModel.findByPk).mockResolvedValue(usuario as never)

        const respuesta = await request(app)
            .patch('/api/usuarios/1/reactivar')
            .set('Authorization', `Bearer ${tokenPara(99, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(usuario.save).toHaveBeenCalled()
    })
})

describe('GET /api/roles', () => {
    it('debe listar los roles disponibles', async () => {
        const respuesta = await request(app).get('/api/roles')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual(['PACIENTE', 'PROFESIONAL', 'ADMIN'])
    })
})
