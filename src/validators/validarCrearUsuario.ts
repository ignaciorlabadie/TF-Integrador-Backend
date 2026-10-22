import type { CrearUsuario } from '../types/CrearUsuario.js'
import { ROLES } from '../types/Rol.js'
import {
    PASSWORD_MAXIMO,
    PASSWORD_MINIMO,
    esEmailValido,
    esPasswordValida,
    esRolValido,
} from '../utils/validacion.js'
import type { ResultadoValidacion } from './tipos.js'

export function validarCrearUsuario(
    body: unknown,
): ResultadoValidacion<CrearUsuario> {
    if (typeof body !== 'object' || body === null) {
        return { ok: false, mensaje: 'Datos de usuario inválidos' }
    }

    const { email, password, rol, activo } = body as Record<string, unknown>

    if (typeof email !== 'string' || !esEmailValido(email.trim())) {
        return { ok: false, mensaje: 'El email no tiene un formato válido' }
    }

    if (!esPasswordValida(password)) {
        return {
            ok: false,
            mensaje: `La contraseña debe tener entre ${PASSWORD_MINIMO} y ${PASSWORD_MAXIMO} caracteres`,
        }
    }

    if (!esRolValido(rol)) {
        return {
            ok: false,
            mensaje: `El rol debe ser uno de: ${ROLES.join(', ')}`,
        }
    }

    if (activo !== undefined && typeof activo !== 'boolean') {
        return { ok: false, mensaje: 'El campo activo debe ser booleano' }
    }

    const datos: CrearUsuario = {
        email,
        password,
        rol,
        ...(activo !== undefined ? { activo } : {}),
    }

    return { ok: true, datos }
}
