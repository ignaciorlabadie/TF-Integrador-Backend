import { AppError } from '../errors/AppError.js'
import type { DiaSemana } from '../types/DiaSemana.js'

// Acepta HH:mm y HH:mm:ss. Los segundos se descartan al normalizar
// porque PostgreSQL los agrega al leer columnas DataTypes.TIME.
export const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/

// Variante estricta para validaciones HTTP que solo aceptan HH:mm.
export const HORA_REGEX_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

// getUTCDay() devuelve 0=domingo ... 6=sábado.
const DIAS_POR_INDICE: readonly DiaSemana[] = [
    'DOMINGO',
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
]

export function horaAMinutos(valor: unknown): number | null {
    if (typeof valor !== 'string') {
        return null
    }

    const coincidencia = HORA_REGEX.exec(valor)

    if (!coincidencia) {
        return null
    }

    const horasTexto = coincidencia[1]
    const minutosTexto = coincidencia[2]

    if (horasTexto === undefined || minutosTexto === undefined) {
        return null
    }

    return Number(horasTexto) * 60 + Number(minutosTexto)
}

export function normalizarHora(
    valor: unknown,
    nombreCampo: string,
    mensaje = 'La hora debe tener formato HH:mm',
): string {
    if (typeof valor !== 'string' || horaAMinutos(valor) === null) {
        throw new AppError(400, `${mensaje} (${nombreCampo})`)
    }

    return valor.slice(0, 5)
}

export function diaSemanaDeFecha(fecha: string): DiaSemana | null {
    const fechaNormalizada = fecha.slice(0, 10)
    const fechaParseada = new Date(`${fechaNormalizada}T00:00:00Z`)

    if (Number.isNaN(fechaParseada.getTime())) {
        return null
    }

    return DIAS_POR_INDICE[fechaParseada.getUTCDay()] ?? null
}
