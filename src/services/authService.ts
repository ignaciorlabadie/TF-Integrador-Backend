import jwt from 'jsonwebtoken'

import Usuario from '../models/Usuario.js'
import { AppError } from '../errors/AppError.js'
import { verificarPassword } from '../utils/passwords.js'
import { normalizarEmail } from '../utils/validacion.js'

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
