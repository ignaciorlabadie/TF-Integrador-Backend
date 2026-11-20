import request from 'supertest'
import { describe, expect, it } from 'vitest'

import app from '../../src/app.js'
import { usarBase } from './helpers/db.js'
import {
    authorization,
    crearPaciente,
    crearProfesional,
    login,
} from './helpers/fixtures.js'

const { admin } = usarBase()

describe('POST /api/profesionales', () => {
    it('crea el usuario y el perfil profesional', async () => {
        const respuesta = await crearProfesional(admin().token)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body).toMatchObject({
            nombre: 'Profesional',
            dni: '27111223',
            matricula: 'MP-E2E',
        })
        expect(respuesta.body.usuario).toMatchObject({
            rol: 'PROFESIONAL',
        })
    })

    it('rechaza un DNI duplicado', async () => {
        await crearProfesional(admin().token)

        const respuesta = await crearProfesional(admin().token, {
            email: 'otro-profesional-e2e@tfi.local.com',
            dni: '27111223',
            matricula: 'MP-E2E-2',
        })

        expect(respuesta.status).toBe(409)
    })

    it('rechaza una matrícula duplicada', async () => {
        await crearProfesional(admin().token)

        const respuesta = await crearProfesional(admin().token, {
            email: 'otro-profesional-e2e@tfi.local.com',
            dni: '27111224',
        })

        expect(respuesta.status).toBe(409)
    })

    it('rechaza a un usuario sin rol ADMIN', async () => {
        const paciente = await crearPaciente()
        const sesion = await login(paciente.body.usuario.email)

        const respuesta = await crearProfesional(sesion.body.token)

        expect(respuesta.status).toBe(403)
    })
})

describe('PUT /api/profesionales/:id', () => {
    it('permite al profesional actualizar su propio perfil', async () => {
        const creado = await crearProfesional(admin().token)
        const sesion = await login(creado.body.usuario.email)

        const respuesta = await request(app)
            .put(`/api/profesionales/${creado.body.id}`)
            .set('Authorization', authorization(sesion.body.token))
            .send({ especialidad: 'Cardiologia' })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.especialidad).toBe('Cardiologia')
    })

    it('rechaza la actualización del perfil de otro profesional', async () => {
        const propio = await crearProfesional(admin().token)
        const ajeno = await crearProfesional(admin().token, {
            email: 'otro-profesional-e2e@tfi.local.com',
            dni: '27111224',
            matricula: 'MP-E2E-2',
        })
        const sesion = await login(propio.body.usuario.email)

        const respuesta = await request(app)
            .put(`/api/profesionales/${ajeno.body.id}`)
            .set('Authorization', authorization(sesion.body.token))
            .send({ especialidad: 'Cardiologia' })

        expect(respuesta.status).toBe(403)
    })
})
