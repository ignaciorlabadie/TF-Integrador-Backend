import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'

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
import { espacioModel, tarifaEspaciosModel } from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

type Rol = 'PACIENTE' | 'PROFESIONAL' | 'ADMIN'

function tokenPara(id: number, rol: Rol) {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

function auth(rol: Rol) {
    return `Bearer ${tokenPara(1, rol)}`
}

const espacio = {
    id: 10,
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
    activo: true,
}

const tarifa = {
    id: 1,
    espacioId: 10,
    precioPorHora: '1500.00',
    fechaDesde: '2026-01-01',
    fechaHasta: null,
    espacio,
}

const tarifaActualizada = {
    ...tarifa,
    precioPorHora: '1600.00',
}

const tarifaVigenteExistente = {
    id: 99,
    espacioId: 10,
    precioPorHora: '1000.00',
    fechaDesde: '2025-01-01',
    fechaHasta: null,
}

const datosCreacion = {
    espacioId: 10,
    precioPorHora: '1500.50',
    fechaDesde: '2026-01-01',
    fechaHasta: null,
}

const datosActualizacion = {
    espacioId: 10,
    precioPorHora: '1600.00',
    fechaDesde: '2026-01-01',
    fechaHasta: null,
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-de-prueba' as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('GET /api/tarifas-espacio', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/tarifas-espacio')

        expect(respuesta.status).toBe(401)
        expect(tarifaEspaciosModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 403 para PACIENTE', async () => {
        const respuesta = await request(app)
            .get('/api/tarifas-espacio')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(403)
        expect(tarifaEspaciosModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la lista y aplicar filtros', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([
            tarifa,
        ] as never)

        const respuesta = await request(app)
            .get('/api/tarifas-espacio?espacioId=10&vigente=true')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].precioPorHora).toBe('1500.00')
        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    espacioId: 10,
                    fechaHasta: { [Op.is]: null },
                },
            }),
        )
    })

    it('debe responder 200 para PROFESIONAL', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)

        const respuesta = await request(app)
            .get('/api/tarifas-espacio')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(200)
    })

    it('debe responder 400 ante un filtro vigente inválido', async () => {
        const respuesta = await request(app)
            .get('/api/tarifas-espacio?vigente=quizas')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(400)
        expect(tarifaEspaciosModel.findAll).not.toHaveBeenCalled()
    })
})

describe('GET /api/tarifas-espacio/vigente', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get(
            '/api/tarifas-espacio/vigente?espacioId=10',
        )

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 para PACIENTE', async () => {
        const respuesta = await request(app)
            .get('/api/tarifas-espacio/vigente?espacioId=10')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 200 con la tarifa vigente', async () => {
        vi.mocked(tarifaEspaciosModel.findOne).mockResolvedValue(
            tarifa as never,
        )

        const respuesta = await request(app)
            .get('/api/tarifas-espacio/vigente?espacioId=10')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.precioPorHora).toBe('1500.00')
        expect(tarifaEspaciosModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    espacioId: 10,
                    fechaHasta: { [Op.is]: null },
                },
            }),
        )
    })

    it('debe responder 404 si no hay tarifa vigente', async () => {
        vi.mocked(tarifaEspaciosModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/tarifas-espacio/vigente?espacioId=10')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 400 si espacioId es inválido', async () => {
        const respuesta = await request(app)
            .get('/api/tarifas-espacio/vigente?espacioId=abc')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(400)
        expect(tarifaEspaciosModel.findOne).not.toHaveBeenCalled()
    })
})

describe('GET /api/tarifas-espacio/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/tarifas-espacio/1')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 para PACIENTE', async () => {
        const respuesta = await request(app)
            .get('/api/tarifas-espacio/1')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 200 con la tarifa y su espacio', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )

        const respuesta = await request(app)
            .get('/api/tarifas-espacio/1')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.espacio.id).toBe(10)
    })

    it('debe responder 404 si la tarifa no existe', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/tarifas-espacio/999')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 400 si el ID es inválido', async () => {
        const respuesta = await request(app)
            .get('/api/tarifas-espacio/abc')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(400)
    })
})

describe('POST /api/tarifas-espacio', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .send(datosCreacion)

        expect(respuesta.status).toBe(401)
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 para PROFESIONAL', async () => {
        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .set('Authorization', auth('PROFESIONAL'))
            .send(datosCreacion)

        expect(respuesta.status).toBe(403)
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 201 y normalizar el precio', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)
        vi.mocked(tarifaEspaciosModel.create).mockResolvedValue({
            id: 1,
        } as never)
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )

        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .set('Authorization', auth('ADMIN'))
            .send(datosCreacion)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.precioPorHora).toBe('1500.00')
        expect(tarifaEspaciosModel.create).toHaveBeenCalledWith({
            espacioId: 10,
            precioPorHora: '1500.50',
            fechaDesde: '2026-01-01',
            fechaHasta: null,
        })
    })

    it('debe responder 400 con el body vacío', async () => {
        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .set('Authorization', auth('ADMIN'))
            .send({})

        expect(respuesta.status).toBe(400)
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .set('Authorization', auth('ADMIN'))
            .send(datosCreacion)

        expect(respuesta.status).toBe(404)
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si el espacio está inactivo', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            activo: false,
        } as never)

        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .set('Authorization', auth('ADMIN'))
            .send(datosCreacion)

        expect(respuesta.status).toBe(409)
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si ya existe una tarifa vigente', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([
            tarifaVigenteExistente,
        ] as never)

        const respuesta = await request(app)
            .post('/api/tarifas-espacio')
            .set('Authorization', auth('ADMIN'))
            .send(datosCreacion)

        expect(respuesta.status).toBe(409)
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/tarifas-espacio/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .put('/api/tarifas-espacio/1')
            .send(datosActualizacion)

        expect(respuesta.status).toBe(401)
        expect(tarifaEspaciosModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 403 para PROFESIONAL', async () => {
        const respuesta = await request(app)
            .put('/api/tarifas-espacio/1')
            .set('Authorization', auth('PROFESIONAL'))
            .send(datosActualizacion)

        expect(respuesta.status).toBe(403)
        expect(tarifaEspaciosModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 200 actualizando sin chocar consigo misma', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk)
            .mockResolvedValueOnce(tarifa as never)
            .mockResolvedValueOnce(tarifaActualizada as never)
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([
            tarifa,
        ] as never)
        vi.mocked(tarifaEspaciosModel.update).mockResolvedValue([1] as never)

        const respuesta = await request(app)
            .put('/api/tarifas-espacio/1')
            .set('Authorization', auth('ADMIN'))
            .send(datosActualizacion)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.precioPorHora).toBe('1600.00')
        expect(tarifaEspaciosModel.update).toHaveBeenCalledWith(
            {
                espacioId: 10,
                precioPorHora: '1600.00',
                fechaDesde: '2026-01-01',
                fechaHasta: null,
            },
            { where: { id: 1 } },
        )
    })

    it('debe responder 400 con el body vacío', async () => {
        const respuesta = await request(app)
            .put('/api/tarifas-espacio/1')
            .set('Authorization', auth('ADMIN'))
            .send({})

        expect(respuesta.status).toBe(400)
        expect(tarifaEspaciosModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la tarifa no existe', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/tarifas-espacio/999')
            .set('Authorization', auth('ADMIN'))
            .send(datosActualizacion)

        expect(respuesta.status).toBe(404)
        expect(tarifaEspaciosModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 409 si se superpone con otra tarifa', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([
            tarifaVigenteExistente,
        ] as never)

        const respuesta = await request(app)
            .put('/api/tarifas-espacio/1')
            .set('Authorization', auth('ADMIN'))
            .send(datosActualizacion)

        expect(respuesta.status).toBe(409)
        expect(tarifaEspaciosModel.update).not.toHaveBeenCalled()
    })
})

describe('DELETE /api/tarifas-espacio/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).delete('/api/tarifas-espacio/1')

        expect(respuesta.status).toBe(401)
        expect(tarifaEspaciosModel.destroy).not.toHaveBeenCalled()
    })

    it('debe responder 403 para PROFESIONAL', async () => {
        const respuesta = await request(app)
            .delete('/api/tarifas-espacio/1')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(403)
        expect(tarifaEspaciosModel.destroy).not.toHaveBeenCalled()
    })

    it('debe responder 204 y permitir eliminar la vigente', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )
        vi.mocked(tarifaEspaciosModel.destroy).mockResolvedValue(1 as never)

        const respuesta = await request(app)
            .delete('/api/tarifas-espacio/1')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(204)
        expect(tarifaEspaciosModel.destroy).toHaveBeenCalledWith({
            where: { id: 1 },
        })
    })

    it('debe responder 404 si la tarifa no existe', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .delete('/api/tarifas-espacio/999')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(404)
        expect(tarifaEspaciosModel.destroy).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el ID es inválido', async () => {
        const respuesta = await request(app)
            .delete('/api/tarifas-espacio/abc')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(400)
        expect(tarifaEspaciosModel.destroy).not.toHaveBeenCalled()
    })
})
