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
import {
    asignacionEspacioModel,
    espacioModel,
    tarifaEspaciosModel,
} from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(id: number, rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN') {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

const espacio = {
    id: 10,
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
    activo: true,
}

const datosCreacion = {
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-de-prueba' as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('GET /api/espacios', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/espacios')

        expect(respuesta.status).toBe(401)
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la lista para un usuario autenticado', async () => {
        vi.mocked(espacioModel.findAll).mockResolvedValue([espacio] as never)

        const respuesta = await request(app)
            .get('/api/espacios')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].id).toBe(10)
    })

    it('debe aplicar el filtro activo', async () => {
        vi.mocked(espacioModel.findAll).mockResolvedValue([] as never)

        const respuesta = await request(app)
            .get('/api/espacios?activo=false')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(espacioModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { activo: false } }),
        )
    })

    it('debe responder 400 ante un filtro inválido', async () => {
        const respuesta = await request(app)
            .get('/api/espacios?tipo=OTRO')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })
})

describe('GET /api/espacios/ocupacion', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/espacios/ocupacion')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un PACIENTE', async () => {
        const respuesta = await request(app)
            .get('/api/espacios/ocupacion?start=2026-10-05&end=2026-10-11')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 400 si faltan los parámetros', async () => {
        const respuesta = await request(app)
            .get('/api/espacios/ocupacion')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 sin caer en la ruta /:id', async () => {
        vi.mocked(espacioModel.findAll).mockResolvedValue([espacio] as never)

        const respuesta = await request(app)
            .get('/api/espacios/ocupacion?start=2026-10-05&end=2026-10-11')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.data).toHaveLength(1)
        expect(respuesta.body.data[0].id).toBe(10)
    })
})

describe('GET /api/espacios/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/espacios/10')

        expect(respuesta.status).toBe(401)
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .get('/api/espacios/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/espacios/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 200 con el espacio', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)

        const respuesta = await request(app)
            .get('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(10)
    })
})

describe('POST /api/espacios', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .post('/api/espacios')
            .send(datosCreacion)

        expect(respuesta.status).toBe(401)
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .post('/api/espacios')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(403)
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un PACIENTE', async () => {
        const respuesta = await request(app)
            .post('/api/espacios')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(403)
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si faltan campos obligatorios', async () => {
        const respuesta = await request(app)
            .post('/api/espacios')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ nombre: 'Sala 1' })

        expect(respuesta.status).toBe(400)
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe crear el espacio y responder 201', async () => {
        vi.mocked(espacioModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)

        const respuesta = await request(app)
            .post('/api/espacios')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosCreacion)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(10)
        expect(espacioModel.create).toHaveBeenCalledWith(datosCreacion)
    })
})

describe('PUT /api/espacios/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .put('/api/espacios/10')
            .send({ nombre: 'Sala 2' })

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .put('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)
            .send({ nombre: 'Sala 2' })

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .put('/api/espacios/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ nombre: 'Sala 2' })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 400 si el body está vacío', async () => {
        const respuesta = await request(app)
            .put('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({})

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/espacios/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ nombre: 'Sala 2' })

        expect(respuesta.status).toBe(404)
    })

    it('debe actualizar y responder 200', async () => {
        const guardado = vi.fn()
        const espacioActual = { ...espacio, save: guardado }
        const espacioActualizado = { ...espacio, nombre: 'Sala 2' }

        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(espacioActual as never)
            .mockResolvedValueOnce(espacioActualizado as never)

        const respuesta = await request(app)
            .put('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ nombre: 'Sala 2' })

        expect(respuesta.status).toBe(200)
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(respuesta.body.nombre).toBe('Sala 2')
    })
})

describe('PATCH /api/espacios/:id/desactivar', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).patch(
            '/api/espacios/10/desactivar',
        )

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .patch('/api/espacios/10/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .patch('/api/espacios/999/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe desactivar y responder 200', async () => {
        const guardado = vi.fn()
        const espacioActual = { ...espacio, save: guardado }
        const espacioDesactivado = { ...espacio, activo: false }

        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(espacioActual as never)
            .mockResolvedValueOnce(espacioDesactivado as never)

        const respuesta = await request(app)
            .patch('/api/espacios/10/desactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(respuesta.body.activo).toBe(false)
    })
})

describe('PATCH /api/espacios/:id/reactivar', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).patch('/api/espacios/10/reactivar')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .patch('/api/espacios/10/reactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
    })

    it('debe reactivar y responder 200', async () => {
        const guardado = vi.fn()
        const espacioInactivo = { ...espacio, activo: false, save: guardado }

        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(espacioInactivo as never)
            .mockResolvedValueOnce(espacio as never)

        const respuesta = await request(app)
            .patch('/api/espacios/10/reactivar')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(respuesta.body.activo).toBe(true)
    })
})

describe('DELETE /api/espacios/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).delete('/api/espacios/10')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .delete('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .delete('/api/espacios/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 409 si tiene dependencias', async () => {
        const destroy = vi.fn()
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            destroy,
        } as never)
        vi.mocked(asignacionEspacioModel.count).mockResolvedValue(1 as never)
        vi.mocked(tarifaEspaciosModel.count).mockResolvedValue(0 as never)

        const respuesta = await request(app)
            .delete('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(409)
        expect(destroy).not.toHaveBeenCalled()
    })

    it('debe eliminar y responder 204 sin contenido', async () => {
        const destroy = vi.fn()
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            destroy,
        } as never)
        vi.mocked(asignacionEspacioModel.count).mockResolvedValue(0 as never)
        vi.mocked(tarifaEspaciosModel.count).mockResolvedValue(0 as never)

        const respuesta = await request(app)
            .delete('/api/espacios/10')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(204)
        expect(destroy).toHaveBeenCalledTimes(1)
        expect(respuesta.text).toBe('')
    })
})
