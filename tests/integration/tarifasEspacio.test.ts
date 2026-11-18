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

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}))

import app from '../../src/app.js'

describe('GET /api/tarifas-espacio', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/tarifas-espacio')

        expect(respuesta.status).toBe(401)
    })
})
