import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Op } from 'sequelize'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

import { espacioModel, tarifaEspaciosModel } from '../helpers/mocksModelos.js'
import { tarifaEspacioService } from '../../src/services/tarifaEspacioService.js'

const espacio = {
    id: 10,
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
    activo: true,
}

const tarifa = {
    id: 1,
    espacioId: 10,
    precioPorHora: '1500.00',
    fechaDesde: '2026-01-01',
    fechaHasta: null,
    espacio,
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('tarifaEspacioService.listar', () => {
    it('debe listar tarifas sin filtros incluyendo el espacio y ordenando por fecha', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([
            tarifa,
        ] as never)

        const resultado = await tarifaEspacioService.listar()

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith({
            where: {},
            include: [
                {
                    model: espacioModel,
                    as: 'espacio',
                    attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
                },
            ],
            order: [
                ['fechaDesde', 'DESC'],
                ['id', 'DESC'],
            ],
        })
        expect(resultado).toEqual([tarifa])
    })

    it('debe filtrar por espacioId', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)

        await tarifaEspacioService.listar({ espacioId: 10 })

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { espacioId: 10 } }),
        )
    })

    it('debe filtrar las tarifas vigentes (fechaHasta null)', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)

        await tarifaEspacioService.listar({ vigente: true })

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { fechaHasta: { [Op.is]: null } },
            }),
        )
    })

    it('debe filtrar las tarifas no vigentes (fechaHasta no null)', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)

        await tarifaEspacioService.listar({ vigente: false })

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { fechaHasta: { [Op.not]: null } },
            }),
        )
    })

    it('debe combinar espacioId y vigente', async () => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)

        await tarifaEspacioService.listar({ espacioId: 10, vigente: true })

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { espacioId: 10, fechaHasta: { [Op.is]: null } },
            }),
        )
    })

    it('debe rechazar un espacioId inválido con 400', async () => {
        await expect(
            tarifaEspacioService.listar({ espacioId: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.findAll).not.toHaveBeenCalled()
    })

    it('debe rechazar un vigente no booleano con 400', async () => {
        await expect(
            tarifaEspacioService.listar({ vigente: 'true' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.findAll).not.toHaveBeenCalled()
    })
})