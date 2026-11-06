import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'

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

import app from '../../src/app.js'

describe('GET /api', () => {
    it('debe responder con un mensaje de bienvenida', async () => {
        const respuesta = await request(app).get('/api')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual({
            mensaje: 'API del sistema de turnos',
        })
    })
})
