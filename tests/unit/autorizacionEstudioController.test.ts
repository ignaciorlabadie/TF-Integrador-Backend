import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/autorizacionEstudioService.js', () => ({
    listarAutorizaciones: vi.fn(),
    buscarAutorizacionPorId: vi.fn(),
    autorizarProfesionalService: vi.fn(),
    revocarProfesionalService: vi.fn(),
    verificarVigenciaService: vi.fn(),
}))

import {
    autorizarProfesionalService,
    buscarAutorizacionPorId,
    listarAutorizaciones,
    revocarProfesionalService,
    verificarVigenciaService,
} from '../../src/services/autorizacionEstudioService.js'
import {
    crearAutorizacion,
    obtenerAutorizaciones,
    obtenerAutorizacionPorId,
    revocarAutorizacion,
    verificarVigencia,
} from '../../src/controllers/autorizacionEstudioController.js'

function crearReqRes() {
    const req: Record<string, unknown> = { params: {}, body: {} }
    const res: Record<string, unknown> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }
    return { req, res }
}

describe('autorizacionEstudioController', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    describe('obtenerAutorizaciones', () => {
        it('debe listar autorizaciones con 200', async () => {
            const autorizaciones = [{ id: 1 }, { id: 2 }]
            vi.mocked(listarAutorizaciones).mockResolvedValue(autorizaciones)
            const { req, res } = crearReqRes()

            await obtenerAutorizaciones(req as never, res as never)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(autorizaciones)
        })
    })

    describe('obtenerAutorizacionPorId', () => {
        it('debe devolver la autorización con 200', async () => {
            const autorizacion = { id: 5 }
            vi.mocked(buscarAutorizacionPorId).mockResolvedValue(autorizacion)
            const { req, res } = crearReqRes()
            req.params.id = '5'

            await obtenerAutorizacionPorId(req as never, res as never)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(autorizacion)
        })

        it('debe responder 404 si no existe', async () => {
            vi.mocked(buscarAutorizacionPorId).mockResolvedValue(null)
            const { req, res } = crearReqRes()
            req.params.id = '99'

            await expect(
                obtenerAutorizacionPorId(req as never, res as never),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Autorización no encontrada',
            })
        })
    })

    describe('crearAutorizacion', () => {
        it('debe crear la autorización con 201', async () => {
            const creada = { id: 10, estado: 'DISPONIBLE' }
            vi.mocked(autorizarProfesionalService).mockResolvedValue(creada)
            const { req, res } = crearReqRes()
            req.body = {
                estudioId: '1',
                profesionalId: '2',
                fechaAutorizacion: '2026-11-01',
                fechaVencimiento: '2026-12-01',
            }

            await crearAutorizacion(req as never, res as never)

            expect(autorizarProfesionalService).toHaveBeenCalledWith({
                estudioId: 1,
                profesionalId: 2,
                fechaAutorizacion: '2026-11-01',
                fechaVencimiento: '2026-12-01',
            })
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(creada)
        })

        it('debe responder 400 si la fecha de autorización es inválida', async () => {
            const { req, res } = crearReqRes()
            req.body = {
                estudioId: '1',
                profesionalId: '2',
                fechaAutorizacion: 'invalida',
                fechaVencimiento: '2026-12-01',
            }

            await expect(
                crearAutorizacion(req as never, res as never),
            ).rejects.toMatchObject({
                statusCode: 400,
                message:
                    'La fecha de autorización debe tener el formato YYYY-MM-DD',
            })
        })

        it('debe responder 400 si el vencimiento es anterior a la autorización', async () => {
            const { req, res } = crearReqRes()
            req.body = {
                estudioId: '1',
                profesionalId: '2',
                fechaAutorizacion: '2026-12-01',
                fechaVencimiento: '2026-11-01',
            }

            await expect(
                crearAutorizacion(req as never, res as never),
            ).rejects.toMatchObject({
                statusCode: 400,
                message:
                    'La fecha de vencimiento no puede ser anterior a la fecha de autorización',
            })
        })
    })

    describe('revocarAutorizacion', () => {
        it('debe revocar con 200', async () => {
            const revocada = { id: 5, estado: 'VENCIDO' }
            vi.mocked(revocarProfesionalService).mockResolvedValue(revocada)
            const { req, res } = crearReqRes()
            req.params.id = '5'

            await revocarAutorizacion(req as never, res as never)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(revocada)
        })

        it('debe responder 404 si no existe', async () => {
            vi.mocked(revocarProfesionalService).mockResolvedValue(null)
            const { req, res } = crearReqRes()
            req.params.id = '99'

            await expect(
                revocarAutorizacion(req as never, res as never),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Autorización no encontrada',
            })
        })
    })

    describe('verificarVigencia', () => {
        it('debe devolver vigencia con 200', async () => {
            const vigencia = { id: 5, estaVigente: true, estaVencida: false }
            vi.mocked(verificarVigenciaService).mockResolvedValue(vigencia)
            const { req, res } = crearReqRes()
            req.params.id = '5'

            await verificarVigencia(req as never, res as never)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(vigencia)
        })

        it('debe responder 404 si no existe', async () => {
            vi.mocked(verificarVigenciaService).mockResolvedValue(null)
            const { req, res } = crearReqRes()
            req.params.id = '99'

            await expect(
                verificarVigencia(req as never, res as never),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Autorización no encontrada',
            })
        })
    })
})