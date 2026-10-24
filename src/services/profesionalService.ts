import { UniqueConstraintError } from 'sequelize'

import { Profesional, Usuario } from '../models/index.js'
import type { ActualizarProfesional } from '../types/ActualizarProfesional.js'
import type { CrearProfesional } from '../types/CrearProfesional.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import {
    esDniValido,
    esTelefonoValido,
    esTextoValido,
} from '../utils/validacion.js'

const atributosUsuario = {
    attributes: { exclude: ['password'] },
}

type DatosProfesionales = Partial<CrearProfesional>

function validarTexto(
    valor: unknown,
    min: number,
    max: number,
    nombreCampo: string,
    requerido: boolean,
) {
    if (valor === undefined) {
        if (requerido) {
            throw new AppError(400, `El campo ${nombreCampo} es obligatorio`)
        }

        return
    }

    if (!esTextoValido(valor, min, max)) {
        throw new AppError(
            400,
            `El campo ${nombreCampo} debe tener entre ${min} y ${max} caracteres`,
        )
    }
}

function validarDatosProfesionales(
    datos: DatosProfesionales,
    requerido: boolean,
) {
    validarTexto(datos.nombre, 2, 100, 'nombre', requerido)
    validarTexto(datos.apellido, 2, 100, 'apellido', requerido)
    validarTexto(datos.matricula, 1, 30, 'matrícula', requerido)
    validarTexto(datos.especialidad, 2, 100, 'especialidad', requerido)

    if (datos.dni === undefined) {
        if (requerido) {
            throw new AppError(400, 'El campo dni es obligatorio')
        }
    } else if (typeof datos.dni !== 'string' || !esDniValido(datos.dni)) {
        throw new AppError(400, 'El DNI debe tener 7 u 8 dígitos')
    }

    if (datos.telefono === undefined) {
        if (requerido) {
            throw new AppError(400, 'El campo telefono es obligatorio')
        }
    } else if (
        typeof datos.telefono !== 'string' ||
        !esTelefonoValido(datos.telefono)
    ) {
        throw new AppError(400, 'El teléfono debe tener entre 6 y 25 dígitos')
    }
}

export class ProfesionalService {
    async listar(): Promise<Profesional[]> {
        return Profesional.findAll({
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    ...atributosUsuario,
                },
            ],
            order: [['id', 'ASC']],
        })
    }

    async buscarPorId(id: number): Promise<Profesional | null> {
        return Profesional.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    ...atributosUsuario,
                },
            ],
        })
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<Profesional | null> {
        return Profesional.findOne({
            where: { usuarioId },
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    ...atributosUsuario,
                },
            ],
        })
    }

    async crear(datos: CrearProfesional): Promise<Profesional | null> {
        validarDatosProfesionales(datos, true)

        if (!Number.isInteger(datos.usuarioId)) {
            throw new AppError(400, 'El usuarioId debe ser un número entero')
        }

        const usuario = await Usuario.findByPk(datos.usuarioId)

        if (!usuario) {
            throw new AppError(404, MENSAJES.USUARIO_NO_ENCONTRADO)
        }

        if (usuario.rol !== 'PROFESIONAL') {
            throw new AppError(400, MENSAJES.ROL_PROFESIONAL_REQUERIDO)
        }

        const dniExistente = await Profesional.findOne({
            where: { dni: datos.dni },
        })

        if (dniExistente) {
            throw new AppError(409, MENSAJES.DNI_YA_REGISTRADO)
        }

        const matriculaExistente = await Profesional.findOne({
            where: { matricula: datos.matricula },
        })

        if (matriculaExistente) {
            throw new AppError(409, MENSAJES.MATRICULA_YA_REGISTRADA)
        }

        const perfilAsignado = await Profesional.findOne({
            where: { usuarioId: datos.usuarioId },
        })

        if (perfilAsignado) {
            throw new AppError(409, MENSAJES.PERFIL_YA_ASIGNADO)
        }

        try {
            const profesional = await Profesional.create({
                usuarioId: datos.usuarioId,
                nombre: datos.nombre,
                apellido: datos.apellido,
                dni: datos.dni,
                telefono: datos.telefono,
                matricula: datos.matricula,
                especialidad: datos.especialidad,
            })

            return this.buscarPorId(profesional.id)
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError(
                    409,
                    'Ya existe un profesional con esos datos',
                )
            }

            throw error
        }
    }

    async actualizar(
        id: number,
        datos: ActualizarProfesional,
    ): Promise<Profesional | null> {
        const profesional = await Profesional.findByPk(id)

        if (!profesional) {
            throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
        }

        validarDatosProfesionales(datos, false)

        // usuarioId no es un campo modificable: se omite deliberadamente.
        if (datos.dni !== undefined && datos.dni !== profesional.dni) {
            const dniExistente = await Profesional.findOne({
                where: { dni: datos.dni },
            })

            if (dniExistente && dniExistente.id !== id) {
                throw new AppError(409, MENSAJES.DNI_YA_REGISTRADO)
            }

            profesional.dni = datos.dni
        }

        if (
            datos.matricula !== undefined &&
            datos.matricula !== profesional.matricula
        ) {
            const matriculaExistente = await Profesional.findOne({
                where: { matricula: datos.matricula },
            })

            if (matriculaExistente && matriculaExistente.id !== id) {
                throw new AppError(409, MENSAJES.MATRICULA_YA_REGISTRADA)
            }

            profesional.matricula = datos.matricula
        }

        if (datos.nombre !== undefined) {
            profesional.nombre = datos.nombre
        }

        if (datos.apellido !== undefined) {
            profesional.apellido = datos.apellido
        }

        if (datos.telefono !== undefined) {
            profesional.telefono = datos.telefono
        }

        if (datos.especialidad !== undefined) {
            profesional.especialidad = datos.especialidad
        }

        await profesional.save()

        return this.buscarPorId(id)
    }
}

export const profesionalService = new ProfesionalService()
