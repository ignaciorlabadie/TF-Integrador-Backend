import type { Request, Response } from 'express'

import {
    listarPacientes,
    buscarPacientePorId,
    buscarPacientePorUsuarioId,
    crearPaciente,
    actualizarPaciente,
} from '../services/pacienteService.js'

import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import {
    esEmailValido,
    esPasswordValida,
    esDniValido,
    esTelefonoValido,
    esFechaNacimientoValida,
} from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

function esTextoValido(
    valor: unknown,
    min: number,
    max: number,
): valor is string {
    if (typeof valor !== 'string') {
        return false
    }

    const longitud = valor.trim().length

    return longitud >= min && longitud <= max
}

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

export async function obtenerPacientes(_req: Request, res: Response) {
    const pacientes = await listarPacientes()

    return res.status(200).json(pacientes)
}

export async function obtenerPacientePorId(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const paciente = await buscarPacientePorId(id)

    if (!paciente) {
        throw new AppError(404, 'Paciente no encontrado')
    }

    return res.status(200).json(paciente)
}

export async function obtenerMiPerfil(req: Request, res: Response) {
    const usuarioId = req.usuario?.id

    if (usuarioId === undefined) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    const paciente = await buscarPacientePorUsuarioId(usuarioId)

    if (!paciente) {
        throw new AppError(404, 'Paciente no encontrado')
    }

    return res.status(200).json(paciente)
}

export async function registrarPaciente(req: Request, res: Response) {
    const {
        email,
        password,
        nombre,
        apellido,
        dni,
        telefono,
        fechaNacimiento,
        direccion,
    } = req.body

    if (
        typeof email !== 'string' ||
        !esEmailValido(email.trim()) ||
        typeof password !== 'string' ||
        !esPasswordValida(password) ||
        !esTextoValido(nombre, 2, 100) ||
        !esTextoValido(apellido, 2, 100) ||
        typeof dni !== 'string' ||
        !esDniValido(dni) ||
        typeof telefono !== 'string' ||
        !esTelefonoValido(telefono) ||
        typeof fechaNacimiento !== 'string' ||
        !esFechaNacimientoValida(fechaNacimiento) ||
        !esTextoValido(direccion, 3, 150)
    ) {
        throw new AppError(400, 'Datos de paciente inválidos')
    }

    const paciente = await crearPaciente({
        email,
        password,
        nombre,
        apellido,
        dni,
        telefono,
        fechaNacimiento,
        direccion,
    })

    return res.status(201).json(paciente)
}

export async function modificarPaciente(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const datos = validarDatosActualizacion(req.body)

    const paciente = await actualizarPaciente(id, datos)

    return res.status(200).json(paciente)
}

export async function modificarMiPerfil(req: Request, res: Response) {
    const usuarioId = req.usuario?.id

    if (usuarioId === undefined) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    const paciente = await buscarPacientePorUsuarioId(usuarioId)

    if (!paciente) {
        throw new AppError(404, 'Paciente no encontrado')
    }

    const datos = validarDatosActualizacion(req.body)

    const pacienteActualizado = await actualizarPaciente(paciente.id, datos)

    return res.status(200).json(pacienteActualizado)
}
