import request from 'supertest'
import { describe, expect, it } from 'vitest'

import app from '../../src/app.js'
import { usarBase } from './helpers/db.js'

usarBase()

describe('GET /health', () => {
    it('informa que la base de datos está conectada', async () => {
        const respuesta = await request(app).get('/health')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toMatchObject({
            status: 'ok',
            db: 'connected',
        })
    })
})
