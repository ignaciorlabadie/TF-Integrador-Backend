import type { NextFunction, Request, Response } from 'express'

import { pacienteService } from '../services/pacienteService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import {
    esDniValido,
    esFechaNacimientoValida,
    esTelefonoValido,
    esTextoValido,
} from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'
import { validarCrearPaciente } from '../validators/validarCrearPaciente.js'

function validarDatosActualizacion(body: Request['body']) {
    const { nombre, apellido, dni, telefono, fechaNacimiento, direccion } = body

    if (
        nombre === undefined &&
        apellido === undefined &&
        dni === undefined &&
        telefono === undefined &&
        fechaNacimiento === undefined &&
        direccion === undefined
    ) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    if (
        (nombre !== undefined && !esTextoValido(nombre, 2, 100)) ||
        (apellido !== undefined && !esTextoValido(apellido, 2, 100)) ||
        (dni !== undefined && (typeof dni !== 'string' || !esDniValido(dni))) ||
        (telefono !== undefined &&
            (typeof telefono !== 'string' || !esTelefonoValido(telefono))) ||
        (fechaNacimiento !== undefined &&
            (typeof fechaNacimiento !== 'string' ||
                !esFechaNacimientoValida(fechaNacimiento))) ||
        (direccion !== undefined && !esTextoValido(direccion, 3, 150))
    ) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    return { nombre, apellido, dni, telefono, fechaNacimiento, direccion }
}

export class PacienteController {
    async listar(_req: Request, res: Response, next: NextFunction) {
        try {
            const pacientes = await pacienteService.listar()

            return res.status(200).json(pacientes)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const paciente = await pacienteService.buscarPorId(id)

            if (!paciente) {
                throw new AppError(404, 'Paciente no encontrado')
            }

            return res.status(200).json(paciente)
        } catch (error) {
            return next(error)
        }
    }

    async obtenerMiPerfil(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id

            if (usuarioId === undefined) {
                throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
            }

            const paciente = await pacienteService.buscarPorUsuarioId(usuarioId)

            if (!paciente) {
                throw new AppError(404, 'Paciente no encontrado')
            }

            return res.status(200).json(paciente)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const validacion = validarCrearPaciente(req.body)

            if (!validacion.ok) {
                throw new AppError(400, validacion.mensaje)
            }

            const paciente = await pacienteService.crear(validacion.datos)

            return res.status(201).json(paciente)
        } catch (error) {
            return next(error)
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const datos = validarDatosActualizacion(req.body)

            const paciente = await pacienteService.actualizar(id, datos)

            return res.status(200).json(paciente)
        } catch (error) {
            return next(error)
        }
    }

    async actualizarMiPerfil(req: Request, res: Response, next: NextFunction) {
        try {
            const usuarioId = req.usuario?.id

            if (usuarioId === undefined) {
                throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
            }

            const paciente = await pacienteService.buscarPorUsuarioId(usuarioId)

            if (!paciente) {
                throw new AppError(404, 'Paciente no encontrado')
            }

            const datos = validarDatosActualizacion(req.body)

            const pacienteActualizado = await pacienteService.actualizar(
                paciente.id,
                datos,
            )

            return res.status(200).json(pacienteActualizado)
        } catch (error) {
            return next(error)
        }
    }

    async eliminar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            await pacienteService.eliminar(id)

            return res.status(204).send()
        } catch (error) {
            return next(error)
        }
    }
}

export const pacienteController = new PacienteController()
