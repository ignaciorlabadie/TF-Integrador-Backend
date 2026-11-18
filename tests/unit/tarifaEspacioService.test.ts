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

const datosBase = {
    espacioId: 10,
    precioPorHora: '1500.50',
    fechaDesde: '2026-01-01',
    fechaHasta: null,
}

const tarifaVigenteExistente = {
    id: 99,
    espacioId: 10,
    precioPorHora: '1000.00',
    fechaDesde: '2025-01-01',
    fechaHasta: null,
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

describe('tarifaEspacioService.buscarPorId', () => {
    it('debe rechazar un ID inválido con 400', async () => {
        await expect(tarifaEspacioService.buscarPorId(0)).rejects.toMatchObject(
            { statusCode: 400 },
        )
        expect(tarifaEspaciosModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe retornar la tarifa con su espacio', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )

        const resultado = await tarifaEspacioService.buscarPorId(1)

        expect(tarifaEspaciosModel.findByPk).toHaveBeenCalledWith(1, {
            include: [
                {
                    model: espacioModel,
                    as: 'espacio',
                    attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
                },
            ],
        })
        expect(resultado).toEqual(tarifa)
    })

    it('debe retornar null si no existe', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(null)

        const resultado = await tarifaEspacioService.buscarPorId(999)

        expect(resultado).toBeNull()
    })
})

describe('tarifaEspacioService.crear - validaciones', () => {
    it('debe rechazar datos inválidos con 400', async () => {
        await expect(
            tarifaEspacioService.crear(null as never),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un espacioId inválido con 400', async () => {
        await expect(
            tarifaEspacioService.crear({ ...datosBase, espacioId: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar un precio no numérico con 400', async () => {
        await expect(
            tarifaEspacioService.crear({ ...datosBase, precioPorHora: 'abc' }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un precio menor o igual a 0 con 400', async () => {
        await expect(
            tarifaEspacioService.crear({ ...datosBase, precioPorHora: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un precio con más de 2 decimales con 400', async () => {
        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                precioPorHora: 1500.555,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una fechaDesde inválida con 400', async () => {
        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                fechaDesde: '2026-13-01',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una fechaDesde faltante con 400', async () => {
        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                fechaDesde: undefined as never,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una fechaHasta inválida con 400', async () => {
        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                fechaHasta: '2026-02-30',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una fechaHasta anterior a fechaDesde con 400', async () => {
        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                fechaHasta: '2025-12-31',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })
})

describe('tarifaEspacioService.crear - existencia y alta', () => {
    beforeEach(() => {
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([] as never)
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(
            tarifaEspacioService.crear(datosBase),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si el espacio está inactivo', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            activo: false,
        } as never)

        await expect(
            tarifaEspacioService.crear(datosBase),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe crear una tarifa vigente normalizando el precio', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.create).mockResolvedValue({
            id: 1,
        } as never)
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )

        const resultado = await tarifaEspacioService.crear({
            ...datosBase,
            precioPorHora: 1500.5,
        })

        expect(tarifaEspaciosModel.create).toHaveBeenCalledWith({
            espacioId: 10,
            precioPorHora: '1500.50',
            fechaDesde: '2026-01-01',
            fechaHasta: null,
        })
        expect(resultado).toEqual(tarifa)
    })

    it('debe permitir crear tarifas con fechas históricas', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.create).mockResolvedValue({
            id: 2,
        } as never)
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue({
            ...tarifa,
            id: 2,
            fechaDesde: '2020-01-01',
            fechaHasta: '2020-12-31',
        } as never)

        await tarifaEspacioService.crear({
            espacioId: 10,
            precioPorHora: '1000',
            fechaDesde: '2020-01-01',
            fechaHasta: '2020-12-31',
        })

        expect(tarifaEspaciosModel.create).toHaveBeenCalledWith({
            espacioId: 10,
            precioPorHora: '1000.00',
            fechaDesde: '2020-01-01',
            fechaHasta: '2020-12-31',
        })
    })

    it('debe normalizar el precio de un string con un decimal', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.create).mockResolvedValue({
            id: 1,
        } as never)
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )

        await tarifaEspacioService.crear({
            ...datosBase,
            precioPorHora: '1500.5',
        })

        expect(tarifaEspaciosModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ precioPorHora: '1500.50' }),
        )
    })
})

describe('tarifaEspacioService.crear - solapamiento', () => {
    function prepararAlta(candidatas: object[]) {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue(
            candidatas as never,
        )
        vi.mocked(tarifaEspaciosModel.create).mockResolvedValue({
            id: 1,
        } as never)
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )
    }

    it('debe responder 409 si ya existe una tarifa vigente para el espacio', async () => {
        prepararAlta([tarifaVigenteExistente])

        await expect(
            tarifaEspacioService.crear(datosBase),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si se superpone con una tarifa cerrada', async () => {
        prepararAlta([
            {
                ...tarifaVigenteExistente,
                fechaDesde: '2026-01-01',
                fechaHasta: '2026-12-31',
            },
        ])

        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                fechaDesde: '2026-06-01',
                fechaHasta: '2026-06-30',
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('no debe considerarse conflicto si una termina un día antes', async () => {
        prepararAlta([
            {
                ...tarifaVigenteExistente,
                fechaDesde: '2026-01-01',
                fechaHasta: '2026-12-31',
            },
        ])

        await tarifaEspacioService.crear({
            ...datosBase,
            fechaDesde: '2027-01-01',
            fechaHasta: null,
        })

        expect(tarifaEspaciosModel.create).toHaveBeenCalled()
    })

    it('debe considerarse conflicto si empieza el mismo día que termina la otra', async () => {
        prepararAlta([
            {
                ...tarifaVigenteExistente,
                fechaDesde: '2026-01-01',
                fechaHasta: '2026-12-31',
            },
        ])

        await expect(
            tarifaEspacioService.crear({
                ...datosBase,
                fechaDesde: '2026-12-31',
                fechaHasta: null,
            }),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(tarifaEspaciosModel.create).not.toHaveBeenCalled()
    })

    it('no debe considerarse conflicto si la nueva termina antes de la existente', async () => {
        prepararAlta([
            {
                ...tarifaVigenteExistente,
                fechaDesde: '2027-01-01',
                fechaHasta: null,
            },
        ])

        await tarifaEspacioService.crear({
            ...datosBase,
            fechaDesde: '2026-01-01',
            fechaHasta: '2026-12-31',
        })

        expect(tarifaEspaciosModel.create).toHaveBeenCalled()
    })

    it('debe consultar las tarifas del mismo espacio', async () => {
        prepararAlta([])

        await tarifaEspacioService.crear(datosBase)

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { espacioId: 10 } }),
        )
    })
})

describe('tarifaEspacioService.actualizar', () => {
    it('debe actualizar la tarifa excluyéndose a sí misma del solapamiento', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk)
            .mockResolvedValueOnce(tarifa as never)
            .mockResolvedValueOnce(tarifa as never)
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)
        vi.mocked(tarifaEspaciosModel.findAll).mockResolvedValue([
            tarifa,
        ] as never)
        vi.mocked(tarifaEspaciosModel.update).mockResolvedValue([1] as never)

        const resultado = await tarifaEspacioService.actualizar(1, datosBase)

        expect(tarifaEspaciosModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { espacioId: 10, id: { [Op.ne]: 1 } },
            }),
        )
        expect(tarifaEspaciosModel.update).toHaveBeenCalledWith(
            {
                espacioId: 10,
                precioPorHora: '1500.50',
                fechaDesde: '2026-01-01',
                fechaHasta: null,
            },
            { where: { id: 1 } },
        )
        expect(resultado).toEqual(tarifa)
    })
})

describe('tarifaEspacioService.eliminar', () => {
    it('debe permitir eliminar la tarifa vigente', async () => {
        vi.mocked(tarifaEspaciosModel.findByPk).mockResolvedValue(
            tarifa as never,
        )
        vi.mocked(tarifaEspaciosModel.destroy).mockResolvedValue(1 as never)

        await tarifaEspacioService.eliminar(tarifa.id)

        expect(tarifaEspaciosModel.destroy).toHaveBeenCalledWith({
            where: { id: tarifa.id },
        })
    })
})

describe('tarifaEspacioService.obtenerVigente', () => {
    it('debe retornar la tarifa vigente del espacio incluyendo el espacio', async () => {
        vi.mocked(tarifaEspaciosModel.findOne).mockResolvedValue(
            tarifa as never,
        )

        const resultado = await tarifaEspacioService.obtenerVigente(10)

        expect(tarifaEspaciosModel.findOne).toHaveBeenCalledWith({
            where: { espacioId: 10, fechaHasta: { [Op.is]: null } },
            include: [
                {
                    model: espacioModel,
                    as: 'espacio',
                    attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
                },
            ],
        })
        expect(resultado).toEqual(tarifa)
    })
})
