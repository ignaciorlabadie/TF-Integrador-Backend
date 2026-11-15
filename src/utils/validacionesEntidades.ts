import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { DIAS_SEMANA } from '../types/DiaSemana.js'
import type { DiaSemana } from '../types/DiaSemana.js'
import { TIPOS_ASIGNACION } from '../types/TipoAsignacionEspacio.js'
import type { TipoAsignacionEspacio } from '../types/TipoAsignacionEspacio.js'
import { TIPOS_ESPACIO } from '../types/TipoEspacio.js'
import type { TipoEspacio } from '../types/TipoEspacio.js'
import { UBICACIONES_ESPACIO } from '../types/UbicacionEspacio.js'
import type { UbicacionEspacio } from '../types/UbicacionEspacio.js'

function perteneceA<T extends string>(
    valor: unknown,
    valores: readonly T[],
): valor is T {
    return (
        typeof valor === 'string' &&
        (valores as readonly string[]).includes(valor)
    )
}

export function esDiaSemanaValido(valor: unknown): valor is DiaSemana {
    return perteneceA(valor, DIAS_SEMANA)
}

export function validarDiaSemana(valor: unknown): DiaSemana {
    if (!esDiaSemanaValido(valor)) {
        throw new AppError(400, MENSAJES.DIA_SEMANA_INVALIDO)
    }

    return valor
}

export function esTipoAsignacionValido(
    valor: unknown,
): valor is TipoAsignacionEspacio {
    return perteneceA(valor, TIPOS_ASIGNACION)
}

export function validarTipoAsignacion(
    valor: unknown,
): TipoAsignacionEspacio {
    if (!esTipoAsignacionValido(valor)) {
        throw new AppError(400, MENSAJES.TIPO_ASIGNACION_INVALIDO)
    }

    return valor
}

export function esTipoEspacioValido(valor: unknown): valor is TipoEspacio {
    return perteneceA(valor, TIPOS_ESPACIO)
}

export function validarTipoEspacio(valor: unknown): TipoEspacio {
    if (!esTipoEspacioValido(valor)) {
        throw new AppError(400, MENSAJES.TIPO_ESPACIO_INVALIDO)
    }

    return valor
}

export function esUbicacionEspacioValida(
    valor: unknown,
): valor is UbicacionEspacio {
    return perteneceA(valor, UBICACIONES_ESPACIO)
}

export function validarUbicacionEspacio(
    valor: unknown,
): UbicacionEspacio {
    if (!esUbicacionEspacioValida(valor)) {
        throw new AppError(400, MENSAJES.UBICACION_ESPACIO_INVALIDA)
    }

    return valor
}