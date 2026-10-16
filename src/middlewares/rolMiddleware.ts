import type { Request, Response, NextFunction } from 'express'

import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import type { Rol } from '../types/Rol.js'

export function verificarAdminOPropio(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (!req.usuario) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    const id = Number(req.params.id)
    const esElMismoUsuario = id > 0 && req.usuario.id === id

    if (req.usuario.rol !== 'ADMIN' && !esElMismoUsuario) {
        throw new AppError(403, MENSAJES.SIN_PERMISOS)
    }

    return next()
}

export function verificarRol(...rolesPermitidos: Rol[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.usuario) {
            throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            throw new AppError(403, MENSAJES.SIN_PERMISOS)
        }

        return next()
    }
}
