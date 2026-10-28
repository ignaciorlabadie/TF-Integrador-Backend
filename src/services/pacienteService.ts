import { UniqueConstraintError } from 'sequelize'

import { Estudio, Paciente, Turno, Usuario } from '../models/index.js'
import sequelize from '../config/database.js'
import { usuarioService } from './usuarioService.js'
import type { CrearPaciente } from '../types/CrearPaciente.js'
import type { ActualizarPaciente } from '../types/ActualizarPaciente.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { normalizarEmail } from '../utils/validacion.js'

const atributosUsuario = {
    attributes: { exclude: ['password'] },
}

export class PacienteService {
    async listar() {
        return Paciente.findAll({
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

    async buscarPorId(id: number) {
        return Paciente.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    ...atributosUsuario,
                },
            ],
        })
    }

    async buscarPorUsuarioId(usuarioId: number) {
        return Paciente.findOne({
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

    async crear(datos: CrearPaciente) {
        const email = normalizarEmail(datos.email)

        const paciente = await sequelize.transaction(async (transaction) => {
            const pacienteExistente = await Paciente.findOne({
                where: { dni: datos.dni },
                transaction,
            })

            if (pacienteExistente) {
                throw new AppError(409, MENSAJES.DNI_YA_REGISTRADO)
            }

            const usuario = await usuarioService.crearCuenta(
                {
                    email,
                    password: datos.password,
                    rol: 'PACIENTE',
                },
                { transaction },
            )

            try {
                return await Paciente.create(
                    {
                        usuarioId: usuario.id,
                        nombre: datos.nombre,
                        apellido: datos.apellido,
                        dni: datos.dni,
                        telefono: datos.telefono,
                        fechaNacimiento: datos.fechaNacimiento,
                        direccion: datos.direccion,
                    },
                    { transaction },
                )
            } catch (error) {
                if (error instanceof UniqueConstraintError) {
                    throw new AppError(409, MENSAJES.DNI_YA_REGISTRADO)
                }

                throw error
            }
        })

        return Paciente.findByPk(paciente.id, {
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    ...atributosUsuario,
                },
            ],
        })
    }

    async actualizar(id: number, datos: ActualizarPaciente) {
        const paciente = await Paciente.findByPk(id)

        if (!paciente) {
            throw new AppError(404, 'Paciente no encontrado')
        }

        if (datos.dni !== undefined && datos.dni !== paciente.dni) {
            const pacienteExistente = await Paciente.findOne({
                where: { dni: datos.dni },
            })

            if (pacienteExistente && pacienteExistente.id !== id) {
                throw new AppError(409, MENSAJES.DNI_YA_REGISTRADO)
            }

            paciente.dni = datos.dni
        }

        if (datos.nombre !== undefined) {
            paciente.nombre = datos.nombre
        }

        if (datos.apellido !== undefined) {
            paciente.apellido = datos.apellido
        }

        if (datos.telefono !== undefined) {
            paciente.telefono = datos.telefono
        }

        if (datos.fechaNacimiento !== undefined) {
            paciente.fechaNacimiento = datos.fechaNacimiento
        }

        if (datos.direccion !== undefined) {
            paciente.direccion = datos.direccion
        }

        await paciente.save()

        return Paciente.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    ...atributosUsuario,
                },
            ],
        })
    }

    async eliminar(id: number) {
        const paciente = await Paciente.findByPk(id)

        if (!paciente) {
            throw new AppError(404, 'Paciente no encontrado')
        }

        const [cantidadTurnos, cantidadEstudios] = await Promise.all([
            Turno.count({ where: { pacienteId: id } }),
            Estudio.count({ where: { pacienteId: id } }),
        ])

        if (cantidadTurnos > 0 || cantidadEstudios > 0) {
            throw new AppError(
                409,
                'No se puede eliminar el paciente porque tiene turnos o estudios asociados',
            )
        }

        const usuarioId = paciente.usuarioId

        await sequelize.transaction(async (transaction) => {
            await paciente.destroy({ transaction })
            await Usuario.destroy({ where: { id: usuarioId }, transaction })
        })
    }
}

export const pacienteService = new PacienteService()
