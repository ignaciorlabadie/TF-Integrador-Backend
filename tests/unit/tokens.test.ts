import { describe, expect, it } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'

import { generarTokenReseteo, hashearToken } from '../../src/utils/tokens.js'

describe('tokens', () => {
    it('debe generar un token aleatorio de 64 caracteres hexadecimales', () => {
        const { token, hash } = generarTokenReseteo()

        expect(token).toMatch(/^[a-f0-9]{64}$/)
        expect(hash).toBe(hashearToken(token))
    })

    it('debe generar tokens distintos en cada llamada', () => {
        const primero = generarTokenReseteo()
        const segundo = generarTokenReseteo()

        expect(primero.token).not.toBe(segundo.token)
        expect(primero.hash).not.toBe(segundo.hash)
    })

    it('debe hashear con SHA-256', () => {
        const token = randomBytes(32).toString('hex')
        const esperado = createHash('sha256').update(token).digest('hex')

        expect(hashearToken(token)).toBe(esperado)
    })
})
