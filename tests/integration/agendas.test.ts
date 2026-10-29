import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

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
import {
    agendaModel,
    profesionalModel,
    turnoModel,
} from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(id: number, rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN') {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

const agenda = {
    id: 10,
    profesionalId: 1,
    diaSemana: 'LUNES',
    horaInicio: '08:00',
    horaFin: '12:00',
    duracionTurno: 60,
    activo: true,
}

const profesional = {
    id: 1,
    usuarioId: 77,
    nombre: 'Ana',
    apellido: 'Gomez',
    matricula: 'MP-12345',
    especialidad: 'Kinesiología',
}

const datosCreacion = {
    profesionalId: 1,
    diaSemana: 'LUNES',
    horaInicio: '08:00',
    horaFin: '12:00',
    duracionTurno: 60,
}

const turnoFuturo = {
    id: 3,
    agendaId: 10,
    fecha: '2027-10-25',
    hora: '09:30',
    estado: 'CONFIRMADO',
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-de-prueba' as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('GET /api/agendas', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/agendas')

        expect(respuesta.status).toBe(401)
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la lista para un usuario autenticado', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([agenda] as never)

        const respuesta = await request(app)
            .get('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].id).toBe(10)
    })

    it('debe aplicar el filtro activo', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([] as never)

        const respuesta = await request(app)
            .get('/api/agendas?activo=false')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(agendaModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { activo: false } }),
        )
    })

    it('debe responder 400 ante un filtro inválido', async () => {
        const respuesta = await request(app)
            .get('/api/agendas?activo=si')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })
})

describe('GET /api/agendas/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/agendas/10')

        expect(respuesta.status).toBe(401)
        expect(agendaModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .get('/api/agendas/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(agendaModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/agendas/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 200 con la agenda', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agenda as never)

        const respuesta = await request(app)
            .get('/api/agendas/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(10)
    })
})

describe('GET /api/agendas/profesional/:profesionalId', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get(
            '/api/agendas/profesional/1',
        )

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .get('/api/agendas/profesional/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(profesionalModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/agendas/profesional/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
        expect(agendaModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 sin caer en la ruta /:id', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(agendaModel.findAll).mockResolvedValue([agenda] as never)

        const respuesta = await request(app)
            .get('/api/agendas/profesional/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(agendaModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { profesionalId: 1 },
            }),
        )
    })
})

describe('POST /api/agendas', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .post('/api/agendas')
            .send(datosCreacion)

        expect(respuesta.status).toBe(401)
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un PACIENTE', async () => {
        const respuesta = await request(app)
            .post('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(403)
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .post('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(403)
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si faltan campos obligatorios', async () => {
        const respuesta = await request(app)
            .post('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ profesionalId: 1 })

        expect(respuesta.status).toBe(400)
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(404)
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si hay superposición', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(agendaModel.findOne).mockResolvedValue(agenda as never)

        const respuesta = await request(app)
            .post('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(409)
        expect(agendaModel.create).not.toHaveBeenCalled()
    })

    it('debe crear la agenda y responder 201', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(agendaModel.findOne).mockResolvedValue(null)
        vi.mocked(agendaModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(agendaModel.findByPk).mockResolvedValue(agenda as never)

        const respuesta = await request(app)
            .post('/api/agendas')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(10)
        expect(agendaModel.create).toHaveBeenCalledWith(datosCreacion)
    })
})

describe('PUT /api/agendas/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .put('/api/agendas/10')
            .send({ horaFin: '11:00' })

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .put('/api/agendas/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ horaFin: '11:00' })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/agendas/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ horaFin: '11:00' })

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 409 si hay superposición', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue({
            ...agenda,
            save: vi.fn(),
        } as never)
        vi.mocked(agendaModel.findOne).mockResolvedValue({ id: 99 } as never)

        const respuesta = await request(app)
            .put('/api/agendas/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ horaInicio: '11:00' })

        expect(respuesta.status).toBe(409)
    })

    it('debe actualizar y responder 200', async () => {
        const guardado = vi.fn()
        const agendaActual = { ...agenda, save: guardado }
        const agendaActualizada = {
            ...agenda,
            horaFin: '11:00',
            save: guardado,
        }

        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agendaActual as never)
            .mockResolvedValueOnce(agendaActualizada as never)
        vi.mocked(agendaModel.findOne).mockResolvedValue(null)
        vi.mocked(turnoModel.findAll).mockResolvedValue([] as never)

        const respuesta = await request(app)
            .put('/api/agendas/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ horaFin: '11:00' })

        expect(respuesta.status).toBe(200)
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(respuesta.body.horaFin).toBe('11:00')
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .put('/api/agendas/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)
            .send({ horaFin: '11:00' })

        expect(respuesta.status).toBe(403)
    })
})

describe('PATCH /api/agendas/:id/desactivar', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).patch(
            '/api/agendas/10/desactivar',
        )

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .patch('/api/agendas/abc/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .patch('/api/agendas/999/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 409 si tiene turnos futuros', async () => {
        const guardado = vi.fn()

        vi.mocked(agendaModel.findByPk).mockResolvedValue({
            ...agenda,
            save: guardado,
        } as never)
        vi.mocked(turnoModel.findAll).mockResolvedValue([
            turnoFuturo,
        ] as never)

        const respuesta = await request(app)
            .patch('/api/agendas/10/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(409)
        expect(guardado).not.toHaveBeenCalled()
    })

    it('debe desactivar y responder 204 sin contenido', async () => {
        const guardado = vi.fn()
        const agendaActual = { ...agenda, save: guardado }
        const agendaDesactivada = {
            ...agenda,
            activo: false,
            save: guardado,
        }

        vi.mocked(agendaModel.findByPk)
            .mockResolvedValueOnce(agendaActual as never)
            .mockResolvedValueOnce(agendaDesactivada as never)
        vi.mocked(turnoModel.findAll).mockResolvedValue([] as never)

        const respuesta = await request(app)
            .patch('/api/agendas/10/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(204)
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(respuesta.text).toBe('')
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .patch('/api/agendas/10/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
    })
})
