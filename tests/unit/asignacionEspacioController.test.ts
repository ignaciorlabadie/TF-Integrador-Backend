import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../src/errors/AppError.js'

vi.mock('../../src/services/asignacionEspacioService.js', () => ({
    asignacionEspacioService: {
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        eliminar: vi.fn(),
    },
}))

vi.mock('../../src/services/profesionalService.js', () => ({
    profesionalService: {
        buscarPorUsuarioId: vi.fn(),
    },
}))

import { asignacionEspacioService } from '../../src/services/asignacionEspacioService.js'
import { profesionalService } from '../../src/services/profesionalService.js'
import { asignacionEspacioController } from '../../src/controllers/asignacionEspacioController.js'

type UsuarioToken = {
    id: number
    email: string
    rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN'
}

function crearMocks(
    body: object = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {},
    usuario?: UsuarioToken,
) {
    const req = { body, params, query, usuario } as unknown as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const asignacion = {
    id: 1,
    espacioId: 10,
    profesionalId: 5,
    tipo: 'FIJA',
    diaSemana: 'LUNES',
    fecha: null,
    horaInicio: '08:00',
    horaFin: '12:00',
}

const datosFija = {
    espacioId: 10,
    profesionalId: 5,
    tipo: 'FIJA',
    diaSemana: 'LUNES',
    fecha: null,
    horaInicio: '08:00',
    horaFin: '12:00',
}

const datosEspecifica = {
    espacioId: 10,
    profesionalId: 5,
    tipo: 'ESPECIFICA',
    diaSemana: null,
    fecha: '2027-10-25',
    horaInicio: '08:00',
    horaFin: '12:00',
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('asignacionEspacioController.listar', () => {
    it('debe responder 200 con la lista', async () => {
        vi.mocked(asignacionEspacioService.listar).mockResolvedValue([
            asignacion,
        ] as never)

        const { req, res, next } = crearMocks()

        await asignacionEspacioController.listar(req, res, next)

        expect(asignacionEspacioService.listar).toHaveBeenCalledWith({})
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([asignacion])
        expect(next).not.toHaveBeenCalled()
    })

    it('debe parsear los filtros desde el query', async () => {
        vi.mocked(asignacionEspacioService.listar).mockResolvedValue(
            [] as never,
        )

        const { req, res, next } = crearMocks(
            {},
            {},
            { espacioId: '10', profesionalId: '5', tipo: 'FIJA' },
        )

        await asignacionEspacioController.listar(req, res, next)

        expect(asignacionEspacioService.listar).toHaveBeenCalledWith({
            espacioId: 10,
            profesionalId: 5,
            tipo: 'FIJA',
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe responder 400 si espacioId es inválido', async () => {
        const { req, res, next } = crearMocks({}, {}, { espacioId: 'abc' })

        await asignacionEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.listar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el tipo no es válido', async () => {
        const { req, res, next } = crearMocks({}, {}, { tipo: 'OTRO' })

        await asignacionEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.listar).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado', async () => {
        const error = new Error('Error de DB')
        vi.mocked(asignacionEspacioService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await asignacionEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioController.buscarPorId', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.buscarPorId).not.toHaveBeenCalled()
    })

    it('debe responder 404 si no existe', async () => {
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, { id: '999' })

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la asignación', async () => {
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks({}, { id: '1' })

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(asignacionEspacioService.buscarPorId).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(asignacion)
    })

    it('debe delegar el error inesperado', async () => {
        const error = new Error('Error de DB')
        vi.mocked(asignacionEspacioService.buscarPorId).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '1' })

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioController.crear', () => {
    it('debe responder 400 si faltan campos obligatorios', async () => {
        const { req, res, next } = crearMocks({ espacioId: 10 })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si espacioId no es válido', async () => {
        const { req, res, next } = crearMocks({
            ...datosFija,
            espacioId: 'abc',
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el tipo no es válido', async () => {
        const { req, res, next } = crearMocks({ ...datosFija, tipo: 'OTRO' })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una FIJA no tiene día de semana', async () => {
        const { req, res, next } = crearMocks({
            ...datosFija,
            diaSemana: null,
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una FIJA tiene fecha', async () => {
        const { req, res, next } = crearMocks({
            ...datosFija,
            fecha: '2027-10-25',
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una ESPECIFICA no tiene fecha', async () => {
        const { req, res, next } = crearMocks({
            ...datosEspecifica,
            fecha: null,
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una ESPECIFICA tiene día de semana', async () => {
        const { req, res, next } = crearMocks({
            ...datosEspecifica,
            diaSemana: 'LUNES',
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si la fecha es inválida', async () => {
        const { req, res, next } = crearMocks({
            ...datosEspecifica,
            fecha: '2027-13-01',
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 400 si una hora es inválida', async () => {
        const { req, res, next } = crearMocks({
            ...datosFija,
            horaInicio: '9:00',
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 201 con una FIJA enviando solo campos permitidos', async () => {
        vi.mocked(asignacionEspacioService.crear).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks({
            ...datosFija,
            id: 99,
            activo: false,
        })

        await asignacionEspacioController.crear(req, res, next)

        expect(asignacionEspacioService.crear).toHaveBeenCalledWith(datosFija)
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(asignacion)
    })

    it('debe responder 201 con una ESPECIFICA', async () => {
        const creada = {
            ...asignacion,
            tipo: 'ESPECIFICA',
            diaSemana: null,
            fecha: '2027-10-25',
        }
        vi.mocked(asignacionEspacioService.crear).mockResolvedValue(
            creada as never,
        )

        const { req, res, next } = crearMocks(datosEspecifica)

        await asignacionEspacioController.crear(req, res, next)

        expect(asignacionEspacioService.crear).toHaveBeenCalledWith(
            datosEspecifica,
        )
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(creada)
    })

    it('debe delegar 404 si el espacio o profesional no existe', async () => {
        vi.mocked(asignacionEspacioService.crear).mockRejectedValue(
            new AppError(404, 'Espacio no encontrado'),
        )

        const { req, res, next } = crearMocks(datosFija)

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe delegar 409 por espacio inactivo o solapamiento', async () => {
        vi.mocked(asignacionEspacioService.crear).mockRejectedValue(
            new AppError(409, 'Solapamiento'),
        )

        const { req, res, next } = crearMocks(datosFija)

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado', async () => {
        const error = new Error('Error de DB')
        vi.mocked(asignacionEspacioService.crear).mockRejectedValue(error)

        const { req, res, next } = crearMocks(datosFija)

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioController.actualizar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks(datosFija, { id: 'abc' })

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 400 si faltan campos obligatorios', async () => {
        const { req, res, next } = crearMocks({ espacioId: 10 }, { id: '1' })

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 200 con la asignación actualizada', async () => {
        vi.mocked(asignacionEspacioService.actualizar).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(datosFija, { id: '1' })

        await asignacionEspacioController.actualizar(req, res, next)

        expect(asignacionEspacioService.actualizar).toHaveBeenCalledWith(
            1,
            datosFija,
        )
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(asignacion)
    })

    it('debe delegar 404 si no existe', async () => {
        vi.mocked(asignacionEspacioService.actualizar).mockRejectedValue(
            new AppError(404, 'Asignación no encontrada'),
        )

        const { req, res, next } = crearMocks(datosFija, { id: '999' })

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe delegar 409 por solapamiento', async () => {
        vi.mocked(asignacionEspacioService.actualizar).mockRejectedValue(
            new AppError(409, 'Solapamiento'),
        )

        const { req, res, next } = crearMocks(datosFija, { id: '1' })

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 409 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado', async () => {
        const error = new Error('Error de DB')
        vi.mocked(asignacionEspacioService.actualizar).mockRejectedValue(error)

        const { req, res, next } = crearMocks(datosFija, { id: '1' })

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioController.eliminar', () => {
    it('debe responder 400 ante un ID inválido', async () => {
        const { req, res, next } = crearMocks({}, { id: 'abc' })

        await asignacionEspacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(asignacionEspacioService.eliminar).not.toHaveBeenCalled()
    })

    it('debe delegar 404 si no existe', async () => {
        vi.mocked(asignacionEspacioService.eliminar).mockRejectedValue(
            new AppError(404, 'Asignación no encontrada'),
        )

        const { req, res, next } = crearMocks({}, { id: '999' })

        await asignacionEspacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe responder 204 sin contenido si elimina', async () => {
        vi.mocked(asignacionEspacioService.eliminar).mockResolvedValue(
            undefined,
        )

        const { req, res, next } = crearMocks({}, { id: '1' })

        await asignacionEspacioController.eliminar(req, res, next)

        expect(asignacionEspacioService.eliminar).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.send).toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    it('debe delegar el error inesperado', async () => {
        const error = new Error('Error de DB')
        vi.mocked(asignacionEspacioService.eliminar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({}, { id: '1' })

        await asignacionEspacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

const usuarioProfesional: UsuarioToken = {
    id: 77,
    email: 'profe@test.com',
    rol: 'PROFESIONAL',
}

const usuarioAdmin: UsuarioToken = {
    id: 1,
    email: 'admin@test.com',
    rol: 'ADMIN',
}

const profesional = {
    id: 5,
    usuarioId: 77,
    nombre: 'Ana',
    apellido: 'Gomez',
}

const asignacionEspecifica = {
    ...asignacion,
    tipo: 'ESPECIFICA',
    diaSemana: null,
    fecha: '2027-10-25',
}

describe('asignacionEspacioController.listar - permisos', () => {
    it('debe forzar el profesionalId del token para un PROFESIONAL', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.listar).mockResolvedValue(
            [] as never,
        )

        const { req, res, next } = crearMocks(
            {},
            {},
            { profesionalId: '999' },
            usuarioProfesional,
        )

        await asignacionEspacioController.listar(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).toHaveBeenCalledWith(77)
        expect(asignacionEspacioService.listar).toHaveBeenCalledWith({
            profesionalId: 5,
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe permitir a un ADMIN filtrar por cualquier profesional', async () => {
        vi.mocked(asignacionEspacioService.listar).mockResolvedValue(
            [] as never,
        )

        const { req, res, next } = crearMocks(
            {},
            {},
            { profesionalId: '999' },
            usuarioAdmin,
        )

        await asignacionEspacioController.listar(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).not.toHaveBeenCalled()
        expect(asignacionEspacioService.listar).toHaveBeenCalledWith({
            profesionalId: 999,
        })
    })

    it('debe responder 404 si el PROFESIONAL no tiene perfil', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(null)

        const { req, res, next } = crearMocks({}, {}, {}, usuarioProfesional)

        await asignacionEspacioController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(asignacionEspacioService.listar).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioController.buscarPorId - permisos', () => {
    it('debe permitir al PROFESIONAL ver su propia asignación', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(
            {},
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(asignacion)
    })

    it('debe responder 403 si la asignación es de otro profesional', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue({
            ...asignacion,
            profesionalId: 99,
        } as never)

        const { req, res, next } = crearMocks(
            {},
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('debe permitir a un ADMIN ver cualquier asignación', async () => {
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue({
            ...asignacion,
            profesionalId: 99,
        } as never)

        const { req, res, next } = crearMocks({}, { id: '1' }, {}, usuarioAdmin)

        await asignacionEspacioController.buscarPorId(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
    })
})

describe('asignacionEspacioController.crear - permisos', () => {
    it('debe forzar el profesionalId del token para un PROFESIONAL', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.crear).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(
            { ...datosEspecifica, profesionalId: 999 },
            {},
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.crear(req, res, next)

        expect(asignacionEspacioService.crear).toHaveBeenCalledWith({
            ...datosEspecifica,
            profesionalId: 5,
        })
        expect(res.status).toHaveBeenCalledWith(201)
    })

    it('debe responder 403 si un PROFESIONAL intenta crear una FIJA', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )

        const { req, res, next } = crearMocks(
            datosFija,
            {},
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el PROFESIONAL no tiene perfil', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(null)

        const { req, res, next } = crearMocks(
            datosEspecifica,
            {},
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(asignacionEspacioService.crear).not.toHaveBeenCalled()
    })

    it('debe permitir a un ADMIN crear con el profesionalId del body', async () => {
        vi.mocked(asignacionEspacioService.crear).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(datosFija, {}, {}, usuarioAdmin)

        await asignacionEspacioController.crear(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).not.toHaveBeenCalled()
        expect(asignacionEspacioService.crear).toHaveBeenCalledWith(datosFija)
    })
})

describe('asignacionEspacioController.actualizar - permisos', () => {
    it('debe permitir al PROFESIONAL actualizar su propia ESPECIFICA', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacionEspecifica as never,
        )
        vi.mocked(asignacionEspacioService.actualizar).mockResolvedValue(
            asignacionEspecifica as never,
        )

        const { req, res, next } = crearMocks(
            { ...datosEspecifica, profesionalId: 999 },
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.actualizar(req, res, next)

        expect(asignacionEspacioService.actualizar).toHaveBeenCalledWith(1, {
            ...datosEspecifica,
            profesionalId: 5,
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('debe responder 403 si la asignación es de otro profesional', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue({
            ...asignacionEspecifica,
            profesionalId: 99,
        } as never)

        const { req, res, next } = crearMocks(
            datosEspecifica,
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(asignacionEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un PROFESIONAL intenta editar una FIJA propia', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(
            datosEspecifica,
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(asignacionEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un PROFESIONAL intenta cambiar a FIJA', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacionEspecifica as never,
        )

        const { req, res, next } = crearMocks(
            datosFija,
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(asignacionEspacioService.actualizar).not.toHaveBeenCalled()
    })

    it('debe permitir a un ADMIN actualizar cualquier asignación', async () => {
        vi.mocked(asignacionEspacioService.actualizar).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(
            datosFija,
            { id: '1' },
            {},
            usuarioAdmin,
        )

        await asignacionEspacioController.actualizar(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).not.toHaveBeenCalled()
        expect(asignacionEspacioService.actualizar).toHaveBeenCalledWith(
            1,
            datosFija,
        )
        expect(res.status).toHaveBeenCalledWith(200)
    })
})

describe('asignacionEspacioController.eliminar - permisos', () => {
    it('debe permitir al PROFESIONAL eliminar su propia ESPECIFICA', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacionEspecifica as never,
        )
        vi.mocked(asignacionEspacioService.eliminar).mockResolvedValue(
            undefined,
        )

        const { req, res, next } = crearMocks(
            {},
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.eliminar(req, res, next)

        expect(asignacionEspacioService.eliminar).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(204)
    })

    it('debe responder 403 si la asignación es de otro profesional', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue({
            ...asignacionEspecifica,
            profesionalId: 99,
        } as never)

        const { req, res, next } = crearMocks(
            {},
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(asignacionEspacioService.eliminar).not.toHaveBeenCalled()
    })

    it('debe responder 403 si un PROFESIONAL intenta eliminar una FIJA propia', async () => {
        vi.mocked(profesionalService.buscarPorUsuarioId).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioService.buscarPorId).mockResolvedValue(
            asignacion as never,
        )

        const { req, res, next } = crearMocks(
            {},
            { id: '1' },
            {},
            usuarioProfesional,
        )

        await asignacionEspacioController.eliminar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(asignacionEspacioService.eliminar).not.toHaveBeenCalled()
    })

    it('debe permitir a un ADMIN eliminar cualquier asignación', async () => {
        vi.mocked(asignacionEspacioService.eliminar).mockResolvedValue(
            undefined,
        )

        const { req, res, next } = crearMocks({}, { id: '1' }, {}, usuarioAdmin)

        await asignacionEspacioController.eliminar(req, res, next)

        expect(profesionalService.buscarPorUsuarioId).not.toHaveBeenCalled()
        expect(asignacionEspacioService.eliminar).toHaveBeenCalledWith(1)
        expect(res.status).toHaveBeenCalledWith(204)
    })
})
