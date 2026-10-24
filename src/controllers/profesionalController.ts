import type { NextFunction, Request, Response } from 'express'

import { profesionalService } from '../services/profesionalService.js'
import type { ActualizarProfesional } from '../types/ActualizarProfesional.js'
import type { CrearProfesional } from '../types/CrearProfesional.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { validarId } from '../utils/validarId.js'
import {
    esDniValido,
    esTelefonoValido,
    esTextoValido,
} from '../utils/validacion.js'

function validarCrearProfesional(body: Request['body']): CrearProfesional {
    const {
        usuarioId,
        nombre,
        apellido,
        dni,
        telefono,
        matricula,
        especialidad,
    } = body ?? {}

    if (
        usuarioId === undefined ||
        nombre === undefined ||
        apellido === undefined ||
        dni === undefined ||
        telefono === undefined ||
        matricula === undefined ||
        especialidad === undefined
    ) {
        throw new AppError(
            400,
            'Faltan datos obligatorios: nombre, apellido, dni, telefono, matricula, especialidad y usuarioId',
        )
    }

    if (!Number.isInteger(usuarioId)) {
        throw new AppError(400, 'El usuarioId debe ser un número entero')
    }

    if (
        !esTextoValido(nombre, 2, 100) ||
        !esTextoValido(apellido, 2, 100) ||
        !esTextoValido(matricula, 1, 30) ||
        !esTextoValido(especialidad, 2, 100) ||
        typeof dni !== 'string' ||
        !esDniValido(dni) ||
        typeof telefono !== 'string' ||
        !esTelefonoValido(telefono)
    ) {
        throw new AppError(400, 'Datos del profesional inválidos')
    }

    return {
        usuarioId,
        nombre,
        apellido,
        dni,
        telefono,
        matricula,
        especialidad,
    }
}

function validarDatosActualizacion(
    body: Request['body'],
): ActualizarProfesional {
    const datos: ActualizarProfesional = {}
    const cuerpo = body ?? {}

    if (typeof cuerpo !== 'object') {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    // usuarioId no forma parte de los campos modificables: se ignora si viene.
    if (cuerpo.nombre !== undefined) {
        if (!esTextoValido(cuerpo.nombre, 2, 100)) {
            throw new AppError(400, 'Datos de actualización inválidos')
        }

        datos.nombre = cuerpo.nombre
    }

    if (cuerpo.apellido !== undefined) {
        if (!esTextoValido(cuerpo.apellido, 2, 100)) {
            throw new AppError(400, 'Datos de actualización inválidos')
        }

        datos.apellido = cuerpo.apellido
    }

    if (cuerpo.dni !== undefined) {
        if (typeof cuerpo.dni !== 'string' || !esDniValido(cuerpo.dni)) {
            throw new AppError(400, 'Datos de actualización inválidos')
        }

        datos.dni = cuerpo.dni
    }

    if (cuerpo.telefono !== undefined) {
        if (
            typeof cuerpo.telefono !== 'string' ||
            !esTelefonoValido(cuerpo.telefono)
        ) {
            throw new AppError(400, 'Datos de actualización inválidos')
        }

        datos.telefono = cuerpo.telefono
    }

    if (cuerpo.matricula !== undefined) {
        if (!esTextoValido(cuerpo.matricula, 1, 30)) {
            throw new AppError(400, 'Datos de actualización inválidos')
        }

        datos.matricula = cuerpo.matricula
    }

    if (cuerpo.especialidad !== undefined) {
        if (!esTextoValido(cuerpo.especialidad, 2, 100)) {
            throw new AppError(400, 'Datos de actualización inválidos')
        }

        datos.especialidad = cuerpo.especialidad
    }

    if (Object.keys(datos).length === 0) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    return datos
}

export class ProfesionalController {
    async listar(_req: Request, res: Response, next: NextFunction) {
        try {
            const profesionales = await profesionalService.listar()

            return res.status(200).json(profesionales)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const profesional = await profesionalService.buscarPorId(id)

            if (!profesional) {
                throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
            }

            return res.status(200).json(profesional)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorUsuarioId(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id

            if (usuarioId === undefined) {
                throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
            }

            const profesional =
                await profesionalService.buscarPorUsuarioId(usuarioId)

            if (!profesional) {
                throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
            }

            return res.status(200).json(profesional)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const datos = validarCrearProfesional(req.body)

            const profesional = await profesionalService.crear(datos)

            return res.status(201).json(profesional)
        } catch (error) {
            return next(error)
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const datos = validarDatosActualizacion(req.body)

            const usuarioId = req.usuario?.id

            if (usuarioId === undefined) {
                throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
            }

            const profesional = await profesionalService.buscarPorId(id)

            if (!profesional) {
                throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
            }

            // Solo un ADMIN gestiona perfiles ajenos; el resto solo el propio.
            if (
                req.usuario?.rol !== 'ADMIN' &&
                profesional.usuarioId !== usuarioId
            ) {
                throw new AppError(403, MENSAJES.SIN_PERMISOS)
            }

            const actualizado = await profesionalService.actualizar(id, datos)

            return res.status(200).json(actualizado)
        } catch (error) {
            return next(error)
        }
    }
}

export const profesionalController = new ProfesionalController()
