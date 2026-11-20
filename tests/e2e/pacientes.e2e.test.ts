import request from 'supertest'
import { describe, expect, it } from 'vitest'

import app from '../../src/app.js'
import { usarBase } from './helpers/db.js'
import { authorization, crearPaciente, login } from './helpers/fixtures.js'

usarBase()

describe('POST /api/pacientes', () => {
    it('crea el usuario y el perfil de forma pública', async () => {
        const respuesta = await crearPaciente()

        expect(respuesta.status).toBe(201)
        expect(respuesta.body).toMatchObject({
            nombre: 'Paciente',
            apellido: 'E2E',
            dni: '30111223',
        })
        expect(respuesta.body.usuario).toMatchObject({
            email: 'paciente-e2e@tfi.local.com',
            rol: 'PACIENTE',
        })
        expect(respuesta.body.usuario.password).toBeUndefined()
    })

    it('rechaza un email duplicado', async () => {
        await crearPaciente()
        const respuesta = await crearPaciente({ dni: '30111224' })

        expect(respuesta.status).toBe(409)
    })

    it('rechaza un DNI inválido', async () => {
        const respuesta = await crearPaciente({ dni: '123' })

        expect(respuesta.status).toBe(400)
    })
})

describe('GET /api/pacientes/me', () => {
    it('devuelve el perfil del paciente autenticado', async () => {
        const creado = await crearPaciente()
        const sesion = await login(creado.body.usuario.email)

        expect(sesion.status).toBe(200)

        const respuesta = await request(app)
            .get('/api/pacientes/me')
            .set('Authorization', authorization(sesion.body.token))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(creado.body.id)
    })

    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).get('/api/pacientes/me')

        expect(respuesta.status).toBe(401)
    })
})

describe('PUT /api/pacientes/me', () => {
    it('actualiza los datos del perfil propio', async () => {
        const creado = await crearPaciente()
        const sesion = await login(creado.body.usuario.email)

        const respuesta = await request(app)
            .put('/api/pacientes/me')
            .set('Authorization', authorization(sesion.body.token))
            .send({ nombre: 'Nombre Actualizado' })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.nombre).toBe('Nombre Actualizado')
    })
})
