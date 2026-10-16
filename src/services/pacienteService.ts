import bcrypt from 'bcryptjs'

import { Paciente, Usuario } from '../models/index.js'
import sequelize from '../config/database.js'
import type { CrearPaciente } from '../types/CrearPaciente.js'
import type { ActualizarPaciente } from '../types/ActualizarPaciente.js'
import { AppError } from '../errors/AppError.js'

const atributosUsuario = {
    attributes: { exclude: ['password'] },
}

export async function listarPacientes() {
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

export async function buscarPacientePorId(id: number) {
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

export async function buscarPacientePorUsuarioId(usuarioId: number) {
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

export async function crearPaciente(datos: CrearPaciente) {
    const email = datos.email.trim().toLowerCase()

    const usuarioExistente = await Usuario.findOne({
        where: { email },
    })

    if (usuarioExistente) {
        throw new AppError(409, 'El email ya está registrado')
    }

    const pacienteExistente = await Paciente.findOne({
        where: { dni: datos.dni },
    })

    if (pacienteExistente) {
        throw new AppError(409, 'El DNI ya está registrado')
    }

    const passwordHasheada = await bcrypt.hash(datos.password, 10)

    const paciente = await sequelize.transaction(async (transaction) => {
        const usuario = await Usuario.create(
            {
                email,
                password: passwordHasheada,
                rol: 'PACIENTE',
            },
            { transaction },
        )

        return Paciente.create(
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

export async function actualizarPaciente(
    id: number,
    datos: ActualizarPaciente,
) {
    const paciente = await Paciente.findByPk(id)

    if (!paciente) {
        throw new AppError(404, 'Paciente no encontrado')
    }

    if (datos.dni !== undefined && datos.dni !== paciente.dni) {
        const pacienteExistente = await Paciente.findOne({
            where: { dni: datos.dni },
        })

        if (pacienteExistente && pacienteExistente.id !== id) {
            throw new AppError(409, 'El DNI ya está registrado')
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
