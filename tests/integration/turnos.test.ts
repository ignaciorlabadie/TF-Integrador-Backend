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
import { ATRIBUTOS_PROFESIONAL_PUBLICOS } from '../../src/services/turnoService.js'
import app from '../../src/app.js'
import {
    agendaModel,
    pacienteModel,
    profesionalModel,
    transactionMock,
    turnoModel,
    usuarioModel,
} from '../helpers/mocksModelos.js'

const JWT_SECRET = 'secreto-de-prueba'

type RolToken = 'PACIENTE' | 'PROFESIONAL' | 'ADMIN'

// El usuario PACIENTE (id 10) tiene el perfil de paciente 4 y el usuario
// PROFESIONAL (id 20) el perfil profesional 2.
const USUARIO_POR_ROL: Record<RolToken, number> = {
    ADMIN: 1,
    PACIENTE: 10,
    PROFESIONAL: 20,
}

function tokenPara(rol: RolToken) {
    return jwt.sign(
        {
            id: USUARIO_POR_ROL[rol],
            email: `${rol.toLowerCase()}@test.com`,
            rol,
        },
        JWT_SECRET,
    )
}

function auth(rol: RolToken) {
    return `Bearer ${tokenPara(rol)}`
}

// 2027-10-25 es lunes.
const turno = {
    id: 5,
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    estado: 'CONFIRMADO',
}

const agenda = {
    id: 3,
    profesionalId: 2,
    diaSemana: 'LUNES',
    horaInicio: '08:00:00',
    horaFin: '12:00:00',
    duracionTurno: 30,
    activo: true,
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

const includeProfesionalPublico = expect.arrayContaining([
    expect.objectContaining({
        model: profesionalModel,
        as: 'profesional',
        attributes: ATRIBUTOS_PROFESIONAL_PUBLICOS,
    }),
])

beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2027, 9, 20, 9, 0))
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
    vi.mocked(transactionMock).mockImplementation((callback) =>
        callback({ id: 'transaccion-mock' }),
    )
    vi.mocked(pacienteModel.findOne).mockResolvedValue({ id: 4 } as never)
    vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 4 } as never)
    vi.mocked(profesionalModel.findOne).mockResolvedValue({ id: 2 } as never)
    vi.mocked(profesionalModel.findByPk).mockResolvedValue({ id: 2 } as never)
    vi.mocked(turnoModel.findOne).mockResolvedValue(null)
    vi.mocked(turnoModel.create).mockResolvedValue({ id: 5 } as never)
    vi.mocked(turnoModel.findByPk).mockResolvedValue({
        ...turno,
        save: vi.fn(),
    } as never)
    vi.mocked(turnoModel.findAll).mockResolvedValue([turno] as never)
    vi.mocked(agendaModel.findByPk).mockResolvedValue({
        ...agenda,
        estaDisponible: vi.fn().mockResolvedValue(true),
    } as never)
    vi.mocked(agendaModel.findAll).mockResolvedValue([agenda] as never)
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
})

describe('GET /api/turnos', () => {
    it('rechaza el listado sin token', async () => {
        const respuesta = await request(app).get('/api/turnos')

        expect(respuesta.status).toBe(401)
        expect(turnoModel.findAll).not.toHaveBeenCalled()
    })

    it('un ADMIN lista todos pidiendo solo atributos públicos del usuario', async () => {
        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([turno])
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, include: includeEsperado }),
        )
    })

    it('un ADMIN arma el where con los filtros recibidos', async () => {
        const respuesta = await request(app)
            .get('/api/turnos?pacienteId=4&estado=CONFIRMADO')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(200)
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { pacienteId: 4, estado: 'CONFIRMADO' },
            }),
        )
    })

    it('un PACIENTE ve solo sus turnos, con el pacienteId de su perfil', async () => {
        const respuesta = await request(app)
            .get('/api/turnos?pacienteId=99')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(200)
        expect(pacienteModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 10 } }),
        )
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { pacienteId: 4 },
                include: includeProfesionalPublico,
            }),
        )
    })

    it('un PROFESIONAL ve solo los turnos de su perfil', async () => {
        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(200)
        expect(profesionalModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { usuarioId: 20 } }),
        )
        expect(turnoModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { profesionalId: 2 } }),
        )
    })

    it('responde una lista vacía si el paciente no tiene perfil', async () => {
        vi.mocked(pacienteModel.findOne).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([])
        expect(turnoModel.findAll).not.toHaveBeenCalled()
    })

    it('responde 500 si falla el servicio', async () => {
        vi.mocked(turnoModel.findAll).mockRejectedValue(new Error('DB caída'))

        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(500)
    })
})

describe('GET /api/turnos/horarios-libres', () => {
    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).get(
            '/api/turnos/horarios-libres?profesionalId=2&fecha=2027-10-25',
        )

        expect(respuesta.status).toBe(401)
    })

    it('no cae en la ruta /:id', async () => {
        const respuesta = await request(app)
            .get('/api/turnos/horarios-libres?profesionalId=2&fecha=2027-10-25')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(200)
        expect(turnoModel.findByPk).not.toHaveBeenCalled()
    })

    it('devuelve la grilla sin los horarios ocupados', async () => {
        vi.mocked(agendaModel.findAll).mockResolvedValue([
            { ...agenda, horaFin: '09:30:00' },
        ] as never)
        vi.mocked(turnoModel.findAll).mockResolvedValue([
            { hora: '08:30:00' },
        ] as never)

        const respuesta = await request(app)
            .get('/api/turnos/horarios-libres?profesionalId=2&fecha=2027-10-25')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([
            { agendaId: 3, hora: '08:00' },
            { agendaId: 3, hora: '09:00' },
        ])
    })

    it('rechaza una fecha inválida', async () => {
        const respuesta = await request(app)
            .get('/api/turnos/horarios-libres?profesionalId=2&fecha=mañana')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(400)
    })

    it('responde 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get(
                '/api/turnos/horarios-libres?profesionalId=99&fecha=2027-10-25',
            )
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(404)
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
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(400)
    })

    it('un ADMIN ve el turno con sus atributos públicos', async () => {
        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual(turno)
        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('un PACIENTE ve su propio turno', async () => {
        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(200)
    })

    it('responde 404 a un PACIENTE que pide un turno ajeno', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue({
            ...turno,
            pacienteId: 99,
        } as never)

        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(404)
    })

    it('responde 404 a un PROFESIONAL que pide un turno de otro', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue({
            ...turno,
            profesionalId: 99,
        } as never)

        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(404)
    })

    it('responde 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/turnos/5')
            .set('Authorization', auth('ADMIN'))

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

    it('rechaza a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PROFESIONAL'))
            .send(datos)

        expect(respuesta.status).toBe(403)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('un PACIENTE crea a su nombre aunque mande otro pacienteId', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PACIENTE'))
            .send({ ...datos, pacienteId: 99 })

        expect(respuesta.status).toBe(201)
        expect(turnoModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ pacienteId: 4 }),
            expect.anything(),
        )
        expect(turnoModel.findByPk).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ include: includeEsperado }),
        )
    })

    it('un ADMIN crea para el paciente indicado', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 8 } as never)

        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('ADMIN'))
            .send({ ...datos, pacienteId: 8 })

        expect(respuesta.status).toBe(201)
        expect(turnoModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ pacienteId: 8 }),
            expect.anything(),
        )
    })

    it('rechaza datos incompletos', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PACIENTE'))
            .send({ ...datos, motivo: undefined })

        expect(respuesta.status).toBe(400)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('rechaza una hora fuera de la grilla de la agenda', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PACIENTE'))
            .send({ ...datos, hora: '10:10' })

        expect(respuesta.status).toBe(400)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('rechaza una fecha pasada', async () => {
        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PACIENTE'))
            .send({ ...datos, fecha: '2027-10-18' })

        expect(respuesta.status).toBe(400)
    })

    it('responde 409 si el horario ya está ocupado', async () => {
        vi.mocked(turnoModel.findOne).mockResolvedValue({} as never)

        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PACIENTE'))
            .send(datos)

        expect(respuesta.status).toBe(409)
        expect(turnoModel.create).not.toHaveBeenCalled()
    })

    it('responde 404 si la agenda no existe', async () => {
        vi.mocked(agendaModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/turnos')
            .set('Authorization', auth('PACIENTE'))
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

    it.each(['PACIENTE', 'PROFESIONAL'] as const)(
        'rechaza a un %s',
        async (rol) => {
            const respuesta = await request(app)
                .put('/api/turnos/5')
                .set('Authorization', auth(rol))
                .send({ motivo: 'Otro' })

            expect(respuesta.status).toBe(403)
        },
    )

    it('rechaza un id inválido', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/abc')
            .set('Authorization', auth('ADMIN'))
            .send({ motivo: 'Otro' })

        expect(respuesta.status).toBe(400)
    })

    it('rechaza un body vacío', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/5')
            .set('Authorization', auth('ADMIN'))
            .send({})

        expect(respuesta.status).toBe(400)
    })

    it('un ADMIN actualiza el turno y responde 200', async () => {
        const respuesta = await request(app)
            .put('/api/turnos/5')
            .set('Authorization', auth('ADMIN'))
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
            .set('Authorization', auth('ADMIN'))
            .send({ motivo: 'Otro' })

        expect(respuesta.status).toBe(404)
    })
})

describe('DELETE /api/turnos/:id', () => {
    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).delete('/api/turnos/5')

        expect(respuesta.status).toBe(401)
    })

    it('rechaza a un PROFESIONAL', async () => {
        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', auth('PROFESIONAL'))

        expect(respuesta.status).toBe(403)
    })

    it('rechaza un id inválido', async () => {
        const respuesta = await request(app)
            .delete('/api/turnos/abc')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(400)
    })

    it('un PACIENTE cancela su turno y responde 200', async () => {
        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', auth('PACIENTE'))

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

    it('responde 404 a un PACIENTE que cancela un turno ajeno', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue({
            ...turno,
            pacienteId: 99,
            save: vi.fn(),
        } as never)

        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(404)
    })

    it('responde 409 si el turno ya estaba cancelado', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue({
            ...turno,
            estado: 'CANCELADO',
            save: vi.fn(),
        } as never)

        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', auth('ADMIN'))

        expect(respuesta.status).toBe(409)
    })

    it('responde 404 si el turno no existe', async () => {
        vi.mocked(turnoModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .delete('/api/turnos/5')
            .set('Authorization', auth('PACIENTE'))

        expect(respuesta.status).toBe(404)
    })
})
