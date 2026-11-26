import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../src/services/turnoService.js', () => ({
    turnoService: {
        obtenerAlcance: vi.fn(),
        listar: vi.fn(),
        buscarPorId: vi.fn(),
        horariosLibres: vi.fn(),
        crear: vi.fn(),
        actualizar: vi.fn(),
        cancelar: vi.fn(),
    },
}))

import { turnoController } from '../../src/controllers/turnoController.js'
import { turnoService } from '../../src/services/turnoService.js'

type UsuarioToken = {
    id: number
    email: string
    rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN'
}

const admin: UsuarioToken = { id: 1, email: 'admin@test.com', rol: 'ADMIN' }
const paciente: UsuarioToken = {
    id: 10,
    email: 'paciente@test.com',
    rol: 'PACIENTE',
}
const profesional: UsuarioToken = {
    id: 20,
    email: 'profesional@test.com',
    rol: 'PROFESIONAL',
}

function crearMocks(
    opciones: {
        body?: object
        params?: Record<string, string>
        query?: Record<string, string>
        usuario?: UsuarioToken | undefined
    } = {},
) {
    const { body = {}, params = {}, query = {} } = opciones
    // Con `usuario: undefined` explícito se simula un request sin token.
    const usuario = 'usuario' in opciones ? opciones.usuario : admin

    const req = {
        body,
        params,
        query,
        usuario,
    } as unknown as Request

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response

    const next = vi.fn() as unknown as NextFunction

    return { req, res, next }
}

const turno = {
    id: 5,
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    estado: 'CONFIRMADO',
    motivo: 'Control',
}

const datosCreacion = {
    pacienteId: 4,
    profesionalId: 2,
    agendaId: 3,
    fecha: '2027-10-25',
    hora: '10:00',
    motivo: 'Control',
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(turnoService.obtenerAlcance).mockImplementation(
        async (usuario) => {
            if (usuario.rol === 'ADMIN') return { tipo: 'TODOS' }
            if (usuario.rol === 'PACIENTE') {
                return { tipo: 'PACIENTE', pacienteId: 4 }
            }
            return { tipo: 'PROFESIONAL', profesionalId: 2 }
        },
    )
})

describe('turnoController.listar', () => {
    it('responde 401 si no hay usuario autenticado', async () => {
        const { req, res, next } = crearMocks({ usuario: undefined })

        await turnoController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401 }),
        )
    })

    it('un ADMIN lista sin filtros si no hay query', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks()

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith(
            {},
            { profesionalCompleto: true },
        )
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('un ADMIN puede usar todos los filtros', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks({
            query: {
                profesionalId: '2',
                pacienteId: '4',
                fecha: '2027-10-25',
                estado: 'CONFIRMADO',
            },
        })

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith(
            {
                profesionalId: 2,
                pacienteId: 4,
                fecha: '2027-10-25',
                estado: 'CONFIRMADO',
            },
            { profesionalCompleto: true },
        )
        expect(res.json).toHaveBeenCalledWith([turno])
        expect(next).not.toHaveBeenCalled()
    })

    it('responde 400 ante un estado inválido', async () => {
        const { req, res, next } = crearMocks({ query: { estado: 'OTRO' } })

        await turnoController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.listar).not.toHaveBeenCalled()
    })

    it('un PACIENTE ve solo sus turnos aunque mande otro pacienteId', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks({
            usuario: paciente,
            query: {
                pacienteId: '99',
                profesionalId: '7',
                estado: 'CONFIRMADO',
            },
        })

        await turnoController.listar(req, res, next)

        expect(turnoService.obtenerAlcance).toHaveBeenCalledWith(paciente)
        expect(turnoService.listar).toHaveBeenCalledWith(
            { pacienteId: 4, estado: 'CONFIRMADO' },
            { profesionalCompleto: false },
        )
    })

    it('un PROFESIONAL ve solo los turnos de su perfil', async () => {
        vi.mocked(turnoService.listar).mockResolvedValue([turno] as never)

        const { req, res, next } = crearMocks({ usuario: profesional })

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).toHaveBeenCalledWith(
            { profesionalId: 2 },
            { profesionalCompleto: true },
        )
    })

    it('responde una lista vacía si la cuenta no tiene perfil', async () => {
        vi.mocked(turnoService.obtenerAlcance).mockResolvedValue({
            tipo: 'NINGUNO',
        })

        const { req, res, next } = crearMocks({ usuario: paciente })

        await turnoController.listar(req, res, next)

        expect(turnoService.listar).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([])
    })

    it('deriva el error al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.listar).mockRejectedValue(error)

        const { req, res, next } = crearMocks()

        await turnoController.listar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.buscarPorId', () => {
    it('responde 400 ante un id inválido', async () => {
        const { req, res, next } = crearMocks({ params: { id: 'abc' } })

        await turnoController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.buscarPorId).not.toHaveBeenCalled()
    })

    it('un ADMIN ve cualquier turno', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({ params: { id: '5' } })

        await turnoController.buscarPorId(req, res, next)

        expect(turnoService.buscarPorId).toHaveBeenCalledWith(5, {
            profesionalCompleto: true,
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('un PACIENTE ve su propio turno con el profesional reducido', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            params: { id: '5' },
            usuario: paciente,
        })

        await turnoController.buscarPorId(req, res, next)

        expect(turnoService.buscarPorId).toHaveBeenCalledWith(5, {
            profesionalCompleto: false,
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('responde 404 a un PACIENTE que pide un turno ajeno', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue({
            ...turno,
            pacienteId: 99,
        } as never)

        const { req, res, next } = crearMocks({
            params: { id: '5' },
            usuario: paciente,
        })

        await turnoController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(res.status).not.toHaveBeenCalled()
    })

    it('responde 404 a un PROFESIONAL que pide un turno de otro', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue({
            ...turno,
            profesionalId: 99,
        } as never)

        const { req, res, next } = crearMocks({
            params: { id: '5' },
            usuario: profesional,
        })

        await turnoController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.buscarPorId).mockRejectedValue(error)

        const { req, res, next } = crearMocks({ params: { id: '5' } })

        await turnoController.buscarPorId(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.horariosLibres', () => {
    it('responde 200 con los horarios del servicio', async () => {
        const horarios = [{ agendaId: 3, hora: '09:00' }]
        vi.mocked(turnoService.horariosLibres).mockResolvedValue(horarios)

        const { req, res, next } = crearMocks({
            usuario: paciente,
            query: { profesionalId: '2', fecha: '2027-10-25' },
        })

        await turnoController.horariosLibres(req, res, next)

        expect(turnoService.horariosLibres).toHaveBeenCalledWith(
            2,
            '2027-10-25',
        )
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(horarios)
    })

    it.each([
        ['falta el profesionalId', { fecha: '2027-10-25' }],
        ['falta la fecha', { profesionalId: '2' }],
        [
            'el profesionalId es inválido',
            { profesionalId: 'x', fecha: '2027-10-25' },
        ],
        ['la fecha es inválida', { profesionalId: '2', fecha: '25/10/2027' }],
    ])('responde 400 si %s', async (_caso, query) => {
        const { req, res, next } = crearMocks({ query })

        await turnoController.horariosLibres(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.horariosLibres).not.toHaveBeenCalled()
    })
})

describe('turnoController.crear', () => {
    it('responde 400 si faltan datos obligatorios', async () => {
        const { req, res, next } = crearMocks({
            body: { ...datosCreacion, motivo: undefined },
        })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.crear).not.toHaveBeenCalled()
    })

    it('un ADMIN debe enviar el pacienteId', async () => {
        const { req, res, next } = crearMocks({
            body: { ...datosCreacion, pacienteId: undefined },
        })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
    })

    it.each([
        ['la hora no es HH:mm', { hora: '10:00:00' }],
        ['la fecha es inválida', { fecha: '2027-13-01' }],
        ['el motivo está vacío', { motivo: '   ' }],
    ])('responde 400 si %s', async (_caso, cambio) => {
        const { req, res, next } = crearMocks({
            body: { ...datosCreacion, ...cambio },
        })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.crear).not.toHaveBeenCalled()
    })

    it('un ADMIN crea con los datos normalizados', async () => {
        vi.mocked(turnoService.crear).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            body: {
                ...datosCreacion,
                pacienteId: '4',
                profesionalId: '2',
                agendaId: '3',
            },
        })

        await turnoController.crear(req, res, next)

        expect(turnoService.crear).toHaveBeenCalledWith(
            { ...datosCreacion, observaciones: null },
            { profesionalCompleto: true },
        )
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('un PACIENTE crea a su nombre e ignora el pacienteId del body', async () => {
        vi.mocked(turnoService.crear).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            usuario: paciente,
            body: { ...datosCreacion, pacienteId: 99 },
        })

        await turnoController.crear(req, res, next)

        expect(turnoService.crear).toHaveBeenCalledWith(
            expect.objectContaining({ pacienteId: 4 }),
            { profesionalCompleto: false },
        )
        expect(res.status).toHaveBeenCalledWith(201)
    })

    it('un PACIENTE no necesita mandar pacienteId', async () => {
        vi.mocked(turnoService.crear).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            usuario: paciente,
            body: { ...datosCreacion, pacienteId: undefined },
        })

        await turnoController.crear(req, res, next)

        expect(turnoService.crear).toHaveBeenCalledWith(
            expect.objectContaining({ pacienteId: 4 }),
            expect.anything(),
        )
    })

    it('responde 403 a un PACIENTE sin perfil de paciente', async () => {
        vi.mocked(turnoService.obtenerAlcance).mockResolvedValue({
            tipo: 'NINGUNO',
        })

        const { req, res, next } = crearMocks({
            usuario: paciente,
            body: datosCreacion,
        })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        )
        expect(turnoService.crear).not.toHaveBeenCalled()
    })

    it('convierte las observaciones a string', async () => {
        vi.mocked(turnoService.crear).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            body: { ...datosCreacion, observaciones: 'Traer análisis' },
        })

        await turnoController.crear(req, res, next)

        expect(turnoService.crear).toHaveBeenCalledWith(
            { ...datosCreacion, observaciones: 'Traer análisis' },
            expect.anything(),
        )
        expect(res.status).toHaveBeenCalledWith(201)
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('Conflicto')
        vi.mocked(turnoService.crear).mockRejectedValue(error)

        const { req, res, next } = crearMocks({ body: datosCreacion })

        await turnoController.crear(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.actualizar', () => {
    it('responde 400 ante un id inválido', async () => {
        const { req, res, next } = crearMocks({
            body: { motivo: 'Otro' },
            params: { id: 'abc' },
        })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.actualizar).not.toHaveBeenCalled()
    })

    it('responde 400 si el body no tiene datos', async () => {
        const { req, res, next } = crearMocks({ params: { id: '5' } })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.actualizar).not.toHaveBeenCalled()
    })

    it('responde 400 ante un estado inválido', async () => {
        const { req, res, next } = crearMocks({
            body: { estado: 'BORRADO' },
            params: { id: '5' },
        })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.actualizar).not.toHaveBeenCalled()
    })

    it('responde 200 con el turno actualizado', async () => {
        vi.mocked(turnoService.actualizar).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            body: { motivo: 'Control actualizado' },
            params: { id: '5' },
        })

        await turnoController.actualizar(req, res, next)

        expect(turnoService.actualizar).toHaveBeenCalledWith(5, {
            motivo: 'Control actualizado',
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('pasa todos los campos actualizables al servicio', async () => {
        vi.mocked(turnoService.actualizar).mockResolvedValue(turno as never)

        const datos = {
            fecha: '2027-10-26',
            hora: '11:00',
            motivo: 'Control',
            observaciones: 'Traer análisis',
            estado: 'PENDIENTE',
        }
        const { req, res, next } = crearMocks({
            body: datos,
            params: { id: '5' },
        })

        await turnoController.actualizar(req, res, next)

        expect(turnoService.actualizar).toHaveBeenCalledWith(5, datos)
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.actualizar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({
            body: { motivo: 'Otro' },
            params: { id: '5' },
        })

        await turnoController.actualizar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})

describe('turnoController.cancelar', () => {
    it('responde 400 ante un id inválido', async () => {
        const { req, res, next } = crearMocks({ params: { id: 'abc' } })

        await turnoController.cancelar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400 }),
        )
        expect(turnoService.cancelar).not.toHaveBeenCalled()
    })

    it('un ADMIN cancela cualquier turno sin chequear dueño', async () => {
        vi.mocked(turnoService.cancelar).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({ params: { id: '5' } })

        await turnoController.cancelar(req, res, next)

        expect(turnoService.buscarPorId).not.toHaveBeenCalled()
        expect(turnoService.cancelar).toHaveBeenCalledWith(5, {
            profesionalCompleto: true,
        })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(turno)
    })

    it('un PACIENTE cancela su propio turno', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue(turno as never)
        vi.mocked(turnoService.cancelar).mockResolvedValue(turno as never)

        const { req, res, next } = crearMocks({
            params: { id: '5' },
            usuario: paciente,
        })

        await turnoController.cancelar(req, res, next)

        expect(turnoService.cancelar).toHaveBeenCalledWith(5, {
            profesionalCompleto: false,
        })
        expect(res.status).toHaveBeenCalledWith(200)
    })

    it('responde 404 a un PACIENTE que cancela un turno ajeno', async () => {
        vi.mocked(turnoService.buscarPorId).mockResolvedValue({
            ...turno,
            pacienteId: 99,
        } as never)

        const { req, res, next } = crearMocks({
            params: { id: '5' },
            usuario: paciente,
        })

        await turnoController.cancelar(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 404 }),
        )
        expect(turnoService.cancelar).not.toHaveBeenCalled()
    })

    it('deriva el error del servicio al middleware', async () => {
        const error = new Error('DB caída')
        vi.mocked(turnoService.cancelar).mockRejectedValue(error)

        const { req, res, next } = crearMocks({ params: { id: '5' } })

        await turnoController.cancelar(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
        expect(res.status).not.toHaveBeenCalled()
    })
})
