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

    it('muestra a cada paciente solo sus turnos', async () => {
        const { datos, token } = await prepararTurno()
        await crearTurno(token, datos)

        const otro = await crearPaciente({
            email: 'otro-paciente-e2e@tfi.local.com',
            dni: '30111224',
        })
        const sesionOtro = await login(otro.body.usuario.email)
        await crearTurno(sesionOtro.body.token, {
            ...datos,
            pacienteId: otro.body.id,
            hora: '11:00',
        })

        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', authorization(token))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].pacienteId).toBe(datos.pacienteId)
        expect(respuesta.body[0].profesional).not.toHaveProperty('dni')
        expect(respuesta.body[0].profesional).not.toHaveProperty('telefono')
    })

    it('muestra al profesional los turnos de su perfil', async () => {
        const { datos, token } = await prepararTurno()
        await crearTurno(token, datos)
        const sesion = await login('profesional-e2e@tfi.local.com')

        const respuesta = await request(app)
            .get('/api/turnos')
            .set('Authorization', authorization(sesion.body.token))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toHaveLength(1)
        expect(respuesta.body[0].profesionalId).toBe(datos.profesionalId)
    })
})

describe('Permisos sobre un turno', () => {
    it('responde 404 a un paciente que pide o cancela un turno ajeno', async () => {
        const { datos, token } = await prepararTurno()
        const creado = await crearTurno(token, datos)

        const otro = await crearPaciente({
            email: 'otro-paciente-e2e@tfi.local.com',
            dni: '30111224',
        })
        const sesionOtro = await login(otro.body.usuario.email)

        const ver = await request(app)
            .get(`/api/turnos/${creado.body.id}`)
            .set('Authorization', authorization(sesionOtro.body.token))
        const cancelar = await request(app)
            .delete(`/api/turnos/${creado.body.id}`)
            .set('Authorization', authorization(sesionOtro.body.token))

        expect(ver.status).toBe(404)
        expect(cancelar.status).toBe(404)
    })

    it('no deja al profesional crear, editar ni cancelar turnos', async () => {
        const { datos, token } = await prepararTurno()
        const creado = await crearTurno(token, datos)
        const sesion = await login('profesional-e2e@tfi.local.com')
        const tokenProfesional = sesion.body.token as string

        const crear = await crearTurno(tokenProfesional, {
            ...datos,
            hora: '11:00',
        })
        const editar = await request(app)
            .put(`/api/turnos/${creado.body.id}`)
            .set('Authorization', authorization(tokenProfesional))
            .send({ motivo: 'Otro' })
        const cancelar = await request(app)
            .delete(`/api/turnos/${creado.body.id}`)
            .set('Authorization', authorization(tokenProfesional))

        expect(crear.status).toBe(403)
        expect(editar.status).toBe(403)
        expect(cancelar.status).toBe(403)
    })

    it('no deja al paciente editar su turno', async () => {
        const { datos, token } = await prepararTurno()
        const creado = await crearTurno(token, datos)

        const respuesta = await request(app)
            .put(`/api/turnos/${creado.body.id}`)
            .set('Authorization', authorization(token))
            .send({ motivo: 'Otro' })

        expect(respuesta.status).toBe(403)
    })

    it('rechaza un horario fuera de la grilla de la agenda', async () => {
        const { datos, token } = await prepararTurno()

        const respuesta = await crearTurno(token, { ...datos, hora: '10:10' })

        expect(respuesta.status).toBe(400)
    })
})

describe('GET /api/turnos/horarios-libres', () => {
    it('devuelve la grilla de la agenda sin los horarios ocupados', async () => {
        const { datos, token } = await prepararTurno()
        await crearTurno(token, datos)

        const respuesta = await request(app)
            .get(
                `/api/turnos/horarios-libres?profesionalId=${datos.profesionalId}&fecha=${datos.fecha}`,
            )
            .set('Authorization', authorization(token))

        expect(respuesta.status).toBe(200)

        const horas = (respuesta.body as { hora: string }[]).map((h) => h.hora)

        // Agenda de 09:00 a 13:00 cada 30 minutos: 8 turnos, uno ocupado.
        expect(horas).toHaveLength(7)
        expect(horas[0]).toBe('09:00')
        expect(horas).not.toContain('10:00')
        expect(horas.at(-1)).toBe('12:30')
        expect(respuesta.body[0].agendaId).toBe(datos.agendaId)
    })

    it('devuelve una lista vacía si el profesional no atiende ese día', async () => {
        const { datos, token } = await prepararTurno()
        const martes = proximoDia('MARTES')

        const respuesta = await request(app)
            .get(
                `/api/turnos/horarios-libres?profesionalId=${datos.profesionalId}&fecha=${martes}`,
            )
            .set('Authorization', authorization(token))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([])
    })
})
