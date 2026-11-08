import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

vi.mock('../../src/models/Usuario.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.usuarioModel }
})

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

vi.mock('../../src/config/database.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.databaseMock() }
})

vi.mock('../../src/services/storageService.js', () => ({
    subirArchivoEstudio: vi.fn().mockResolvedValue('estudios/5/archivo.pdf'),
    crearUrlFirmada: vi.fn().mockReturnValue({
        url: 'https://test.supabase.co/storage/v1/object/sign/estudios/5/archivo.pdf',
        expiresIn: 3600,
    }),
    eliminarArchivoEstudio: vi.fn().mockResolvedValue(undefined),
}))

import {
    autorizacionEstudioModel,
    estudioModel,
    profesionalModel,
} from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
})

describe('GET /api/autorizacionestudios', () => {
    it('debe listar las autorizaciones', async () => {
        vi.mocked(autorizacionEstudioModel.findAll).mockResolvedValue([
            { id: 1 },
            { id: 2 },
        ])

        const respuesta = await request(app).get('/api/autorizacionestudios')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([{ id: 1 }, { id: 2 }])
    })
})

describe('GET /api/autorizacionestudios/:id', () => {
    it('debe devolver la autorización con 200', async () => {
        vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue({
            id: 5,
        } as never)

        const respuesta = await request(app).get('/api/autorizacionestudios/5')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(5)
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app).get('/api/autorizacionestudios/99')

        expect(respuesta.status).toBe(404)
    })
})

describe('GET /api/autorizacionestudios/:id/vigencia', () => {
    it('debe devolver la vigencia con 200', async () => {
        vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue({
            id: 5,
            estaVigente: () => true,
            estaVencida: () => false,
        } as never)

        const respuesta = await request(app).get('/api/autorizacionestudios/5/vigencia')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual({
            id: 5,
            estaVigente: true,
            estaVencida: false,
        })
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app).get('/api/autorizacionestudios/99/vigencia')

        expect(respuesta.status).toBe(404)
    })
})

describe('POST /api/autorizacionestudios', () => {
    const datos = {
        estudioId: '1',
        profesionalId: '2',
        fechaAutorizacion: '2026-11-01',
        fechaVencimiento: '2026-12-01',
    }

    it('debe crear la autorización con 201', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue({ id: 1 } as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue({ id: 2 } as never)
        vi.mocked(autorizacionEstudioModel.findOne).mockResolvedValue(null)
        vi.mocked(autorizacionEstudioModel.create).mockResolvedValue({
            id: 10,
            ...datos,
            estado: 'DISPONIBLE',
        } as never)

        const respuesta = await request(app)
            .post('/api/autorizacionestudios')
            .send(datos)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(10)
        expect(respuesta.body.estado).toBe('DISPONIBLE')
    })

    it('debe responder 400 si la fecha de autorización es inválida', async () => {
        const respuesta = await request(app)
            .post('/api/autorizacionestudios')
            .send({ ...datos, fechaAutorizacion: 'invalida' })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 400 si el vencimiento es anterior a la autorización', async () => {
        const respuesta = await request(app)
            .post('/api/autorizacionestudios')
            .send({
                ...datos,
                fechaAutorizacion: '2026-12-01',
                fechaVencimiento: '2026-11-01',
            })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si el estudio no existe', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/autorizacionestudios')
            .send(datos)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue({ id: 1 } as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/autorizacionestudios')
            .send(datos)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 409 si ya existe una autorización vigente', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-07T10:00:00.000Z'))

        vi.mocked(estudioModel.findByPk).mockResolvedValue({ id: 1 } as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue({ id: 2 } as never)
        vi.mocked(autorizacionEstudioModel.findOne).mockResolvedValue({
            id: 1,
        } as never)

        const respuesta = await request(app)
            .post('/api/autorizacionestudios')
            .send(datos)

        expect(respuesta.status).toBe(409)
    })
})

describe('PATCH /api/autorizacionestudios/:id/revocar', () => {
    it('debe revocar la autorización con 200', async () => {
        const instancia = {
            id: 5,
            revocarProfesional: vi.fn(),
            save: vi.fn().mockResolvedValue({ id: 5, estado: 'VENCIDO' }),
        }
        vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(
            instancia as never,
        )

        const respuesta = await request(app)
            .patch('/api/autorizacionestudios/5/revocar')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.estado).toBe('VENCIDO')
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .patch('/api/autorizacionestudios/99/revocar')

        expect(respuesta.status).toBe(404)
    })
})