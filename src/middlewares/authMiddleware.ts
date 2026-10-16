import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

import { AppError } from '../errors/AppError.js'
import { ROLES, type Rol } from '../types/Rol.js'

interface DatosToken {
    id: number
    email: string
    rol: Rol
}

declare module 'express-serve-static-core' {
    interface Request {
        usuario?: DatosToken
    }
}

export function verificarToken(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authorization = req.headers.authorization

    if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new AppError(401, 'Token de autorización requerido')
    }

    const token = authorization.split(' ')[1]

    if (!token) {
        throw new AppError(401, 'Token de autenticación inválido')
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
        throw new AppError(500, 'JWT_SECRET no está configurado')
    }

    try {
        const datos = jwt.verify(token, jwtSecret)

        if (
            typeof datos === 'string' ||
            typeof datos.id !== 'number' ||
            typeof datos.email !== 'string' ||
            !ROLES.includes(datos.rol)
        ) {
            throw new AppError(401, 'Token de autenticación inválido')
        }

        req.usuario = {
            id: datos.id,
            email: datos.email,
            rol: datos.rol as DatosToken['rol'],
        }

        return next()
    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }

        throw new AppError(401, 'Token inválido o expirado')
    }
}
