import bcrypt from 'bcryptjs'

const SALT_ROUNDS_POR_DEFECTO = 10

function obtenerSaltRounds(): number {
    const configurado = Number(process.env.BCRYPT_SALT_ROUNDS)

    if (!Number.isInteger(configurado) || configurado < 4 || configurado > 15) {
        return SALT_ROUNDS_POR_DEFECTO
    }

    return configurado
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, obtenerSaltRounds())
}

export async function verificarPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash)
}
