import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
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
        return res.status(401).json({
            mensaje: 'Token de autenticación requerido',
        })
    }

    const token = authorization.split(' ')[1]

    if (!token) {
        return res.status(401).json({
            mensaje: 'Token de autenticación inválido',
        })
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
        return res.status(500).json({
            mensaje: 'Error interno del servidor',
        })
    }

    try {
        const datos = jwt.verify(token, jwtSecret)

        if (
            typeof datos === 'string' ||
            typeof datos.id !== 'number' ||
            typeof datos.email !== 'string' ||
            !ROLES.includes(datos.rol)
        ) {
            return res.status(401).json({
                mensaje: 'Token de autenticación inválido',
            })
        }

        req.usuario = {
            id: datos.id,
            email: datos.email,
            rol: datos.rol as DatosToken['rol'],
        }

        return next()
    } catch {
        return res.status(401).json({
            mensaje: 'Token inválido o expirado',
        })
    }
}
