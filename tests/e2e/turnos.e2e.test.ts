import request from 'supertest'
import { describe, expect, it } from 'vitest'

import app from '../../src/app.js'
import { usarBase } from './helpers/db.js'
import {
    authorization,
    crearAgenda,
    crearPaciente,
    crearProfesional,
    crearTurno,
    login,
    proximoDia,
} from './helpers/fixtures.js'

const { admin } = usarBase()

async function prepararTurno() {
    const profesional = await crearProfesional(admin().token)
    const agenda = await crearAgenda(admin().token, profesional.body.id)
    const paciente = await crearPaciente()
    const sesion = await login(paciente.body.usuario.email)
    const fecha = proximoDia('LUNES')

    const datos = {
        pacienteId: paciente.body.id as number,
        profesionalId: profesional.body.id as number,
        agendaId: agenda.body.id as number,
        fecha,
    }

    return { datos, token: sesion.body.token as string }
}

describe('POST /api/turnos', () => {
    it('crea un turno con sus relaciones', async () => {
        const { datos, token } = await prepararTurno()

        const respuesta = await crearTurno(token, datos)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body).toMatchObject({
            pacienteId: datos.pacienteId,
            profesionalId: datos.profesionalId,
            agendaId: datos.agendaId,
            fecha: datos.fecha,
            hora: '10:00:00',
            estado: 'CONFIRMADO',
        })
        expect(respuesta.body.paciente).toBeDefined()
        const usuario = respuesta.body.paciente.usuario as Record<
            string,
            unknown
        >
        expect(usuario).toHaveProperty('id')
        expect(usuario).not.toHaveProperty('password')
        expect(usuario).not.toHaveProperty('resetPasswordTokenHash')
        expect(usuario).not.toHaveProperty('resetPasswordExpiresAt')
        expect(respuesta.body.profesional).toBeDefined()
        expect(respuesta.body.agenda).toBeDefined()
    })

    it('rechaza dos turnos en el mismo horario', async () => {
        const { datos, token } = await prepararTurno()
        await crearTurno(token, datos)

        const respuesta = await crearTurno(token, datos)

        expect(respuesta.status).toBe(409)
    })

    it('permite reutilizar el horario después de cancelar el turno', async () => {
        const { datos, token } = await prepararTurno()
        const creado = await crearTurno(token, datos)

        const cancelado = await request(app)
            .delete(`/api/turnos/${creado.body.id}`)
            .set('Authorization', authorization(token))

        expect(cancelado.status).toBe(200)
        expect(cancelado.body.estado).toBe('CANCELADO')

        const nuevo = await crearTurno(token, datos)

        expect(nuevo.status).toBe(201)
    })
})

describe('GET /api/turnos', () => {
    it('lista los turnos con filtros para un ADMIN', async () => {
        const { datos, token } = await prepararTurno()
        await crearTurno(token, datos)

        const respuesta = await request(app)
            .get(`/api/turnos?pacienteId=${datos.pacienteId}`)
            .set('Authorization', authorization(admin().token))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0]).toMatchObject({
            pacienteId: datos.pacienteId,
            fecha: datos.fecha,
        })
    })

    it('rechaza el listado a un usuario sin rol ADMIN', async () => {
        const { token } = await prepararTurno()

        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', authorization(token))

        expect(respuesta.status).toBe(403)
    })
})
