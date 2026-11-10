import { AppError } from '../errors/AppError.js'

export function validarEnteroPositivo(
    valor: unknown,
    nombreCampo = 'ID',
): number {
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
        throw new AppError(
            400,
            `El ${nombreCampo} debe ser un número entero positivo`,
        )
    }

    return valor
}

export function validarId(valor: unknown, nombreCampo = 'ID'): number {
    return validarEnteroPositivo(Number(valor), nombreCampo)
}
