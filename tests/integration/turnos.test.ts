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

vi.mock('../../src/services/emailService.js', () => ({
    enviarEmailBienvenida: vi.fn(),
    enviarEmailRecuperacion: vi.fn(),
    enviarEmailTurnoCreado: vi.fn(),
    enviarEmailTurnoCancelado: vi.fn(),
    enviarEmailTurnoRecordatorio: vi.fn(),
}))

import { ATRIBUTOS_USUARIO_PUBLICOS } from '../../src/models/atributosUsuario.js'
import app from '../../src/app.js'
import {
    agendaModel,
    pacienteModel,
    transactionMock,
    turnoModel,
    usuarioModel,
} from '../helpers/mocksModelos.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(rol: 'PACIENTE' | 'ADMIN') {
    return jwt.sign(
        { id: 10, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

const turno = {
    id: 5,
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    estado: 'CONFIRMADO',
}

const includeEsperado = expect.arrayContaining([
    expect.objectContaining({
        model: pacienteModel,
        as: 'paciente',
        include: expect.arrayContaining([
            expect.objectContaining({
                model: usuarioModel,
                as: 'usuario',
                attributes: ATRIBUTOS_USUARIO_PUBLICOS,
            }),
        ]),
    }),
])

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
    vi.mocked(transactionMock).mockImplementation((callback) =>
        callback({ id: 'transaccion-mock' }),
    )
    vi.mocked(turnoModel.findOne).mockResolvedValue(null)
    vi.mocked(turnoModel.create).mockResolvedValue({ id: 5 } as never)
    vi.mocked(turnoModel.findByPk).mockResolvedValue({
        ...turno,
        save: vi.fn(),
    } as never)
    vi.mocked(turnoModel.findAll).mockResolvedValue([turno] as never)
    vi.mocked(agendaModel.findByPk).mockResolvedValue({
        estaDisponible: vi.fn().mockResolvedValue(true),
    } as never)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('turnos: atributos públicos del usuario', () => {
    it('rechaza el listado sin token', async () => {
        const respuesta = await request(app).get('/api/turnos')

        expect(respuesta.status).toBe(401)
        expect(turnoModel.findAll).not.toHaveBeenCalled()
    })

    it('rechaza el listado a un paciente', async () => {
        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)

        expect(respuesta.status).toBe(403)
        expect(turnoModel.findAll).not.toHaveBeenCalled()
    })

    it('lista los turnos pidiendo solo atributos públicos del usuario', async () => {
        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([turno])
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('crea un turno pidiendo solo atributos públicos del usuario', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send({
                pacienteId: 4,
                profesionalId: 2,
                agendaId: 3,
                fecha: '2027-10-25',
                hora: '10:00',
                motivo: 'Control',
            })

        expect(respuesta.status).toBe(201)
        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })
})

describe('GET /api/turnos con filtros', () => {
    it('arma el where con los filtros recibidos', async () => {
        vi.mocked(turnoModel.findAll).mockResolvedValue([])

        const respuesta = await request(app)
            .get('/api/turnos?pacienteId=4&estado=CONFIRMADO')
            .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { pacienteId: 4, estado: 'CONFIRMADO' },
            }),
        )
    })

    it('responde 500 si falla el servicio', async () => {
        vi.mocked(turnoModel.findAll).mockRejectedValue(new Error('DB caída'))

        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)

        expect(respuesta.status).toBe(500)
    })
})

describe('GET /api/turnos/:id', () => {
    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).get('/api/turnos/5')

        expect(respuesta.status).toBe(401)
    })

    it('rechaza un id inválido', async () => {
        const respuesta = await request(app)
            .get('/api/turnos/abc')
            .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)

        expect(respuesta.status).toBe(400)
    })

    it('responde 200 con el turno y sus atributos públicos', async () => {
        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual(turno)
        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('responde 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)

        expect(respuesta.status).toBe(404)
    })
})

describe('POST /api/turnos', () => {
    const datos = {
        pacienteId: 4,
        profesionalId: 2,
        agendaId: 3,
        fecha: '2027-10-25',
        hora: '10:00',
        motivo: 'Control',
    }

    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).post('/api/turnos').send(datos)

        expect(respuesta.status).toBe(401)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('rechaza datos incompletos', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send({ ...datos, motivo: undefined })

        expect(respuesta.status).toBe(400)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('responde 409 si el horario ya está ocupado', async () => {
        vi.mocked(turnoModel.findOne).mockResolvedValue({} as never)

        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send(datos)

        expect(respuesta.status).toBe(409)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('responde 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send(datos)

        expect(respuesta.status).toBe(404)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/turnos/:id', () => {
    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/5')
            .send({ motivo: 'Otro' })

        expect(respuesta.status).toBe(401)
    })

    it('rechaza un id inválido', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/abc')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send({ motivo: 'Otro' })

        expect(respuesta.status).toBe(400)
    })

    it('rechaza un body vacío', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send({})

        expect(respuesta.status).toBe(400)
    })

    it('actualiza el turno y responde 200', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send({ motivo: 'Control actualizado' })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toMatchObject({
            ...turno,
            motivo: 'Control actualizado',
        })
    })

    it('responde 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)
            .send({ motivo: 'Otro' })

        expect(respuesta.status).toBe(404)
    })
})

describe('DELETE /api/turnos/:id', () => {
    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).delete('/api/turnos/5')

        expect(respuesta.status).toBe(401)
    })

    it('rechaza un id inválido', async () => {
        const respuesta = await request(app)
            .delete('/api/turnos/abc')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)

        expect(respuesta.status).toBe(400)
    })

    it('cancela el turno y responde 200', async () => {
        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toMatchObject({
            ...turno,
            estado: 'CANCELADO',
        })
        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('responde 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', `Bearer ${tokenPara('PACIENTE')}`)

        expect(respuesta.status).toBe(404)
    })
})
