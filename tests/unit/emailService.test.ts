import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { enviarEmailBienvenida } from '../../src/services/emailService.js'

const fetchMock = vi.fn()

beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('BREVO_API_KEY', 'api-key-de-prueba')
    vi.stubEnv('EMAIL_FROM', 'remitente@example.com')
    vi.stubEnv('EMAIL_FROM_NAME', 'Sistema de Turnos')
    vi.stubEnv('FRONTEND_URL', 'https://trabajo-final-integrador.netlify.app/')
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
})

describe('enviarEmailBienvenida', () => {
    it('debe enviar la bienvenida con el link al login', async () => {
        await enviarEmailBienvenida('paciente@example.com', 'Ana')

        expect(fetchMock).toHaveBeenCalledTimes(1)

        const [url, opciones] = fetchMock.mock.calls[0]!
        const body = JSON.parse((opciones as { body: string }).body)

        expect(url).toBe('https://api.brevo.com/v3/smtp/email')
        expect(body.subject).toBe('Bienvenido al Trabajo Final Integrador')
        expect(body.to).toEqual([{ email: 'paciente@example.com' }])
        expect(body.sender).toEqual({
            name: 'Sistema de Turnos',
            email: 'remitente@example.com',
        })
        expect(body.htmlContent).toContain('Hola Ana,')
        expect(body.textContent).toContain('Trabajo Final Integrador')
        expect(body.textContent).toContain(
            'https://trabajo-final-integrador.netlify.app/login',
        )
    })

    it('debe usar un saludo genérico si no recibe nombre', async () => {
        await enviarEmailBienvenida('profesional@example.com')

        const [, opciones] = fetchMock.mock.calls[0]!
        const body = JSON.parse((opciones as { body: string }).body)

        expect(body.htmlContent).toContain('<p>Hola,</p>')
    })

    it('debe informar el status y detalle cuando Brevo rechaza el envío', async () => {
        const text = vi.fn().mockResolvedValue('{"message":"Key not found"}')
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 401,
            text,
        })
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        try {
            await expect(
                enviarEmailBienvenida('paciente@example.com'),
            ).rejects.toMatchObject({
                statusCode: 502,
                message: 'Brevo respondió 401: {"message":"Key not found"}',
            })

            expect(text).toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalled()
        } finally {
            consoleError.mockRestore()
        }
    })
})
