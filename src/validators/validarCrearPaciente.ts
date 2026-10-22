import type { CrearPaciente } from '../types/CrearPaciente.js'
import {
    PASSWORD_MAXIMO,
    PASSWORD_MINIMO,
    esDniValido,
    esEmailValido,
    esFechaNacimientoValida,
    esPasswordValida,
    esTelefonoValido,
    esTextoValido,
} from '../utils/validacion.js'
import type { ResultadoValidacion } from './tipos.js'

export function validarCrearPaciente(
    body: unknown,
): ResultadoValidacion<CrearPaciente> {
    if (typeof body !== 'object' || body === null) {
        return { ok: false, mensaje: 'Datos de paciente inválidos' }
    }

    const {
        email,
        password,
        nombre,
        apellido,
        dni,
        telefono,
        fechaNacimiento,
        direccion,
    } = body as Record<string, unknown>

    if (typeof email !== 'string' || !esEmailValido(email.trim())) {
        return { ok: false, mensaje: 'El email no tiene un formato válido' }
    }

    if (!esPasswordValida(password)) {
        return {
            ok: false,
            mensaje: `La contraseña debe tener entre ${PASSWORD_MINIMO} y ${PASSWORD_MAXIMO} caracteres`,
        }
    }

    if (!esTextoValido(nombre, 2, 100)) {
        return {
            ok: false,
            mensaje: 'El nombre debe tener entre 2 y 100 caracteres',
        }
    }

    if (!esTextoValido(apellido, 2, 100)) {
        return {
            ok: false,
            mensaje: 'El apellido debe tener entre 2 y 100 caracteres',
        }
    }

    if (typeof dni !== 'string' || !esDniValido(dni)) {
        return { ok: false, mensaje: 'El DNI debe tener entre 7 y 8 dígitos' }
    }

    if (typeof telefono !== 'string' || !esTelefonoValido(telefono)) {
        return {
            ok: false,
            mensaje:
                'El teléfono debe tener entre 6 y 25 dígitos, con prefijo opcional',
        }
    }

    if (
        typeof fechaNacimiento !== 'string' ||
        !esFechaNacimientoValida(fechaNacimiento)
    ) {
        return {
            ok: false,
            mensaje: 'La fecha de nacimiento no es válida',
        }
    }

    if (!esTextoValido(direccion, 3, 150)) {
        return {
            ok: false,
            mensaje: 'La dirección debe tener entre 3 y 150 caracteres',
        }
    }

    const datos: CrearPaciente = {
        email,
        password,
        nombre,
        apellido,
        dni,
        telefono,
        fechaNacimiento,
        direccion,
    }

    return { ok: true, datos }
}
