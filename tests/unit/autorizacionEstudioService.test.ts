import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Op } from 'sequelize'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

import {
    autorizacionEstudioModel,
    estudioModel,
    profesionalModel,
} from '../helpers/mocksModelos.js'
import {
    autorizarProfesionalService,
    buscarAutorizacionPorId,
    listarAutorizaciones,
    revocarProfesionalService,
    verificarVigenciaService,
} from '../../src/services/autorizacionEstudioService.js'

describe('autorizacionEstudioService', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('listarAutorizaciones', () => {
        it('debe listar todas las autorizaciones', async () => {
            const autorizaciones = [{ id: 1 }, { id: 2 }]
            vi.mocked(autorizacionEstudioModel.findAll).mockResolvedValue(
                autorizaciones as never,
            )

            const resultado = await listarAutorizaciones()

            expect(autorizacionEstudioModel.findAll).toHaveBeenCalledWith()
            expect(resultado).toBe(autorizaciones)
        })
    })

    describe('buscarAutorizacionPorId', () => {
        it('debe buscar la autorización por id', async () => {
            const autorizacion = { id: 5 }
            vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(
                autorizacion as never,
            )

            const resultado = await buscarAutorizacionPorId(5)

            expect(autorizacionEstudioModel.findByPk).toHaveBeenCalledWith(5)
            expect(resultado).toBe(autorizacion)
        })

        it('debe retornar null si la autorización no existe', async () => {
            vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(null)

            const resultado = await buscarAutorizacionPorId(99)

            expect(resultado).toBeNull()
        })
    })

    describe('autorizarProfesionalService', () => {
        const data = {
            estudioId: 1,
            profesionalId: 2,
            fechaAutorizacion: '2026-11-01',
            fechaVencimiento: '2026-12-01',
        }

        it('debe crear la autorización con estado DISPONIBLE cuando todo es válido', async () => {
            vi.mocked(estudioModel.findByPk).mockResolvedValue({
                id: 1,
            } as never)
            vi.mocked(profesionalModel.findByPk).mockResolvedValue({
                id: 2,
            } as never)
            vi.mocked(autorizacionEstudioModel.findOne).mockResolvedValue(null)
            const creado = { id: 10, ...data, estado: 'DISPONIBLE' }
            vi.mocked(autorizacionEstudioModel.create).mockResolvedValue(
                creado as never,
            )

            const resultado = await autorizarProfesionalService(data)

            expect(estudioModel.findByPk).toHaveBeenCalledWith(1)
            expect(profesionalModel.findByPk).toHaveBeenCalledWith(2)
            expect(autorizacionEstudioModel.create).toHaveBeenCalledWith({
                ...data,
                estado: 'DISPONIBLE',
            })
            expect(resultado).toBe(creado)
        })

        it('debe rechazar 404 si el estudio no existe', async () => {
            vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

            await expect(
                autorizarProfesionalService(data),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Estudio no encontrado',
            })

            expect(autorizacionEstudioModel.create).not.toHaveBeenCalled()
        })

        it('debe rechazar 404 si el profesional no existe', async () => {
            vi.mocked(estudioModel.findByPk).mockResolvedValue({
                id: 1,
            } as never)
            vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

            await expect(
                autorizarProfesionalService(data),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Profesional no encontrado',
            })

            expect(autorizacionEstudioModel.create).not.toHaveBeenCalled()
        })

        it('debe rechazar 409 si ya existe una autorización vigente', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2026-11-07T10:00:00.000Z'))

            vi.mocked(estudioModel.findByPk).mockResolvedValue({
                id: 1,
            } as never)
            vi.mocked(profesionalModel.findByPk).mockResolvedValue({
                id: 2,
            } as never)
            vi.mocked(autorizacionEstudioModel.findOne).mockResolvedValue({
                id: 1,
            } as never)

            await expect(
                autorizarProfesionalService(data),
            ).rejects.toMatchObject({
                statusCode: 409,
                message:
                    'Ya existe una autorización vigente para este profesional y estudio',
            })

            expect(autorizacionEstudioModel.findOne).toHaveBeenCalledWith({
                where: {
                    estudioId: 1,
                    profesionalId: 2,
                    estado: 'DISPONIBLE',
                    fechaVencimiento: { [Op.gte]: '2026-11-07' },
                },
            })
            expect(autorizacionEstudioModel.create).not.toHaveBeenCalled()
        })
    })

    describe('revocarProfesionalService', () => {
        it('debe retornar null si la autorización no existe', async () => {
            vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(null)

            const resultado = await revocarProfesionalService(99)

            expect(resultado).toBeNull()
        })

        it('debe revocar la autorización y guardar el estado VENCIDO', async () => {
            const instancia = {
                id: 5,
                revocarProfesional: vi.fn(),
                save: vi.fn().mockResolvedValue({ id: 5, estado: 'VENCIDO' }),
            }
            vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(
                instancia as never,
            )

            const resultado = await revocarProfesionalService(5)

            expect(instancia.revocarProfesional).toHaveBeenCalled()
            expect(instancia.save).toHaveBeenCalled()
            expect(resultado).toEqual({ id: 5, estado: 'VENCIDO' })
        })
    })

    describe('verificarVigenciaService', () => {
        it('debe retornar null si la autorización no existe', async () => {
            vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(null)

            const resultado = await verificarVigenciaService(99)

            expect(resultado).toBeNull()
        })

        it('debe retornar vigencia y vencimiento de la autorización', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2026-11-07T10:00:00.000Z'))

            const instancia = {
                id: 5,
                estaVigente: vi.fn().mockReturnValue(true),
                estaVencida: vi.fn().mockReturnValue(false),
            }
            vi.mocked(autorizacionEstudioModel.findByPk).mockResolvedValue(
                instancia as never,
            )

            const resultado = await verificarVigenciaService(5)

            expect(resultado).toEqual({
                id: 5,
                estaVigente: true,
                estaVencida: false,
            })
            expect(instancia.estaVigente).toHaveBeenCalled()
            expect(instancia.estaVencida).toHaveBeenCalled()
        })
    })
})
