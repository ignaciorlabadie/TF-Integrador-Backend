import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import {
    verificarRol,
    verificarAdminOPropio,
} from '../../src/middlewares/rolMiddleware.js'
import { AppError } from '../../src/errors/AppError.js'

function crearMocks(
    rol?: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN',
    params: Record<string, string> = {},
) {
    const req = {
        params,
        usuario: rol
            ? {
                  id: 1,
                  email: 'usuario@test.com',
                  rol,
              }
            : undefined,
    } as unknown as Request

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

describe('verificarRol', () => {
    it('debe lanzar 401 si no hay usuario autenticado', () => {
        const { req, res, next } = crearMocks()
        const middleware = verificarRol('ADMIN')

        const error = capturarError(() => middleware(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 401,
            message: 'Autenticación requerida',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe lanzar 403 si el rol no está permitido', () => {
        const { req, res, next } = crearMocks('PACIENTE')
        const middleware = verificarRol('ADMIN')

        const error = capturarError(() => middleware(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 403,
            message: 'No tenés permisos para realizar esta acción',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe permitir el acceso si el rol está autorizado', () => {
        const { req, res, next } = crearMocks('ADMIN')
        const middleware = verificarRol('ADMIN')

        middleware(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe permitir cualquiera de los roles indicados', () => {
        const { req, res, next } = crearMocks('PROFESIONAL')
        const middleware = verificarRol('ADMIN', 'PROFESIONAL')

        middleware(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('verificarAdminOPropio', () => {
    it('debe lanzar 401 si no hay usuario autenticado', () => {
        const { req, res, next } = crearMocks(undefined, { id: '1' })

        const error = capturarError(() => verificarAdminOPropio(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 401,
            message: 'Autenticación requerida',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe permitir el acceso a un administrador', () => {
        const { req, res, next } = crearMocks('ADMIN', { id: '2' })

        verificarAdminOPropio(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe permitir el acceso al propio usuario', () => {
        const { req, res, next } = crearMocks('PACIENTE', { id: '1' })

        verificarAdminOPropio(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe lanzar 403 si el usuario intenta ver a otro', () => {
        const { req, res, next } = crearMocks('PACIENTE', { id: '2' })

        const error = capturarError(() => verificarAdminOPropio(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 403,
            message: 'No tenés permisos para realizar esta acción',
        })
        expect(next).not.toHaveBeenCalled()
    })

    it('debe lanzar 403 si el id no es válido y no es admin', () => {
        const { req, res, next } = crearMocks('PACIENTE', { id: 'abc' })

        const error = capturarError(() => verificarAdminOPropio(req, res, next))

        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({
            statusCode: 403,
            message: 'No tenés permisos para realizar esta acción',
        })
        expect(next).not.toHaveBeenCalled()
    })
})
