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

const datosFija = {
    espacioId: 10,
    profesionalId: 5,
    tipo: 'FIJA' as const,
    diaSemana: 'LUNES' as const,
    fecha: null,
    horaInicio: '08:00',
    horaFin: '12:00',
}

const datosEspecifica = {
    espacioId: 10,
    profesionalId: 5,
    tipo: 'ESPECIFICA' as const,
    diaSemana: null,
    fecha: '2027-10-25',
    horaInicio: '08:00',
    horaFin: '12:00',
}

const espacioActivo = {
    id: 10,
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
    activo: true,
}

const profesional = {
    id: 5,
    nombre: 'Ana',
    apellido: 'Gomez',
    matricula: 'MP-12345',
    especialidad: 'Kinesiología',
}

const asignacionEspecifica = {
    ...asignacion,
    tipo: 'ESPECIFICA',
    diaSemana: null,
    fecha: '2027-10-25',
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

describe('asignacionEspacioService.crear - validaciones', () => {
    it('debe rechazar datos inválidos con 400', async () => {
        await expect(
            asignacionEspacioService.crear(null as never),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un espacioId inválido con 400', async () => {
        await expect(
            asignacionEspacioService.crear({ ...datosFija, espacioId: 0 }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar un profesionalId inválido con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosFija,
                profesionalId: -1,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar un tipo inválido con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosFija,
                tipo: 'OTRA' as never,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar un formato de hora inválido con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosFija,
                horaInicio: '9:00',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar un rango horario inválido con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosFija,
                horaInicio: '12:00',
                horaFin: '08:00',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar una FIJA sin día de semana con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosFija,
                diaSemana: null,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar una FIJA con fecha con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosFija,
                fecha: '2027-10-25',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar una ESPECIFICA sin fecha con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosEspecifica,
                fecha: null,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar una ESPECIFICA con día de semana con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosEspecifica,
                diaSemana: 'LUNES',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar una ESPECIFICA con fecha inválida con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosEspecifica,
                fecha: '2027-13-01',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar una ESPECIFICA con fecha pasada con 400', async () => {
        await expect(
            asignacionEspacioService.crear({
                ...datosEspecifica,
                fecha: '2020-01-01',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })
})

describe('asignacionEspacioService.crear - existencia y alta', () => {
    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(
            asignacionEspacioService.crear(datosFija),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si el espacio está inactivo', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacioActivo,
            activo: false,
        } as never)

        await expect(
            asignacionEspacioService.crear(datosFija),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        await expect(
            asignacionEspacioService.crear(datosFija),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe crear una asignación FIJA y retornarla', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([] as never)
        vi.mocked(asignacionEspacioModel.create).mockResolvedValue({
            id: 1,
        } as never)
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )

        const resultado = await asignacionEspacioService.crear(datosFija)

        expect(asignacionEspacioModel.create).toHaveBeenCalledWith({
            espacioId: 10,
            profesionalId: 5,
            tipo: 'FIJA',
            diaSemana: 'LUNES',
            fecha: null,
            horaInicio: '08:00',
            horaFin: '12:00',
        })
        expect(resultado).toEqual(asignacion)
    })

    it('debe crear una asignación ESPECIFICA y retornarla', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([] as never)
        vi.mocked(asignacionEspacioModel.create).mockResolvedValue({
            id: 2,
        } as never)
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacionEspecifica as never,
        )

        const resultado = await asignacionEspacioService.crear(datosEspecifica)

        expect(asignacionEspacioModel.create).toHaveBeenCalledWith({
            espacioId: 10,
            profesionalId: 5,
            tipo: 'ESPECIFICA',
            diaSemana: null,
            fecha: '2027-10-25',
            horaInicio: '08:00',
            horaFin: '12:00',
        })
        expect(resultado).toEqual(asignacionEspecifica)
    })
})

describe('asignacionEspacioService.crear - solapamientos', () => {
    function prepararAlta() {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.create).mockResolvedValue({
            id: 1,
        } as never)
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )
    }

    it('debe responder 409 si se superpone con otra asignación del mismo espacio', async () => {
        prepararAlta()
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 10,
                profesionalId: 6,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '09:00',
                horaFin: '10:00',
            },
        ] as never)

        await expect(
            asignacionEspacioService.crear(datosFija),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('debe responder 409 si se superpone con otra asignación del mismo profesional', async () => {
        prepararAlta()
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 11,
                profesionalId: 5,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '09:00',
                horaFin: '10:00',
            },
        ] as never)

        await expect(
            asignacionEspacioService.crear(datosFija),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(asignacionEspacioModel.create).not.toHaveBeenCalled()
    })

    it('no debe considerar conflicto si los intervalos solo se tocan', async () => {
        prepararAlta()
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 10,
                profesionalId: 5,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '08:00',
                horaFin: '10:00',
            },
        ] as never)

        await asignacionEspacioService.crear({
            ...datosFija,
            horaInicio: '10:00',
            horaFin: '12:00',
        })

        expect(asignacionEspacioModel.create).toHaveBeenCalled()
    })

    it('debe responder 409 si una FIJA se superpone con una ESPECIFICA del mismo día', async () => {
        prepararAlta()
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 10,
                profesionalId: 6,
                tipo: 'ESPECIFICA',
                diaSemana: null,
                fecha: '2027-10-25',
                horaInicio: '09:00',
                horaFin: '10:00',
            },
        ] as never)

        await expect(
            asignacionEspacioService.crear(datosFija),
        ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('no debe considerar conflicto si es otro día', async () => {
        prepararAlta()
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 10,
                profesionalId: 5,
                tipo: 'FIJA',
                diaSemana: 'MARTES',
                fecha: null,
                horaInicio: '08:00',
                horaFin: '12:00',
            },
        ] as never)

        await asignacionEspacioService.crear(datosFija)

        expect(asignacionEspacioModel.create).toHaveBeenCalled()
    })

    it('debe responder 409 si una ESPECIFICA se superpone con una FIJA del mismo día', async () => {
        prepararAlta()
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 10,
                profesionalId: 6,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '09:00',
                horaFin: '10:00',
            },
        ] as never)

        await expect(
            asignacionEspacioService.crear(datosEspecifica),
        ).rejects.toMatchObject({ statusCode: 409 })
    })
})

describe('asignacionEspacioService.actualizar', () => {
    it('debe responder 404 si la asignación no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(null)

        await expect(
            asignacionEspacioService.actualizar(asignacion.id, datosFija),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 400 si los datos son inválidos', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )

        await expect(
            asignacionEspacioService.actualizar(asignacion.id, {
                ...datosFija,
                horaInicio: '12:00',
                horaFin: '08:00',
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(
            asignacionEspacioService.actualizar(asignacion.id, datosFija),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 409 si el espacio está inactivo', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacioActivo,
            activo: false,
        } as never)

        await expect(
            asignacionEspacioService.actualizar(asignacion.id, datosFija),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el profesional no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        await expect(
            asignacionEspacioService.actualizar(asignacion.id, datosFija),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe responder 409 si se superpone con otra asignación', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            {
                ...asignacion,
                id: 99,
                espacioId: 10,
                profesionalId: 6,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '09:00',
                horaFin: '10:00',
            },
        ] as never)

        await expect(
            asignacionEspacioService.actualizar(asignacion.id, datosFija),
        ).rejects.toMatchObject({ statusCode: 409 })
        expect(asignacionEspacioModel.update).not.toHaveBeenCalled()
    })

    it('debe actualizar y retornar la asignación sin chocar consigo misma', async () => {
        vi.mocked(asignacionEspacioModel.findByPk)
            .mockResolvedValueOnce(asignacion as never)
            .mockResolvedValueOnce(asignacion as never)
        vi.mocked(espacioModel.findByPk).mockResolvedValue(
            espacioActivo as never,
        )
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(asignacionEspacioModel.findAll).mockResolvedValue([
            asignacion,
        ] as never)
        vi.mocked(asignacionEspacioModel.update).mockResolvedValue([1] as never)

        const resultado = await asignacionEspacioService.actualizar(
            asignacion.id,
            datosFija,
        )

        expect(asignacionEspacioModel.update).toHaveBeenCalledWith(
            {
                espacioId: 10,
                profesionalId: 5,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '08:00',
                horaFin: '12:00',
            },
            { where: { id: asignacion.id } },
        )
        expect(resultado).toEqual(asignacion)
    })
})

describe('asignacionEspacioService.eliminar', () => {
    it('debe responder 404 si la asignación no existe', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(null)

        await expect(
            asignacionEspacioService.eliminar(asignacion.id),
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(asignacionEspacioModel.destroy).not.toHaveBeenCalled()
    })

    it('debe responder 400 si el id es inválido', async () => {
        await expect(
            asignacionEspacioService.eliminar(0),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(asignacionEspacioModel.destroy).not.toHaveBeenCalled()
    })

    it('debe eliminar la asignación existente', async () => {
        vi.mocked(asignacionEspacioModel.findByPk).mockResolvedValue(
            asignacion as never,
        )
        vi.mocked(asignacionEspacioModel.destroy).mockResolvedValue(1 as never)

        await asignacionEspacioService.eliminar(asignacion.id)

        expect(asignacionEspacioModel.destroy).toHaveBeenCalledWith({
            where: { id: asignacion.id },
        })
    })
})
