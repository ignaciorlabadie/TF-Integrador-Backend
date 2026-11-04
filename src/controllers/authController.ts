import type { Request, Response } from 'express'

import {
    iniciarSesion,
    restablecerPassword,
    solicitarRecuperacion,
} from '../services/authService.js'
import { usuarioService } from '../services/usuarioService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import {
    PASSWORD_MAXIMO,
    PASSWORD_MINIMO,
    esEmailValido,
    esPasswordValida,
} from '../utils/validacion.js'

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

    const usuario = await usuarioService.buscarPorId(id)

    if (!usuario) {
        throw new AppError(404, 'Usuario no encontrado')
    }

    return res.status(200).json(usuario)
}

export async function olvidarPassword(req: Request, res: Response) {
    const { email } = req.body

    if (typeof email !== 'string' || !esEmailValido(email.trim())) {
        throw new AppError(400, 'El email no tiene un formato válido')
    }

    await solicitarRecuperacion(email)

    return res.status(200).json({
        mensaje: MENSAJES.RECUPERACION_SOLICITADA,
    })
}

export async function resetearPassword(req: Request, res: Response) {
    const { token, password } = req.body

    if (typeof token !== 'string' || !token.trim()) {
        throw new AppError(400, 'El token es obligatorio')
    }

    if (!esPasswordValida(password)) {
        throw new AppError(
            400,
            `La contraseña debe tener entre ${PASSWORD_MINIMO} y ${PASSWORD_MAXIMO} caracteres`,
        )
    }

    await restablecerPassword(token.trim(), password)

    return res.status(200).json({
        mensaje: MENSAJES.PASSWORD_ACTUALIZADA,
    })
}
