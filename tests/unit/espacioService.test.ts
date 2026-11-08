import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

import {
    asignacionEspacioModel,
    espacioModel,
    tarifaEspaciosModel,
} from '../helpers/mocksModelos.js'
import { espacioService } from '../../src/services/espacioService.js'

const espacio = {
    id: 10,
    nombre: 'Sala 1',
    tipo: 'GIMNASIO',
    ubicacion: 'ADELANTE',
    activo: true,
}

const datosCreacion = {
    nombre: 'Sala 1',
    tipo: 'GIMNASIO' as const,
    ubicacion: 'ADELANTE' as const,
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('espacioService.listar', () => {
    it('debe listar espacios sin filtros', async () => {
        vi.mocked(espacioModel.findAll).mockResolvedValue([espacio] as never)

        const resultado = await espacioService.listar()

        expect(espacioModel.findAll).toHaveBeenCalledWith({
            where: {},
            order: [['id', 'ASC']],
        })
        expect(resultado).toEqual([espacio])
    })

    it('debe filtrar por activo, tipo y ubicacion', async () => {
        vi.mocked(espacioModel.findAll).mockResolvedValue([] as never)

        await espacioService.listar({
            activo: false,
            tipo: 'CONSULTORIO',
            ubicacion: 'ATRAS',
        })

        expect(espacioModel.findAll).toHaveBeenCalledWith({
            where: {
                activo: false,
                tipo: 'CONSULTORIO',
                ubicacion: 'ATRAS',
            },
            order: [['id', 'ASC']],
        })
    })

    it('debe rechazar activo no booleano con 400', async () => {
        await expect(
            espacioService.listar({ activo: 'true' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe rechazar un tipo inválido con 400', async () => {
        await expect(
            espacioService.listar({ tipo: 'OTRO' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe rechazar una ubicación inválida con 400', async () => {
        await expect(
            espacioService.listar({ ubicacion: 'ARRIBA' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })
})

describe('espacioService.buscarPorId', () => {
    it('debe rechazar un ID inválido con 400', async () => {
        await expect(espacioService.buscarPorId(0)).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe retornar el espacio encontrado', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)

        const resultado = await espacioService.buscarPorId(10)

        expect(espacioModel.findByPk).toHaveBeenCalledWith(10)
        expect(resultado).toEqual(espacio)
    })

    it('debe retornar null si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        const resultado = await espacioService.buscarPorId(999)

        expect(resultado).toBeNull()
    })
})

describe('espacioService.crear', () => {
    it('debe rechazar datos inválidos con 400', async () => {
        await expect(espacioService.crear(null as never)).rejects.toMatchObject(
            { statusCode: 400 },
        )
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un nombre inválido con 400', async () => {
        await expect(
            espacioService.crear({ ...datosCreacion, nombre: '   ' }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar un tipo inválido con 400', async () => {
        await expect(
            espacioService.crear({ ...datosCreacion, tipo: 'OTRO' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar una ubicación inválida con 400', async () => {
        await expect(
            espacioService.crear({
                ...datosCreacion,
                ubicacion: 'ARRIBA' as never,
            }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.create).not.toHaveBeenCalled()
    })

    it('debe crear el espacio y retornarlo', async () => {
        vi.mocked(espacioModel.create).mockResolvedValue({ id: 10 } as never)
        vi.mocked(espacioModel.findByPk).mockResolvedValue(espacio as never)

        const resultado = await espacioService.crear({
            ...datosCreacion,
            nombre: '  Sala 1  ',
        })

        expect(espacioModel.create).toHaveBeenCalledWith({
            nombre: 'Sala 1',
            tipo: 'GIMNASIO',
            ubicacion: 'ADELANTE',
        })
        expect(espacioModel.findByPk).toHaveBeenCalledWith(10)
        expect(resultado).toEqual(espacio)
    })
})

describe('espacioService.actualizar', () => {
    it('debe rechazar un ID inválido con 400', async () => {
        await expect(
            espacioService.actualizar(0, { nombre: 'Sala 2' }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe rechazar un body vacío con 400', async () => {
        await expect(espacioService.actualizar(10, {})).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(espacioModel.findByPk).not.toHaveBeenCalled()
    })

    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(
            espacioService.actualizar(999, { nombre: 'Sala 2' }),
        ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('debe rechazar un campo inválido con 400', async () => {
        const guardado = vi.fn()
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            save: guardado,
        } as never)

        await expect(
            espacioService.actualizar(10, { tipo: 'OTRO' as never }),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(guardado).not.toHaveBeenCalled()
    })

    it('debe actualizar y retornar el espacio', async () => {
        const guardado = vi.fn()
        const espacioActual = { ...espacio, save: guardado }
        const espacioActualizado = { ...espacio, nombre: 'Sala 2' }

        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(espacioActual as never)
            .mockResolvedValueOnce(espacioActualizado as never)

        const resultado = await espacioService.actualizar(10, {
            nombre: '  Sala 2  ',
        })

        expect(espacioActual.nombre).toBe('Sala 2')
        expect(guardado).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(espacioActualizado)
    })
})

describe('espacioService.desactivar', () => {
    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(espacioService.desactivar(999)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('debe ser idempotente si ya está inactivo', async () => {
        const inactivo = { ...espacio, activo: false, save: vi.fn() }
        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(inactivo as never)
            .mockResolvedValueOnce(inactivo as never)

        const resultado = await espacioService.desactivar(10)

        expect(inactivo.save).not.toHaveBeenCalled()
        expect(resultado).toEqual(inactivo)
    })

    it('debe desactivar el espacio', async () => {
        const activo = { ...espacio, save: vi.fn() }
        const desactivado = { ...espacio, activo: false }

        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(activo as never)
            .mockResolvedValueOnce(desactivado as never)

        const resultado = await espacioService.desactivar(10)

        expect(activo.activo).toBe(false)
        expect(activo.save).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(desactivado)
    })
})

describe('espacioService.reactivar', () => {
    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(espacioService.reactivar(999)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('debe ser idempotente si ya está activo', async () => {
        const activo = { ...espacio, save: vi.fn() }
        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(activo as never)
            .mockResolvedValueOnce(activo as never)

        const resultado = await espacioService.reactivar(10)

        expect(activo.save).not.toHaveBeenCalled()
        expect(resultado).toEqual(activo)
    })

    it('debe reactivar el espacio', async () => {
        const inactivo = { ...espacio, activo: false, save: vi.fn() }
        const reactivado = { ...espacio, activo: true }

        vi.mocked(espacioModel.findByPk)
            .mockResolvedValueOnce(inactivo as never)
            .mockResolvedValueOnce(reactivado as never)

        const resultado = await espacioService.reactivar(10)

        expect(inactivo.activo).toBe(true)
        expect(inactivo.save).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(reactivado)
    })
})

describe('espacioService.eliminar', () => {
    it('debe responder 404 si el espacio no existe', async () => {
        vi.mocked(espacioModel.findByPk).mockResolvedValue(null)

        await expect(espacioService.eliminar(999)).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('debe responder 409 si tiene asignaciones asociadas', async () => {
        const destroy = vi.fn()
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            destroy,
        } as never)
        vi.mocked(asignacionEspacioModel.count).mockResolvedValue(1 as never)
        vi.mocked(tarifaEspaciosModel.count).mockResolvedValue(0 as never)

        await expect(espacioService.eliminar(10)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(destroy).not.toHaveBeenCalled()
    })

    it('debe responder 409 si tiene tarifas asociadas', async () => {
        const destroy = vi.fn()
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            destroy,
        } as never)
        vi.mocked(asignacionEspacioModel.count).mockResolvedValue(0 as never)
        vi.mocked(tarifaEspaciosModel.count).mockResolvedValue(2 as never)

        await expect(espacioService.eliminar(10)).rejects.toMatchObject({
            statusCode: 409,
        })
        expect(destroy).not.toHaveBeenCalled()
    })

    it('debe eliminar el espacio si no tiene dependencias', async () => {
        const destroy = vi.fn()
        vi.mocked(espacioModel.findByPk).mockResolvedValue({
            ...espacio,
            destroy,
        } as never)
        vi.mocked(asignacionEspacioModel.count).mockResolvedValue(0 as never)
        vi.mocked(tarifaEspaciosModel.count).mockResolvedValue(0 as never)

        await espacioService.eliminar(10)

        expect(destroy).toHaveBeenCalledTimes(1)
    })
})

describe('espacioService.obtenerOcupacion', () => {
    it('debe rechazar fechas inválidas con 400', async () => {
        await expect(
            espacioService.obtenerOcupacion('2026-13-01', '2026-13-07'),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe rechazar un rango invertido con 400', async () => {
        await expect(
            espacioService.obtenerOcupacion('2026-10-11', '2026-10-05'),
        ).rejects.toMatchObject({ statusCode: 400 })
        expect(espacioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe retornar los espacios con sus asignaciones', async () => {
        vi.mocked(espacioModel.findAll).mockResolvedValue([espacio] as never)

        const resultado = await espacioService.obtenerOcupacion(
            '2026-10-05',
            '2026-10-11',
        )

        expect(espacioModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ order: [['id', 'ASC']] }),
        )
        expect(resultado).toEqual([espacio])
    })
})
