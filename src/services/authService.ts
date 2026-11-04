import jwt from 'jsonwebtoken'

import Usuario from '../models/Usuario.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { enviarEmailRecuperacion } from './emailService.js'
import { hashPassword, verificarPassword } from '../utils/passwords.js'
import { generarTokenReseteo, hashearToken } from '../utils/tokens.js'
import {
    PASSWORD_MAXIMO,
    PASSWORD_MINIMO,
    esPasswordValida,
    normalizarEmail,
} from '../utils/validacion.js'

const TTL_RECUPERACION_POR_DEFECTO = 30

export async function iniciarSesion(email: string, password: string) {
    const emailNormalizado = normalizarEmail(email)

    const usuario = await Usuario.findOne({
        where: { email: emailNormalizado },
    })

    if (!usuario) {
        throw new AppError(401, 'Email o contraseña incorrectos')
    }

    if (!usuario.activo) {
        throw new AppError(403, 'El usuario está desactivado')
    }

    const passwordValida = await verificarPassword(password, usuario.password)

    if (!passwordValida) {
        throw new AppError(401, 'Email o contraseña incorrectos')
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
        throw new AppError(500, 'JWT_SECRET no está configurado')
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1d'

    const token = jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol,
        },
        jwtSecret,
        { expiresIn: expiresIn as NonNullable<jwt.SignOptions['expiresIn']> },
    )

    return {
        token,
        usuario: {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol,
            activo: usuario.activo,
        },
    }
}

function obtenerTtlRecuperacionMinutos(): number {
    const configurado = Number(process.env.RESET_TOKEN_TTL_MINUTES)

    if (!Number.isInteger(configurado) || configurado <= 0) {
        return TTL_RECUPERACION_POR_DEFECTO
    }

    return configurado
}

function obtenerUrlFrontend(): string {
    const url = process.env.FRONTEND_URL?.trim()

    if (!url) {
        throw new AppError(500, 'FRONTEND_URL no está configurado')
    }

    return url.replace(/\/+$/, '')
}

export async function solicitarRecuperacion(email: string): Promise<void> {
    const emailNormalizado = normalizarEmail(email)

    const usuario = await Usuario.findOne({
        where: { email: emailNormalizado },
    })

    if (!usuario || !usuario.activo) {
        return
    }

    const { token, hash } = generarTokenReseteo()

    usuario.resetPasswordTokenHash = hash
    usuario.resetPasswordExpiresAt = new Date(
        Date.now() + obtenerTtlRecuperacionMinutos() * 60 * 1000,
    )

    await usuario.save()

    try {
        const url = `${obtenerUrlFrontend()}/reset-password?token=${token}`

        await enviarEmailRecuperacion(usuario.email, url)
    } catch (error) {
        console.error('No se pudo enviar el email de recuperación', error)
    }
}

export async function restablecerPassword(
    token: string,
    nuevaPassword: string,
): Promise<void> {
    if (!esPasswordValida(nuevaPassword)) {
        throw new AppError(
            400,
            `La contraseña debe tener entre ${PASSWORD_MINIMO} y ${PASSWORD_MAXIMO} caracteres`,
        )
    }

    const tokenHash = hashearToken(token)

    const usuario = await Usuario.findOne({
        where: { resetPasswordTokenHash: tokenHash },
    })

    if (!usuario || !usuario.resetPasswordExpiresAt) {
        throw new AppError(400, MENSAJES.TOKEN_RECUPERACION_INVALIDO)
    }

    if (usuario.resetPasswordExpiresAt.getTime() <= Date.now()) {
        throw new AppError(400, MENSAJES.TOKEN_RECUPERACION_INVALIDO)
    }

    usuario.password = await hashPassword(nuevaPassword)
    usuario.resetPasswordTokenHash = null
    usuario.resetPasswordExpiresAt = null

    await usuario.save()
}
