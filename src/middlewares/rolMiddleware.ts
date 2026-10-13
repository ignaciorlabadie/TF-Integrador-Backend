import type { Request, Response, NextFunction } from 'express'

import type { Rol } from '../types/Rol.js'

export function verificarAdminOPropio(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (!req.usuario) {
        return res.status(401).json({
            mensaje: 'Autenticación requerida',
        })
    }

    const id = Number(req.params.id)
    const esElMismoUsuario = id > 0 && req.usuario.id === id

    if (req.usuario.rol !== 'ADMIN' && !esElMismoUsuario) {
        return res.status(403).json({
            mensaje: 'No tenés permisos para realizar esta acción',
        })
    }

    return next()
}

export function verificarRol(...rolesPermitidos: Rol[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.usuario) {
            return res.status(401).json({
                mensaje: 'Autenticación requerida',
            })
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: 'No tenés permisos para realizar esta acción',
            })
        }

        return next()
    }
}
