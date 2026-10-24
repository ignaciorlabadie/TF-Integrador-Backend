import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// El módulo de configuración de Supabase lanza un error al importarse si no hay
// credenciales y NODE_ENV no es 'development'. En tests las proveemos aquí para
// no depender de un archivo .env local.
vi.hoisted(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-prueba'
})

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
import { profesionalModel, usuarioModel } from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(id: number, rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN') {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

const datosProfesional = {
    usuarioId: 10,
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    matricula: 'MP-12345',
    especialidad: 'Cardiología',
}

const perfil = {
    ...datosProfesional,
    id: 3,
    usuarioId: 77,
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-de-prueba' as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('GET /profesionales', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/profesionales')

        expect(respuesta.status).toBe(401)
        expect(profesionalModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la lista para cualquier usuario autenticado', async () => {
        vi.mocked(profesionalModel.findAll).mockResolvedValue([perfil] as never)

        const respuesta = await request(app)
            .get('/profesionales')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].id).toBe(3)
    })
})

describe('GET /profesionales/mi-perfil', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/profesionales/mi-perfil')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 200 con el perfil propio sin caer en /:id', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(perfil as never)

        const respuesta = await request(app)
            .get('/profesionales/mi-perfil')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(200)
        expect(profesionalModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 77 } }),
        )
        expect(profesionalModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la cuenta no tiene perfil profesional', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/profesionales/mi-perfil')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(404)
    })
})

describe('GET /profesionales/:id', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .get('/profesionales/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(profesionalModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/profesionales/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 200 con los datos del profesional', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(perfil as never)

        const respuesta = await request(app)
            .get('/profesionales/3')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(3)
    })
})

describe('POST /profesionales', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .post('/profesionales')
            .send(datosProfesional)

        expect(respuesta.status).toBe(401)
        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a usuarios sin rol ADMIN', async () => {
        const respuesta = await request(app)
            .post('/profesionales')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send(datosProfesional)

        expect(respuesta.status).toBe(403)
        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si faltan campos obligatorios', async () => {
        const respuesta = await request(app)
            .post('/profesionales')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ nombre: 'Ana' })

        expect(respuesta.status).toBe(400)
        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la cuenta asociada no existe', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/profesionales')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosProfesional)

        expect(respuesta.status).toBe(404)
        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si el DNI ya está registrado', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PROFESIONAL',
        } as never)
        vi.mocked(profesionalModel.findOne).mockResolvedValue({
            id: 5,
            dni: '12345678',
        } as never)

        const respuesta = await request(app)
            .post('/profesionales')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosProfesional)

        expect(respuesta.status).toBe(409)
        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe crear el perfil y responder 201 con datos públicos', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PROFESIONAL',
        } as never)
        vi.mocked(profesionalModel.findOne).mockResolvedValue(null)
        vi.mocked(profesionalModel.create).mockResolvedValue({
            id: 3,
        } as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue({
            ...perfil,
            usuario: {
                id: 10,
                email: 'profe@test.com',
                rol: 'PROFESIONAL',
                activo: true,
            },
        } as never)

        const respuesta = await request(app)
            .post('/profesionales')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosProfesional)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(3)
        expect(profesionalModel.create).toHaveBeenCalledWith(datosProfesional)
    })
})

describe('PUT /profesionales/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .put('/profesionales/3')
            .send({ nombre: 'Nuevo' })

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .put('/profesionales/abc')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send({ nombre: 'Nuevo' })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/profesionales/999')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send({ nombre: 'Nuevo' })

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 403 si un profesional intenta modificar un perfil ajeno', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue({
            ...perfil,
            save: vi.fn(),
        } as never)

        const respuesta = await request(app)
            .put('/profesionales/3')
            .set('Authorization', `Bearer ${tokenPara(999, 'PROFESIONAL')}`)
            .send({ nombre: 'Nuevo' })

        expect(respuesta.status).toBe(403)
        expect(profesionalModel.update).not.toHaveBeenCalled()
    })

    it('debe permitir modificar el propio perfil', async () => {
        const guardado = vi.fn()

        vi.mocked(profesionalModel.findByPk).mockResolvedValue({
            ...perfil,
            nombre: 'Nuevo',
            save: guardado,
        } as never)

        const respuesta = await request(app)
            .put('/profesionales/3')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send({ nombre: 'Nuevo' })

        expect(respuesta.status).toBe(200)
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(respuesta.body.nombre).toBe('Nuevo')
    })

    it('debe permitir a un ADMIN modificar un perfil ajeno', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue({
            ...perfil,
            save: vi.fn(),
        } as never)

        const respuesta = await request(app)
            .put('/profesionales/3')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ matricula: 'MP-99999' })

        expect(respuesta.status).toBe(200)
    })

    it('debe ignorar usuarioId en el payload', async () => {
        const guardado = vi.fn()

        vi.mocked(profesionalModel.findByPk).mockResolvedValue({
            ...perfil,
            nombre: 'Nuevo',
            save: guardado,
        } as never)

        const respuesta = await request(app)
            .put('/profesionales/3')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ nombre: 'Nuevo', usuarioId: 999 })

        expect(respuesta.status).toBe(200)
        expect(guardado).toHaveBeenCalledTimes(1)
    })
})
