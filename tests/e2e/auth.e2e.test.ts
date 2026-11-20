import request from 'supertest'
import { describe, expect, it } from 'vitest'

import app from '../../src/app.js'
import { Usuario } from '../../src/models/index.js'
import { EMAIL_ADMIN, PASSWORD_ADMIN, usarBase } from './helpers/db.js'
import { authorization, login } from './helpers/fixtures.js'

usarBase()

describe('POST /api/auth/login', () => {
    it('devuelve un token para credenciales válidas', async () => {
        const respuesta = await login(EMAIL_ADMIN, PASSWORD_ADMIN)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.token).toBeTypeOf('string')
        expect(respuesta.body.usuario).toMatchObject({
            email: EMAIL_ADMIN,
            rol: 'ADMIN',
            activo: true,
        })
    })

    it('rechaza una contraseña incorrecta', async () => {
        const respuesta = await login(EMAIL_ADMIN, 'contraseña-incorrecta')

        expect(respuesta.status).toBe(401)
    })

    it('rechaza credenciales incompletas', async () => {
        const respuesta = await request(app)
            .post('/api/auth/login')
            .send({ email: EMAIL_ADMIN })

        expect(respuesta.status).toBe(400)
    })

    it('rechaza un usuario inactivo', async () => {
        await Usuario.update(
            { activo: false },
            { where: { email: EMAIL_ADMIN } },
        )

        const respuesta = await login(EMAIL_ADMIN, PASSWORD_ADMIN)

        expect(respuesta.status).toBe(403)
    })
})

describe('GET /api/auth/me', () => {
    it('devuelve el perfil del usuario autenticado', async () => {
        const sesion = await login(EMAIL_ADMIN, PASSWORD_ADMIN)

        const respuesta = await request(app)
            .get('/api/auth/me')
            .set('Authorization', authorization(sesion.body.token))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toMatchObject({
            email: EMAIL_ADMIN,
            rol: 'ADMIN',
            activo: true,
        })
    })

    it('rechaza la petición sin token', async () => {
        const respuesta = await request(app).get('/api/auth/me')

        expect(respuesta.status).toBe(401)
    })
})
