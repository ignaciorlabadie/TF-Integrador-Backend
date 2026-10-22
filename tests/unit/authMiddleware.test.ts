import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { verificarToken } from '../../src/middlewares/authMiddleware.js'
import { AppError } from '../../src/errors/AppError.js'

const JWT_SECRET = 'secreto-de-prueba'

function crearMocks(authorization?: string) {
    const req = {
        headers: {
            authorization,
        },
    } as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as NextFunction

    return { req, res, next }
}

function capturarError(fn: () => void): unknown {
    try {
        fn()
    } catch (error) {
        return error
    }

    return undefined
}

describe('verificarToken', () => {
    beforeEach(() => {
        vi.stubEnv('JWT_SECRET', JWT_SECRET)
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('debe lanzar 401 si falta el token', () => {
        const { req, res, next } = crearMocks()

        const error = capturarError(() => verificarToken(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 401,
            message: 'Token de autorización requerido',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe lanzar 401 si el token es inválido', () => {
        const { req, res, next } = crearMocks('Bearer token-invalido')

        const error = capturarError(() => verificarToken(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 401,
            message: 'Token inválido o expirado',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe lanzar 401 si el token expiró', () => {
        const token = jwt.sign(
            { id: 1, email: 'paciente@test.com', rol: 'PACIENTE' },
            JWT_SECRET,
            { expiresIn: -1 },
        )

        const { req, res, next } = crearMocks(`Bearer ${token}`)

        const error = capturarError(() => verificarToken(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 401,
            message: 'Token inválido o expirado',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe lanzar 500 si falta JWT_SECRET', () => {
        vi.stubEnv('JWT_SECRET', '')

        const { req, res, next } = crearMocks('Bearer cualquier-token')

        const error = capturarError(() => verificarToken(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 500,
            message: 'JWT_SECRET no está configurado',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe lanzar 401 si el token tiene datos inválidos', () => {
        const token = jwt.sign(
            {
                id: 'no-es-un-numero',
                email: 'paciente@test.com',
                rol: 'PACIENTE',
            },
            JWT_SECRET,
        )

        const { req, res, next } = crearMocks(`Bearer ${token}`)

        const error = capturarError(() => verificarToken(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 401,
            message: 'Token de autenticación inválido',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe validar el token y agregar el usuario a la request', () => {
        const token = jwt.sign(
            { id: 1, email: 'paciente@test.com', rol: 'PACIENTE' },
            JWT_SECRET,
        )

        const { req, res, next } = crearMocks(`Bearer ${token}`)

        verificarToken(req, res, next)

        expect(req.usuario).toEqual({
            id: 1,
            email: 'paciente@test.com',
            rol: 'PACIENTE',
        })
        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })
})
