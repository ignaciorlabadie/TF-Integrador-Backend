import { vi } from 'vitest'

process.env.DATABASE_URL = ''

vi.mock('../../src/services/emailService.js', () => ({
    enviarEmailRecuperacion: vi.fn(async () => {}),
    enviarEmailBienvenida: vi.fn(async () => {}),
    enviarEmailTurnoCreado: vi.fn(async () => {}),
    enviarEmailTurnoCancelado: vi.fn(async () => {}),
    enviarEmailTurnoRecordatorio: vi.fn(async () => {}),
}))
