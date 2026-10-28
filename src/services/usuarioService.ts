import { UniqueConstraintError } from 'sequelize'
import type { Transaction } from 'sequelize'

import Usuario from '../models/Usuario.js'
import type { CrearCuenta } from '../types/CrearCuenta.js'
import type { CrearUsuario } from '../types/CrearUsuario.js'
import type { ActualizarUsuario } from '../types/ActualizarUsuario.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { hashPassword } from '../utils/passwords.js'
import { normalizarEmail } from '../utils/validacion.js'

const atributosUsuario = {
    attributes: { exclude: ['password'] },
}

function opcionesTransaccion(transaction?: Transaction): {
    transaction?: Transaction
} {
    if (!transaction) {
        return {}
    }

    return { transaction }
}

export class UsuarioService {
    async listar() {
        return Usuario.findAll({
            ...atributosUsuario,
        })
    }

    async buscarPorId(id: number) {
        return Usuario.findByPk(id, {
            ...atributosUsuario,
        })
    }

    async buscarPorEmail(email: string) {
        const usuarioMail = normalizarEmail(email)

        return Usuario.findOne({
            where: { email: usuarioMail },
            ...atributosUsuario,
        })
    }

    /**
     * Primitiva única de alta de cuenta: normaliza el email, verifica que no
     * exista, hashea la contraseña e inserta el usuario. Si se pasa una
     * transacción, la usa para que el alta forme parte de un lote atómico
     * (cuenta + perfil).
     */
    async crearCuenta(
        datos: CrearCuenta,
        opciones: { transaction?: Transaction } = {},
    ) {
        const email = normalizarEmail(datos.email)

        const usuarioExistente = await Usuario.findOne({
            where: { email },
            ...opcionesTransaccion(opciones.transaction),
        })

        if (usuarioExistente) {
            throw new AppError(409, MENSAJES.EMAIL_YA_REGISTRADO)
        }

        const passwordHasheada = await hashPassword(datos.password)

        try {
            return await Usuario.create(
                {
                    email,
                    password: passwordHasheada,
                    rol: datos.rol,
                    ...(datos.activo !== undefined
                        ? { activo: datos.activo }
                        : {}),
                },
                opcionesTransaccion(opciones.transaction),
            )
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError(409, MENSAJES.EMAIL_YA_REGISTRADO)
            }

            throw error
        }
    }

    async crear(datos: CrearUsuario) {
        const usuario = await this.crearCuenta({
            email: datos.email,
            password: datos.password,
            rol: datos.rol,
            ...(datos.activo !== undefined ? { activo: datos.activo } : {}),
        })

        return {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol,
            activo: usuario.activo,
        }
    }

    async actualizar(id: number, datos: ActualizarUsuario) {
        const usuario = await Usuario.findByPk(id)

        if (!usuario) {
            throw new AppError(404, 'Usuario no encontrado')
        }

        if (datos.email !== undefined) {
            const email = normalizarEmail(datos.email)

            const usuarioExistente = await Usuario.findOne({
                where: { email },
            })

            if (usuarioExistente && usuarioExistente.id !== id) {
                throw new AppError(409, MENSAJES.EMAIL_YA_REGISTRADO)
            }

            usuario.email = email
        }

        if (datos.activo !== undefined) {
            usuario.activo = datos.activo
        }

        if (datos.password !== undefined) {
            usuario.password = await hashPassword(datos.password)
        }

        try {
            await usuario.save()
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError(409, MENSAJES.EMAIL_YA_REGISTRADO)
            }

            throw error
        }

        return Usuario.findByPk(id, {
            ...atributosUsuario,
        })
    }

    async desactivar(id: number) {
        // El usuario no se elimina, cambia el campo 'activo' a false.
        const usuario = await Usuario.findByPk(id)

        if (!usuario) {
            throw new AppError(404, 'Usuario no encontrado')
        }

        if (!usuario.activo) {
            throw new AppError(409, 'El usuario ya está desactivado')
        }

        usuario.activo = false

        await usuario.save()

        return Usuario.findByPk(id, {
            ...atributosUsuario,
        })
    }

    async reactivar(id: number) {
        const usuario = await Usuario.findByPk(id)

        if (!usuario) {
            throw new AppError(404, 'Usuario no encontrado')
        }

        if (usuario.activo) {
            throw new AppError(409, 'El usuario ya está activo')
        }

        usuario.activo = true

        await usuario.save()

        return Usuario.findByPk(id, {
            ...atributosUsuario,
        })
    }
}

export const usuarioService = new UsuarioService()
