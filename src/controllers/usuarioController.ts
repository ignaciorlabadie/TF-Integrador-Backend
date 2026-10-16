import type { Request, Response } from 'express'

import {
    listarUsuarios,
    buscarUsuarioPorId,
    buscarUsuarioPorEmail,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
} from '../services/usuarioService.js'

import { ROLES } from '../types/Rol.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { esEmailValido, esPasswordValida } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

export async function obtenerUsuarios(_req: Request, res: Response) {
    const usuarios = await listarUsuarios()

    return res.status(200).json(usuarios)
}

export async function obtenerUsuarioPorId(req: Request, res: Response) {
    const id = validarId(req)

    const usuario = await buscarUsuarioPorId(id)

    if (!usuario) {
        throw new AppError(404, 'Usuario no encontrado')
    }

    return res.status(200).json(usuario)
}

export async function obtenerUsuarioPorEmail(req: Request, res: Response) {
    const email = req.params.email

    if (typeof email !== 'string' || !email.trim()) {
        throw new AppError(400, 'El email es obligatorio')
    }

    const usuario = await buscarUsuarioPorEmail(email)

    if (!usuario) {
        throw new AppError(404, 'Usuario no encontrado')
    }

    return res.status(200).json(usuario)
}

export async function registrarUsuario(req: Request, res: Response) {
    const { email, password, rol } = req.body

    if (
        typeof email !== 'string' ||
        !esEmailValido(email.trim()) ||
        typeof password !== 'string' ||
        !esPasswordValida(password) ||
        !ROLES.includes(rol)
    ) {
        throw new AppError(400, 'Datos de usuario inválidos')
    }

    if (rol !== 'PACIENTE') {
        throw new AppError(
            400,
            'El registro público solo permite crear pacientes',
        )
    }

    const usuario = await crearUsuario({ email, password, rol })

    return res.status(201).json(usuario)
}

export async function modificarUsuario(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const { email, activo, password } = req.body

    if (email === undefined && activo === undefined && password === undefined) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    if (
        (email !== undefined &&
            (typeof email !== 'string' || !esEmailValido(email.trim()))) ||
        (activo !== undefined && typeof activo !== 'boolean') ||
        (password !== undefined &&
            (typeof password !== 'string' || !esPasswordValida(password)))
    ) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    if (activo !== undefined && req.usuario?.rol !== 'ADMIN') {
        throw new AppError(403, MENSAJES.SIN_PERMISOS)
    }

    const usuario = await actualizarUsuario(id, { email, activo, password })

    return res.status(200).json(usuario)
}

export async function desactivarUsuarioController(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const usuario = await desactivarUsuario(id)

    return res.status(200).json(usuario)
}

export async function reactivarUsuarioController(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const usuario = await reactivarUsuario(id)

    return res.status(200).json(usuario)
}
