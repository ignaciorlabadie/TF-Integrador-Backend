import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import app from '../../src/app.js'
import { enviarEmailRecuperacion } from '../../src/services/emailService.js'
import { usarBase } from './helpers/db.js'
import { crearPaciente, login } from './helpers/fixtures.js'

usarBase()

beforeEach(() => {
    vi.mocked(enviarEmailRecuperacion).mockClear()
})

describe('flujo completo de recuperación de contraseña', () => {
    it('cambia la contraseña y permite ingresar con la nueva', async () => {
        const paciente = await crearPaciente()
        const email = paciente.body.usuario.email as string
        const passwordOriginal = 'Password123'
        const passwordNueva = 'NuevaPassword123'

        const solicitud = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email })
        expect(solicitud.status).toBe(200)

        const llamadas = vi.mocked(enviarEmailRecuperacion).mock.calls
        expect(llamadas).toHaveLength(1)

        const url = llamadas[0]?.[1]
        const token = url ? new URL(url).searchParams.get('token') : null
        expect(token).toBeTypeOf('string')

        const reset = await request(app)
            .post('/api/auth/reset-password')
            .send({ token, password: passwordNueva })
        expect(reset.status).toBe(200)

        const conOriginal = await login(email, passwordOriginal)
        expect(conOriginal.status).toBe(401)

        const conNueva = await login(email, passwordNueva)
        expect(conNueva.status).toBe(200)
    })
})
