import { AppError } from '../errors/AppError.js'

export function validarId(valor: unknown, nombreCampo = 'ID'): number {
    const id = Number(valor)

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(
            400,
            `El ${nombreCampo} debe ser un número entero positivo`,
        )
    }

    return id
}
