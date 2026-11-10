import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/models/Usuario.js', () => ({
    default: {
        findOne: vi.fn(),
    },
}))

vi.mock('../../src/services/emailService.js', () => ({
    enviarEmailRecuperacion: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
    default: {
        compare: vi.fn(),
        hash: vi.fn(),
    },
}))

import Usuario from '../../src/models/Usuario.js'
import bcrypt from 'bcryptjs'

import {
    restablecerPassword,
    solicitarRecuperacion,
} from '../../src/services/authService.js'
import { enviarEmailRecuperacion } from '../../src/services/emailService.js'
import { hashearToken } from '../../src/utils/tokens.js'

function usuarioActivo(extra: Record<string, unknown> = {}) {
    return {
        id: 1,
        email: 'usuario@example.com',
        password: 'hash-viejo',
        rol: 'PACIENTE',
        activo: true,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        save: vi.fn().mockResolvedValue(undefined),
        ...extra,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(enviarEmailRecuperacion).mockResolvedValue(undefined)
    vi.stubEnv('FRONTEND_URL', 'https://turnos.example.com/')
    vi.stubEnv('RESET_TOKEN_TTL_MINUTES', '30')
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('solicitarRecuperacion', () => {
    it('no debe hacer nada si el email no existe', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)

        await solicitarRecuperacion('noexiste@example.com')

        expect(Usuario.findOne).toHaveBeenCalledWith({
            where: { email: 'noexiste@example.com' },
        })
        expect(enviarEmailRecuperacion).not.toHaveBeenCalled()
    })

    it('no debe hacer nada si el usuario está inactivo', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(
            usuarioActivo({ activo: false }) as never,
        )

        await solicitarRecuperacion('usuario@example.com')

        expect(enviarEmailRecuperacion).not.toHaveBeenCalled()
    })

    it('debe guardar el token hasheado y enviar el enlace', async () => {
        const usuario = usuarioActivo()
        vi.mocked(Usuario.findOne).mockResolvedValue(usuario as never)

        await solicitarRecuperacion(' Usuario@Example.com ')

        expect(Usuario.findOne).toHaveBeenCalledWith({
            where: { email: 'usuario@example.com' },
        })
        expect(usuario.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/)
        expect(usuario.resetPasswordExpiresAt).toBeInstanceOf(Date)
        expect(usuario.save).toHaveBeenCalled()

        expect(enviarEmailRecuperacion).toHaveBeenCalledTimes(1)

        const [email, url] = vi.mocked(enviarEmailRecuperacion).mock.calls[0]!

        expect(email).toBe('usuario@example.com')
        expect(url).toMatch(
            /^https:\/\/turnos\.example\.com\/reset-password\?token=[a-f0-9]{64}$/,
        )

        const token = url.split('token=')[1]!

        expect(hashearToken(token)).toBe(usuario.resetPasswordTokenHash)
    })

    it('no debe propagar errores del envío de email', async () => {
        const usuario = usuarioActivo()
        vi.mocked(Usuario.findOne).mockResolvedValue(usuario as never)
        vi.mocked(enviarEmailRecuperacion).mockRejectedValue(
            new Error('Brevo caído'),
        )
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        await expect(
            solicitarRecuperacion('usuario@example.com'),
        ).resolves.toBeUndefined()

        expect(usuario.save).toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()

        consoleError.mockRestore()
    })

    it.each(['abc', '0', '-5'])(
        'debe usar 30 minutos por defecto si el TTL es %s',
        async (ttl) => {
            vi.stubEnv('RESET_TOKEN_TTL_MINUTES', ttl)
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

            try {
                const usuario = usuarioActivo()
                vi.mocked(Usuario.findOne).mockResolvedValue(usuario as never)

                await solicitarRecuperacion('usuario@example.com')

                expect(
                    (usuario.resetPasswordExpiresAt as Date).toISOString(),
                ).toBe('2026-01-01T00:30:00.000Z')
            } finally {
                vi.useRealTimers()
            }
        },
    )

    it('debe guardar el token aunque falte FRONTEND_URL', async () => {
        vi.stubEnv('FRONTEND_URL', '')
        const usuario = usuarioActivo()
        vi.mocked(Usuario.findOne).mockResolvedValue(usuario as never)
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        try {
            await expect(
                solicitarRecuperacion('usuario@example.com'),
            ).resolves.toBeUndefined()

            expect(usuario.save).toHaveBeenCalled()
            expect(enviarEmailRecuperacion).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalled()
        } finally {
            consoleError.mockRestore()
        }
    })
})

describe('restablecerPassword', () => {
    it('debe rechazar una contraseña inválida sin consultar la base', async () => {
        await expect(
            restablecerPassword('token', 'corta'),
        ).rejects.toMatchObject({ statusCode: 400 })

        expect(Usuario.findOne).not.toHaveBeenCalled()
    })

    it('debe rechazar un token inexistente', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(null)

        await expect(
            restablecerPassword('token-invalido', 'NuevaPassword123'),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: 'El enlace es inválido o expiró',
        })
    })

    it('debe rechazar un token expirado', async () => {
        vi.mocked(Usuario.findOne).mockResolvedValue(
            usuarioActivo({
                resetPasswordTokenHash: hashearToken('token-expirado'),
                resetPasswordExpiresAt: new Date(Date.now() - 1000),
            }) as never,
        )

        await expect(
            restablecerPassword('token-expirado', 'NuevaPassword123'),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: 'El enlace es inválido o expiró',
        })
    })

    it('debe actualizar la contraseña y limpiar el token', async () => {
        const usuario = usuarioActivo({
            resetPasswordTokenHash: hashearToken('token-valido'),
            resetPasswordExpiresAt: new Date(Date.now() + 60_000),
        })
        vi.mocked(Usuario.findOne).mockResolvedValue(usuario as never)
        vi.mocked(bcrypt.hash).mockResolvedValue('hash-nuevo' as never)

        await restablecerPassword('token-valido', 'NuevaPassword123')

        expect(Usuario.findOne).toHaveBeenCalledWith({
            where: { resetPasswordTokenHash: hashearToken('token-valido') },
        })
        expect(bcrypt.hash).toHaveBeenCalledWith('NuevaPassword123', 10)
        expect(usuario.password).toBe('hash-nuevo')
        expect(usuario.resetPasswordTokenHash).toBeNull()
        expect(usuario.resetPasswordExpiresAt).toBeNull()
        expect(usuario.save).toHaveBeenCalled()
    })
})
