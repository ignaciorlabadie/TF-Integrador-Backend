import request from 'supertest'
import type { Response } from 'supertest'

import app from '../../../src/app.js'
import { DIAS_SEMANA } from '../../../src/types/DiaSemana.js'
import type { DiaSemana } from '../../../src/types/DiaSemana.js'

export function authorization(token: string): string {
    return `Bearer ${token}`
}

export function proximoDia(dia: DiaSemana, desde = new Date()): string {
    const indice = DIAS_SEMANA.indexOf(dia)
    const diaActual = desde.getUTCDay()
    const indiceActual = (diaActual + 6) % 7
    let diferencia = (indice - indiceActual + DIAS_SEMANA.length) % 7

    if (diferencia === 0) {
        diferencia = 7
    }

    const fecha = new Date(
        Date.UTC(
            desde.getUTCFullYear(),
            desde.getUTCMonth(),
            desde.getUTCDate() + diferencia,
        ),
    )

    return fecha.toISOString().slice(0, 10)
}

export function datosPaciente(
    overrides: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        email: 'paciente-e2e@tfi.local.com',
        password: 'Password123',
        nombre: 'Paciente',
        apellido: 'E2E',
        dni: '30111223',
        telefono: '1122334455',
        fechaNacimiento: '1990-05-14',
        direccion: 'Av. Siempreviva 742',
        ...overrides,
    }
}

export function crearPaciente(
    overrides: Record<string, unknown> = {},
): Promise<Response> {
    return request(app).post('/api/pacientes').send(datosPaciente(overrides))
}

export function login(
    email: string,
    password = 'Password123',
): Promise<Response> {
    return request(app).post('/api/auth/login').send({ email, password })
}

export async function crearProfesional(
    tokenAdmin: string,
    overrides: Record<string, unknown> = {},
): Promise<Response> {
    const email = (overrides.email as string) || 'profesional-e2e@tfi.local.com'
    const usuario = overrides.usuarioId
        ? undefined
        : await request(app)
              .post('/api/usuarios')
              .set('Authorization', authorization(tokenAdmin))
              .send({
                  email,
                  password: 'Password123',
                  rol: 'PROFESIONAL',
              })

    if (usuario && usuario.status !== 201) {
        return usuario
    }

    const respuesta = await request(app)
        .post('/api/profesionales')
        .set('Authorization', authorization(tokenAdmin))
        .send({
            usuarioId: overrides.usuarioId ?? usuario?.body.id,
            nombre: 'Profesional',
            apellido: 'E2E',
            dni: '27111223',
            telefono: '1144556677',
            matricula: 'MP-E2E',
            especialidad: 'Kinesiologia',
            ...overrides,
        })

    return respuesta
}

export function crearAgenda(
    tokenAdmin: string,
    profesionalId: number,
    overrides: Record<string, unknown> = {},
): Promise<Response> {
    return request(app)
        .post('/api/agendas')
        .set('Authorization', authorization(tokenAdmin))
        .send({
            profesionalId,
            diaSemana: 'LUNES',
            horaInicio: '09:00',
            horaFin: '13:00',
            duracionTurno: 30,
            ...overrides,
        })
}

export function crearTurno(
    token: string,
    datos: {
        pacienteId: number
        profesionalId: number
        agendaId: number
        fecha: string
        hora?: string
        motivo?: string
    },
): Promise<Response> {
    return request(app)
        .post('/api/turnos')
        .set('Authorization', authorization(token))
        .send({
            hora: '10:00',
            motivo: 'Control de prueba',
            ...datos,
        })
}
