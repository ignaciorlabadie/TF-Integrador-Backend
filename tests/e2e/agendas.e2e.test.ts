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

describe('POST /api/agendas', () => {
    it('crea una agenda para un profesional', async () => {
        const profesional = await crearProfesional(admin().token)

        const respuesta = await crearAgenda(admin().token, profesional.body.id)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body).toMatchObject({
            profesionalId: profesional.body.id,
            diaSemana: 'LUNES',
            horaInicio: '09:00:00',
            horaFin: '13:00:00',
            duracionTurno: 30,
            activo: true,
        })
    })

    it('rechaza una agenda superpuesta', async () => {
        const profesional = await crearProfesional(admin().token)
        await crearAgenda(admin().token, profesional.body.id)

        const respuesta = await crearAgenda(admin().token, profesional.body.id)

        expect(respuesta.status).toBe(409)
    })

    it('rechaza a un usuario sin rol ADMIN', async () => {
        const paciente = await crearPaciente()
        const sesion = await login(paciente.body.usuario.email)

        const respuesta = await crearAgenda(sesion.body.token, 1)

        expect(respuesta.status).toBe(403)
    })
})

describe('PATCH /api/agendas/:id/desactivar', () => {
    it('rechaza desactivar si hay turnos futuros y los cancela con el flag', async () => {
        const profesional = await crearProfesional(admin().token)
        const agenda = await crearAgenda(admin().token, profesional.body.id)
        const paciente = await crearPaciente()
        const sesion = await login(paciente.body.usuario.email)

        const turno = await crearTurno(sesion.body.token, {
            pacienteId: paciente.body.id,
            profesionalId: profesional.body.id,
            agendaId: agenda.body.id,
            fecha: proximoDia('LUNES'),
        })
        expect(turno.status).toBe(201)

        const sinFlag = await request(app)
            .patch(`/api/agendas/${agenda.body.id}/desactivar`)
            .set('Authorization', authorization(admin().token))

        expect(sinFlag.status).toBe(409)

        const conFlag = await request(app)
            .patch(`/api/agendas/${agenda.body.id}/desactivar`)
            .set('Authorization', authorization(admin().token))
            .send({ cancelarTurnosFuturos: true })

        expect(conFlag.status).toBe(204)

        const turnoCancelado = await request(app)
            .get(`/api/turnos/${turno.body.id}`)
            .set('Authorization', authorization(admin().token))

        expect(turnoCancelado.body.estado).toBe('CANCELADO')
    })
})

describe('PATCH /api/agendas/:id/activar', () => {
    it('activa una agenda desactivada y es idempotente', async () => {
        const profesional = await crearProfesional(admin().token)
        const agenda = await crearAgenda(admin().token, profesional.body.id)

        const desactivada = await request(app)
            .patch(`/api/agendas/${agenda.body.id}/desactivar`)
            .set('Authorization', authorization(admin().token))
        expect(desactivada.status).toBe(204)

        const activada = await request(app)
            .patch(`/api/agendas/${agenda.body.id}/activar`)
            .set('Authorization', authorization(admin().token))

        expect(activada.status).toBe(200)
        expect(activada.body.activo).toBe(true)
        expect(activada.body.profesional.id).toBe(profesional.body.id)

        const deNuevo = await request(app)
            .patch(`/api/agendas/${agenda.body.id}/activar`)
            .set('Authorization', authorization(admin().token))

        expect(deNuevo.status).toBe(200)
        expect(deNuevo.body.activo).toBe(true)
    })

    it('rechaza activar si otra agenda activa ocupa el mismo horario', async () => {
        const profesional = await crearProfesional(admin().token)
        const primera = await crearAgenda(admin().token, profesional.body.id)

        const desactivada = await request(app)
            .patch(`/api/agendas/${primera.body.id}/desactivar`)
            .set('Authorization', authorization(admin().token))
        expect(desactivada.status).toBe(204)

        const segunda = await crearAgenda(admin().token, profesional.body.id)
        expect(segunda.status).toBe(201)

        const respuesta = await request(app)
            .patch(`/api/agendas/${primera.body.id}/activar`)
            .set('Authorization', authorization(admin().token))

        expect(respuesta.status).toBe(409)
        expect(respuesta.body.mensaje).toBe(
            'Ya existe una agenda activa para el profesional en ese día y horario',
        )
    })
})
