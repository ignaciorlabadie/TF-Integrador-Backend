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

describe('flujo completo de reserva', () => {
    it('registra un paciente, reserva un turno y lo cancela', async () => {
        const profesional = await crearProfesional(admin().token)
        expect(profesional.status).toBe(201)

        const agenda = await crearAgenda(admin().token, profesional.body.id)
        expect(agenda.status).toBe(201)

        const paciente = await crearPaciente()
        expect(paciente.status).toBe(201)

        const sesion = await login(paciente.body.usuario.email)
        expect(sesion.status).toBe(200)
        const token = sesion.body.token as string

        const cartilla = await request(app)
            .get('/api/profesionales')
            .set('Authorization', authorization(token))
        expect(cartilla.status).toBe(200)
        expect(
            cartilla.body.some(
                (item: { id: number }) => item.id === profesional.body.id,
            ),
        ).toBe(true)

        const disponibilidad = await request(app)
            .get(`/api/agendas/profesional/${profesional.body.id}`)
            .set('Authorization', authorization(token))
        expect(disponibilidad.status).toBe(200)
        expect(
            disponibilidad.body.some(
                (item: { id: number }) => item.id === agenda.body.id,
            ),
        ).toBe(true)

        const datos = {
            pacienteId: paciente.body.id as number,
            profesionalId: profesional.body.id as number,
            agendaId: agenda.body.id as number,
            fecha: proximoDia('LUNES'),
        }

        const turno = await crearTurno(token, datos)
        expect(turno.status).toBe(201)
        expect(turno.body.estado).toBe('CONFIRMADO')

        const listado = await request(app)
            .get(`/api/turnos?pacienteId=${datos.pacienteId}`)
            .set('Authorization', authorization(admin().token))
        expect(listado.status).toBe(200)
        expect(listado.body).toHaveLength(1)

        const cancelacion = await request(app)
            .delete(`/api/turnos/${turno.body.id}`)
            .set('Authorization', authorization(token))
        expect(cancelacion.status).toBe(200)
        expect(cancelacion.body.estado).toBe('CANCELADO')

        const reintento = await crearTurno(token, datos)
        expect(reintento.status).toBe(201)
    })
})
