import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

import {
    asignacionEspacioModel,
    espacioModel,
    profesionalModel,
} from '../helpers/mocksModelos.js'
import { asignacionEspacioService } from '../../src/services/asignacionEspacioService.js'

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

beforeEach(() => {
    vi.resetAllMocks()
})

describe('asignacionEspacioService.listar', () => {
    it('debe listar asignaciones sin filtros', async () => {
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            asignacion,
        ] as never)

        const resultado = await asignacionEspacioService.listar()

        expect(asignacionEspacioModel.findAll).toHaveBeenCalledWith({
            where: {},
            include: [
                {
                    model: espacioModel,
                    as: 'espacio',
                    attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
                },
                {
                    model: profesionalModel,
                    as: 'profesional',
                    attributes: ['id', 'nombre', 'apellido'],
                },
            ],
            order: [['id', 'ASC']],
        })
        expect(resultado).toEqual([asignacion])
    })

    it('debe filtrar por espacioId, profesionalId y tipo', async () => {
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([] as never)

        await asignacionEspacioService.listar({
            espacioId: 10,
            profesionalId: 5,
            tipo: 'FIJA',
        })

        expect(asignacionEspacioModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { espacioId: 10, profesionalId: 5, tipo: 'FIJA' },
            }),
        )
    })

    it('debe rechazar un espacioId inválido con 400', async () => {
        await expect(
            asignacionEspacioService.listar({ espacioId: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe rechazar un profesionalId inválido con 400', async () => {
        await expect(
            asignacionEspacioService.listar({ profesionalId: -1 }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe rechazar un tipo inválido con 400', async () => {
        await expect(
            asignacionEspacioService.listar({ tipo: 'OTRA' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.findAll).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioService.buscarPorId', () => {
    it('debe rechazar un ID inválido con 400', async () => {
        await expect(
            asignacionEspacioService.buscarPorId(0),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe retornar la asignación con sus relaciones', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )

        const resultado = await asignacionEspacioService.buscarPorId(1)

        expect(asignacionEspacioModel.findByPk).toHaveBeenCalledWith(1, {
            include: [
                {
                    model: espacioModel,
                    as: 'espacio',
                    attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
                },
                {
                    model: profesionalModel,
                    as: 'profesional',
                    attributes: ['id', 'nombre', 'apellido'],
                },
            ],
        })
        expect(resultado).toEqual(asignacion)
    })

    it('debe retornar null si no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(null)

        const resultado = await asignacionEspacioService.buscarPorId(999)

        expect(resultado).toBeNull()
    })
})
