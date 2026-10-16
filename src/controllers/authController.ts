import type { Request, Response } from 'express'

import { iniciarSesion } from '../services/authService.js'
import { buscarUsuarioPorId } from '../services/usuarioService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'

export async function login(req: Request, res: Response) {
    const { email, password } = req.body

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        throw new AppError(400, 'Email y contraseña son obligatorios')
    }

    const resultado = await iniciarSesion(email, password)

    return res.status(200).json(resultado)
}

export async function obtenerPerfil(req: Request, res: Response) {
    const id = req.usuario?.id

    if (id === undefined) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    const usuario = await buscarUsuarioPorId(id)

    if (!usuario) {
        throw new AppError(404, 'Usuario no encontrado')
    }

    return res.status(200).json(usuario)
}
