import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Op } from 'sequelize'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

vi.mock('../../src/services/storageService.js', () => ({
    eliminarArchivoEstudio: vi.fn(),
}))

import {
    autorizacionEstudioModel,
    estudioModel,
    pacienteModel,
    profesionalModel,
} from '../helpers/mocksModelos.js'
import { eliminarArchivoEstudio } from '../../src/services/storageService.js'
import {
    actualizarArchivoEstudio,
    adjuntarArchivoEstudio,
    buscarEstudioPorId,
    crearEstudio,
    listarEstudios,
    obtenerEstudiosPorPaciente,
} from '../../src/services/estudioService.js'

describe('estudioService', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('listarEstudios', () => {
        it('debe listar los estudios ordenados por fecha descendente', async () => {
            const estudios = [{ id: 1 }, { id: 2 }]
            vi.mocked(estudioModel.findAll).mockResolvedValue(estudios as never)

            const resultado = await listarEstudios()

            expect(estudioModel.findAll).toHaveBeenCalledWith({
                order: [['fecha', 'DESC']],
            })
            expect(resultado).toBe(estudios)
        })
    })

    describe('buscarEstudioPorId', () => {
        it('debe buscar el estudio con paciente y autorizaciones/profesional', async () => {
            const estudio = { id: 7 }
            vi.mocked(estudioModel.findByPk).mockResolvedValue(estudio as never)

            const resultado = await buscarEstudioPorId(7)

            expect(estudioModel.findByPk).toHaveBeenCalledWith(7, {
                include: [
                    {
                        model: pacienteModel,
                        as: 'paciente',
                        attributes: ['id', 'nombre', 'apellido', 'dni'],
                    },
                    {
                        model: autorizacionEstudioModel,
                        as: 'autorizaciones',
                        required: false,
                        include: [
                            {
                                model: profesionalModel,
                                as: 'profesional',
                                attributes: [
                                    'id',
                                    'nombre',
                                    'apellido',
                                    'especialidad',
                                ],
                            },
                        ],
                    },
                ],
            })
            expect(resultado).toBe(estudio)
        })

        it('debe retornar null si el estudio no existe', async () => {
            vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

            const resultado = await buscarEstudioPorId(99)

            expect(resultado).toBeNull()
        })
    })

    describe('obtenerEstudiosPorPaciente', () => {
        it('debe rechazar si el paciente no existe', async () => {
            vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

            await expect(obtenerEstudiosPorPaciente(5)).rejects.toMatchObject({
                statusCode: 404,
                message: 'Paciente no encontrado',
            })

            expect(estudioModel.findAll).not.toHaveBeenCalled()
        })

        it('debe listar estudios del paciente con solo autorizaciones vigentes', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2026-11-07T15:00:00.000Z'))

            vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 5 } as never)
            const estudios = [{ id: 1, pacienteId: 5 }]
            vi.mocked(estudioModel.findAll).mockResolvedValue(estudios as never)

            const resultado = await obtenerEstudiosPorPaciente(5)

            expect(pacienteModel.findByPk).toHaveBeenCalledWith(5)
            expect(estudioModel.findAll).toHaveBeenCalledWith({
                where: { pacienteId: 5 },
                include: [
                    {
                        model: autorizacionEstudioModel,
                        as: 'autorizaciones',
                        required: false,
                        where: {
                            estado: 'DISPONIBLE',
                            fechaVencimiento: { [Op.gte]: '2026-11-07' },
                        },
                        include: [
                            {
                                model: profesionalModel,
                                as: 'profesional',
                                attributes: [
                                    'id',
                                    'nombre',
                                    'apellido',
                                    'especialidad',
                                ],
                            },
                        ],
                    },
                ],
                order: [['fecha', 'DESC']],
            })
            expect(resultado).toBe(estudios)
        })
    })

    describe('crearEstudio', () => {
        const data = {
            pacienteId: 5,
            tipo: 'Sangre',
            fecha: '2026-11-01',
            descripcion: 'Hemograma completo',
        }

        it('debe rechazar si el paciente no existe', async () => {
            vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

            await expect(crearEstudio(data)).rejects.toMatchObject({
                statusCode: 404,
                message: 'Paciente no encontrado',
            })

            expect(estudioModel.create).not.toHaveBeenCalled()
        })

        it('debe crear el estudio cuando el paciente existe', async () => {
            vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 5 } as never)
            const creado = { id: 10, ...data }
            vi.mocked(estudioModel.create).mockResolvedValue(creado as never)

            const resultado = await crearEstudio(data)

            expect(estudioModel.create).toHaveBeenCalledWith(data)
            expect(eliminarArchivoEstudio).not.toHaveBeenCalled()
            expect(resultado).toBe(creado)
        })

        it('debe eliminar el archivo subido si falla la creación del estudio', async () => {
            vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 5 } as never)
            const errorDb = new Error('fallo al insertar')
            vi.mocked(estudioModel.create).mockRejectedValue(errorDb)
            vi.mocked(eliminarArchivoEstudio).mockResolvedValue(undefined)

            await expect(
                crearEstudio({ ...data, archivoURL: 'estudios/5/abc.pdf' }),
            ).rejects.toBe(errorDb)

            expect(eliminarArchivoEstudio).toHaveBeenCalledWith(
                'estudios/5/abc.pdf',
            )
        })

        it('debe re-lanzar el error aunque falle la limpieza del archivo', async () => {
            vi.mocked(pacienteModel.findByPk).mockResolvedValue({ id: 5 } as never)
            const errorDb = new Error('fallo al insertar')
            vi.mocked(estudioModel.create).mockRejectedValue(errorDb)
            vi.mocked(eliminarArchivoEstudio).mockRejectedValue(
                new Error('fallo storage'),
            )

            await expect(
                crearEstudio({ ...data, archivoURL: 'estudios/5/abc.pdf' }),
            ).rejects.toBe(errorDb)
        })
    })

    describe('adjuntarArchivoEstudio', () => {
        it('debe rechazar si el estudio no existe', async () => {
            vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

            await expect(
                adjuntarArchivoEstudio(9, 'estudios/5/nuevo.pdf'),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Estudio no encontrado',
            })
        })

        it('debe actualizar el archivoURL del estudio', async () => {
            const actualizado = { id: 9, archivoURL: 'estudios/5/nuevo.pdf' }
            const instancia = { id: 9, update: vi.fn().mockResolvedValue(actualizado) }
            vi.mocked(estudioModel.findByPk).mockResolvedValue(instancia as never)

            const resultado = await adjuntarArchivoEstudio(9, 'estudios/5/nuevo.pdf')

            expect(instancia.update).toHaveBeenCalledWith({
                archivoURL: 'estudios/5/nuevo.pdf',
            })
            expect(resultado).toBe(actualizado)
        })
    })

    describe('actualizarArchivoEstudio', () => {
        it('debe rechazar si el estudio no existe', async () => {
            vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

            await expect(
                actualizarArchivoEstudio(9, 'estudios/5/nuevo.pdf'),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'Estudio no encontrado',
            })

            expect(eliminarArchivoEstudio).not.toHaveBeenCalled()
        })

        it('debe eliminar el archivo anterior si cambia el path', async () => {
            const actualizado = { id: 9, archivoURL: 'estudios/5/nuevo.pdf' }
            const instancia = {
                id: 9,
                archivoURL: 'estudios/5/viejo.pdf',
                update: vi.fn().mockResolvedValue(actualizado),
            }
            vi.mocked(estudioModel.findByPk).mockResolvedValue(instancia as never)
            vi.mocked(eliminarArchivoEstudio).mockResolvedValue(undefined)

            const resultado = await actualizarArchivoEstudio(9, 'estudios/5/nuevo.pdf')

            expect(instancia.update).toHaveBeenCalledWith({
                archivoURL: 'estudios/5/nuevo.pdf',
            })
            expect(eliminarArchivoEstudio).toHaveBeenCalledWith('estudios/5/viejo.pdf')
            expect(resultado).toBe(actualizado)
        })

        it('no debe eliminar archivo si no había uno previo', async () => {
            const actualizado = { id: 9, archivoURL: 'estudios/5/nuevo.pdf' }
            const instancia = {
                id: 9,
                archivoURL: null,
                update: vi.fn().mockResolvedValue(actualizado),
            }
            vi.mocked(estudioModel.findByPk).mockResolvedValue(instancia as never)

            await actualizarArchivoEstudio(9, 'estudios/5/nuevo.pdf')

            expect(eliminarArchivoEstudio).not.toHaveBeenCalled()
        })

        it('no debe eliminar archivo si el path es el mismo', async () => {
            const path = 'estudios/5/mismo.pdf'
            const actualizado = { id: 9, archivoURL: path }
            const instancia = {
                id: 9,
                archivoURL: path,
                update: vi.fn().mockResolvedValue(actualizado),
            }
            vi.mocked(estudioModel.findByPk).mockResolvedValue(instancia as never)

            await actualizarArchivoEstudio(9, path)

            expect(eliminarArchivoEstudio).not.toHaveBeenCalled()
        })
    })
})