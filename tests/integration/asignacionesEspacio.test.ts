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
    profesionalModel,
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

const profesional = {
    id: 5,
    usuarioId: 77,
    nombre: 'Ana',
    apellido: 'Gomez',
}

const asignacionFija = {
    id: 1,
    espacioId: 10,
    profesionalId: 5,
    tipo: 'FIJA',
    diaSemana: 'LUNES',
    fecha: null,
    horaInicio: '08:00',
    horaFin: '12:00',
}

const asignacionEspecifica = {
    id: 2,
    espacioId: 10,
    profesionalId: 5,
    tipo: 'ESPECIFICA',
    diaSemana: null,
    fecha: '2027-10-25',
    horaInicio: '08:00',
    horaFin: '12:00',
}

const datosFija = {
    espacioId: 10,
    profesionalId: 5,
    tipo: 'FIJA',
    diaSemana: 'LUNES',
    fecha: null,
    horaInicio: '08:00',
    horaFin: '12:00',
}

const datosEspecifica = {
    espacioId: 10,
    profesionalId: 5,
    tipo: 'ESPECIFICA',
    diaSemana: null,
    fecha: '2027-10-25',
    horaInicio: '08:00',
    horaFin: '12:00',
}

const candidataSolapada = {
    id: 99,
    espacioId: 10,
    profesionalId: 6,
    tipo: 'FIJA',
    diaSemana: 'LUNES',
    fecha: null,
    horaInicio: '10:00',
    horaFin: '11:00',
}

function mockCreacionExitosa(resultado: { id: number }) {
    vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
    vi.mocked(profesionalModel.findByPk).mockResolvedValue(profesional as never)
    vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([] as never)
    vi.mocked(asignacionEspacioModel.create).mockResolvedValue({
        id: resultado.id,
    } as never)
    vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
        resultado as never,
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

describe('GET /api/asignaciones-espacio', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/asignaciones-espacio')

        expect(respuesta.status).toBe(401)
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un PACIENTE', async () => {
        const respuesta = await request(app)
            .get('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la lista y aplicar filtros para un ADMIN', async () => {
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            asignacionFija,
        ] as never)

        const respuesta = await request(app)
            .get('/api/asignaciones-espacio?espacioId=10&tipo=FIJA')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].id).toBe(1)
        expect(asignacionEspacioModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { espacioId: 10, tipo: 'FIJA' },
            }),
        )
    })

    it('debe listar solo las asignaciones del PROFESIONAL autenticado', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            asignacionFija,
        ] as never)

        const respuesta = await request(app)
            .get('/api/asignaciones-espacio?profesionalId=999')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(200)
        expect(profesionalModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 77 } }),
        )
        expect(asignacionEspacioModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { profesionalId: 5 } }),
        )
    })

    it('debe responder 400 ante un filtro inválido', async () => {
        const respuesta = await request(app)
            .get('/api/asignaciones-espacio?tipo=OTRO')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 400 si espacioId no es válido', async () => {
        const respuesta = await request(app)
            .get('/api/asignaciones-espacio?espacioId=abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })
})

describe('GET /api/asignaciones-espacio/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/asignaciones-espacio/1')

        expect(respuesta.status).toBe(401)
        expect(asignacionEspacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .get('/api/asignaciones-espacio/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si la asignación no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/asignaciones-espacio/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 200 con la asignación para un ADMIN', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionFija as never,
        )

        const respuesta = await request(app)
            .get('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(1)
    })

    it('debe permitir al PROFESIONAL ver su propia asignación', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionFija as never,
        )

        const respuesta = await request(app)
            .get('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(200)
    })

    it('debe responder 403 si la asignación es de otro profesional', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue({
            ...asignacionFija,
            profesionalId: 99,
        } as never)

        const respuesta = await request(app)
            .get('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
    })
})

describe('POST /api/asignaciones-espacio', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .send(datosFija)

        expect(respuesta.status).toBe(401)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un PACIENTE', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'PACIENTE')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe crear una FIJA y responder 201 como ADMIN', async () => {
        mockCreacionExitosa(asignacionFija)

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(1)
        expect(asignacionEspacioModel.create).toHaveBeenCalledWith(datosFija)
    })

    it('debe crear una ESPECIFICA como PROFESIONAL forzando su profesionalId', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        mockCreacionExitosa(asignacionEspecifica)

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send({ ...datosEspecifica, profesionalId: 999 })

        expect(respuesta.status).toBe(201)
        expect(asignacionEspacioModel.create).toHaveBeenCalledWith(
            datosEspecifica,
        )
    })

    it('debe responder 403 si un PROFESIONAL intenta crear una FIJA', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si faltan campos obligatorios', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ espacioId: 10 })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el tipo no es válido', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosFija, tipo: 'OTRO' })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una FIJA no tiene día de semana', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosFija, diaSemana: null })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una FIJA tiene fecha', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosFija, fecha: '2027-10-25' })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una ESPECIFICA no tiene fecha', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosEspecifica, fecha: null })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una ESPECIFICA tiene día de semana', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosEspecifica, diaSemana: 'LUNES' })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una hora es inválida', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosFija, horaInicio: '9:00' })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si la hora de inicio no es anterior a la de fin', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosFija, horaInicio: '12:00', horaFin: '08:00' })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 400 si la fecha es pasada', async () => {
        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosEspecifica, fecha: '2020-01-01' })

        expect(respuesta.status).toBe(400)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(404)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si el espacio está inactivo', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            activo: false,
        } as never)

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(409)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(404)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si hay solapamiento', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            candidataSolapada,
        ] as never)

        const respuesta = await request(app)
            .post('/api/asignaciones-espacio')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(409)
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/asignaciones-espacio/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/1')
            .send(datosFija)

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 400 si faltan campos obligatorios', async () => {
        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ espacioId: 10 })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si la asignación no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(404)
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 409 si hay solapamiento con otra asignación', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionFija as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            candidataSolapada,
        ] as never)

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(409)
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe actualizar y responder 200 como ADMIN', async () => {
        const actualizada = { ...asignacionFija, horaFin: '13:00' }

        vi.mocked(asignacionEspacioModel.findByPk)
            .mockResolvedValueOnce(asignacionFija as never)
            .mockResolvedValueOnce(actualizada as never)
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([] as never)
        vi.mocked(asignacionEspacioModel.update).mockResolvedValue([1] as never)

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)
            .send({ ...datosFija, horaFin: '13:00' })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.horaFin).toBe('13:00')
        expect(asignacionEspacioModel.update).toHaveBeenCalledWith(
            expect.objectContaining({ horaFin: '13:00' }),
            { where: { id: 1 } },
        )
    })

    it('debe responder 403 si un PROFESIONAL intenta editar una asignación ajena', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue({
            ...asignacionEspecifica,
            profesionalId: 99,
        } as never)

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/2')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send(datosEspecifica)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un PROFESIONAL intenta editar una FIJA propia', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionFija as never,
        )

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send(datosEspecifica)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un PROFESIONAL intenta cambiar a FIJA', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionEspecifica as never,
        )

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/2')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send(datosFija)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe permitir al PROFESIONAL actualizar su propia ESPECIFICA', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionEspecifica as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([] as never)
        vi.mocked(asignacionEspacioModel.update).mockResolvedValue([1] as never)

        const respuesta = await request(app)
            .put('/api/asignaciones-espacio/2')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)
            .send({ ...datosEspecifica, profesionalId: 999 })

        expect(respuesta.status).toBe(200)
        expect(asignacionEspacioModel.update).toHaveBeenCalledWith(
            expect.objectContaining({ profesionalId: 5 }),
            { where: { id: 2 } },
        )
    })
})

describe('DELETE /api/asignaciones-espacio/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).delete(
            '/api/asignaciones-espacio/1',
        )

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 400 ante un ID inválido', async () => {
        const respuesta = await request(app)
            .delete('/api/asignaciones-espacio/abc')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 si la asignación no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .delete('/api/asignaciones-espacio/999')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(404)
        expect(asignacionEspacioModel.destroy).not.toHaveBeenCalled()
    })

    it('debe eliminar y responder 204 como ADMIN', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionFija as never,
        )
        vi.mocked(asignacionEspacioModel.destroy).mockResolvedValue(1 as never)

        const respuesta = await request(app)
            .delete('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(1, 'ADMIN')}`)

        expect(respuesta.status).toBe(204)
        expect(respuesta.text).toBe('')
        expect(asignacionEspacioModel.destroy).toHaveBeenCalledWith({
            where: { id: 1 },
        })
    })

    it('debe responder 403 si un PROFESIONAL intenta eliminar una asignación ajena', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue({
            ...asignacionEspecifica,
            profesionalId: 99,
        } as never)

        const respuesta = await request(app)
            .delete('/api/asignaciones-espacio/2')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.destroy).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un PROFESIONAL intenta eliminar una FIJA propia', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionFija as never,
        )

        const respuesta = await request(app)
            .delete('/api/asignaciones-espacio/1')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(403)
        expect(asignacionEspacioModel.destroy).not.toHaveBeenCalled()
    })

    it('debe permitir al PROFESIONAL eliminar su propia ESPECIFICA', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionEspecifica as never,
        )
        vi.mocked(asignacionEspacioModel.destroy).mockResolvedValue(1 as never)

        const respuesta = await request(app)
            .delete('/api/asignaciones-espacio/2')
            .set('Authorization', `Bearer ${tokenPara(77, 'PROFESIONAL')}`)

        expect(respuesta.status).toBe(204)
        expect(asignacionEspacioModel.destroy).toHaveBeenCalledWith({
            where: { id: 2 },
        })
    })
})
