import { createHash, randomBytes } from 'node:crypto'

export function hashearToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export function generarTokenReseteo(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex')

    return { token, hash: hashearToken(token) }
}
