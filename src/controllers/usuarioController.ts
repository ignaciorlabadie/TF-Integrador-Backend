import type { NextFunction, Request, Response } from 'express'

import { usuarioService } from '../services/usuarioService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { esEmailValido, esPasswordValida } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'
import { validarCrearUsuario } from '../validators/validarCrearUsuario.js'

export class UsuarioController {
    async listar(_req: Request, res: Response, next: NextFunction) {
        try {
            const usuarios = await usuarioService.listar()

            return res.status(200).json(usuarios)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const usuario = await usuarioService.buscarPorId(id)

            if (!usuario) {
                throw new AppError(404, 'Usuario no encontrado')
            }

            return res.status(200).json(usuario)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const email = req.params.email

            if (typeof email !== 'string' || !email.trim()) {
                throw new AppError(400, 'El email es obligatorio')
            }

            const usuario = await usuarioService.buscarPorEmail(email)

            if (!usuario) {
                throw new AppError(404, 'Usuario no encontrado')
            }

            return res.status(200).json(usuario)
        } catch (error) {
            return next(error)
        }
    }

    /**
     * Alta de cuentas por parte de un administrador. Los pacientes no se dan de
     * alta acá: su registro público es POST /pacientes, que crea el usuario y su
     * perfil en una sola transacción.
     */
    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const validacion = validarCrearUsuario(req.body)

            if (!validacion.ok) {
                throw new AppError(400, validacion.mensaje)
            }

            const { datos } = validacion

            if (datos.rol === 'PACIENTE') {
                throw new AppError(400, MENSAJES.ALTA_PACIENTE_EN_PACIENTES)
            }

            const usuario = await usuarioService.crear(datos)

            return res.status(201).json(usuario)
        } catch (error) {
            return next(error)
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const { email, activo, password } = req.body

            if (
                email === undefined &&
                activo === undefined &&
                password === undefined
            ) {
                throw new AppError(400, 'Datos de actualización inválidos')
            }

            if (
                (email !== undefined &&
                    (typeof email !== 'string' ||
                        !esEmailValido(email.trim()))) ||
                (activo !== undefined && typeof activo !== 'boolean') ||
                (password !== undefined &&
                    (typeof password !== 'string' ||
                        !esPasswordValida(password)))
            ) {
                throw new AppError(400, 'Datos de actualización inválidos')
            }

            if (activo !== undefined && req.usuario?.rol !== 'ADMIN') {
                throw new AppError(403, MENSAJES.SIN_PERMISOS)
            }

            const usuario = await usuarioService.actualizar(id, {
                email,
                activo,
                password,
            })

            return res.status(200).json(usuario)
        } catch (error) {
            return next(error)
        }
    }

    async desactivar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const usuario = await usuarioService.desactivar(id)

            return res.status(200).json(usuario)
        } catch (error) {
            return next(error)
        }
    }

    async reactivar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const usuario = await usuarioService.reactivar(id)

            return res.status(200).json(usuario)
        } catch (error) {
            return next(error)
        }
    }
}

export const usuarioController = new UsuarioController()
