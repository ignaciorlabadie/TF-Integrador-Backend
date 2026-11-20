import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeEach } from 'vitest'

import app from '../../../src/app.js'
import sequelize from '../../../src/config/database.js'
import { Usuario } from '../../../src/models/index.js'
import '../../../src/models/index.js'

const TABLAS = [
    'users',
    'pacientes',
    'profesionales',
    'espacios',
    'tarifas_espacios',
    'agendas',
    'asignaciones_espacios',
    'estudios',
    'turnos',
    'autorizaciones_estudio',
]

export const EMAIL_ADMIN = 'admin@tfi.local.com'
export const PASSWORD_ADMIN = 'Password123'

export interface AdminDePrueba {
    id: number
    email: string
    token: string
}

export async function limpiarBase(): Promise<void> {
    const tablas = TABLAS.map((tabla) => `"${tabla}"`).join(', ')
    await sequelize.query(`TRUNCATE TABLE ${tablas} RESTART IDENTITY CASCADE`)
}

export async function crearAdmin(): Promise<AdminDePrueba> {
    const usuario = await Usuario.create({
        email: EMAIL_ADMIN,
        password: await bcrypt.hash(PASSWORD_ADMIN, 4),
        rol: 'ADMIN',
        activo: true,
    })

    const respuesta = await request(app).post('/api/auth/login').send({
        email: EMAIL_ADMIN,
        password: PASSWORD_ADMIN,
    })

    if (respuesta.status !== 200 || typeof respuesta.body.token !== 'string') {
        throw new Error(
            `No se pudo autenticar al admin de prueba: ${respuesta.status} ${JSON.stringify(respuesta.body)}`,
        )
    }

    return {
        id: usuario.id,
        email: EMAIL_ADMIN,
        token: respuesta.body.token as string,
    }
}

let adminActual: AdminDePrueba | undefined

export function usarBase() {
    beforeEach(async () => {
        await limpiarBase()
        adminActual = await crearAdmin()
    })

    afterAll(async () => {
        await sequelize.close()
    })

    return {
        admin(): AdminDePrueba {
            if (!adminActual) {
                throw new Error('La base de prueba todavía no fue inicializada')
            }

            return adminActual
        },
    }
}
