import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

import { profesionalModel, usuarioModel } from '../helpers/mocksModelos.js'

import { profesionalService } from '../../src/services/profesionalService.js'

const datos = {
    usuarioId: 10,
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '12345678',
    telefono: '+5491112345678',
    matricula: 'MP-12345',
    especialidad: 'Cardiología',
}

const profesionalCreado = {
    id: 3,
    usuarioId: 10,
    ...datos,
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('profesionalService.listar', () => {
    it('debe listar los profesionales sin exponer contraseñas', async () => {
        vi.mocked(profesionalModel.findAll).mockResolvedValue([
            profesionalCreado,
        ] as never)

        const resultado = await profesionalService.listar()

        expect(profesionalModel.findAll).toHaveBeenCalledWith({
            include: [
                {
                    model: usuarioModel,
                    as: 'usuario',
                    attributes: { exclude: ['password'] },
                },
            ],
            order: [['id', 'ASC']],
        })
        expect(resultado).toEqual([profesionalCreado])
    })
})

describe('profesionalService.buscarPorId', () => {
    it('debe retornar el profesional si existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalCreado as never,
        )

        const resultado = await profesionalService.buscarPorId(3)

        expect(profesionalModel.findByPk).toHaveBeenCalledWith(3, {
            include: [
                {
                    model: usuarioModel,
                    as: 'usuario',
                    attributes: { exclude: ['password'] },
                },
            ],
        })
        expect(resultado).toEqual(profesionalCreado)
    })

    it('debe retornar null si no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        const resultado = await profesionalService.buscarPorId(999)

        expect(resultado).toBeNull()
    })
})

describe('profesionalService.buscarPorUsuarioId', () => {
    it('debe buscar el perfil asociado a la cuenta', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(
            profesionalCreado as never,
        )

        const resultado = await profesionalService.buscarPorUsuarioId(10)

        expect(profesionalModel.findOne).toHaveBeenCalledWith({
            where: { usuarioId: 10 },
            include: [
                {
                    model: usuarioModel,
                    as: 'usuario',
                    attributes: { exclude: ['password'] },
                },
            ],
        })
        expect(resultado).toEqual(profesionalCreado)
    })

    it('debe retornar null cuando la cuenta no tiene perfil', async () => {
        vi.mocked(profesionalModel.findOne).mockResolvedValue(null)

        const resultado = await profesionalService.buscarPorUsuarioId(10)

        expect(resultado).toBeNull()
    })
})

describe('profesionalService.crear', () => {
    it('debe rechazar datos inválidos con 400', async () => {
        await expect(
            profesionalService.crear({ ...datos, dni: '123' }),
        ).rejects.toMatchObject({ statusCode: 400 })

        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar con 404 si el usuario asociado no existe', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue(null)

        await expect(profesionalService.crear(datos)).rejects.toMatchObject({
            statusCode: 404,
        })

        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar con 400 si la cuenta no tiene rol PROFESIONAL', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PACIENTE',
        } as never)

        await expect(profesionalService.crear(datos)).rejects.toMatchObject({
            statusCode: 400,
        })

        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar con 409 si el DNI ya está registrado', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PROFESIONAL',
        } as never)
        vi.mocked(profesionalModel.findOne).mockResolvedValue({
            id: 5,
            dni: '12345678',
        } as never)

        await expect(profesionalService.crear(datos)).rejects.toMatchObject({
            statusCode: 409,
        })

        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar con 409 si la matrícula ya está registrada', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PROFESIONAL',
        } as never)
        vi.mocked(profesionalModel.findOne)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 5, matricula: 'MP-12345' } as never)

        await expect(profesionalService.crear(datos)).rejects.toMatchObject({
            statusCode: 409,
        })

        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar con 409 si la cuenta ya tiene un perfil asignado', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PROFESIONAL',
        } as never)
        vi.mocked(profesionalModel.findOne)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 6, usuarioId: 10 } as never)

        await expect(profesionalService.crear(datos)).rejects.toMatchObject({
            statusCode: 409,
        })

        expect(profesionalModel.create).not.toHaveBeenCalled()
    })

    it('debe crear el profesional y devolver sus datos públicos', async () => {
        vi.mocked(usuarioModel.findByPk).mockResolvedValue({
            id: 10,
            rol: 'PROFESIONAL',
        } as never)
        vi.mocked(profesionalModel.findOne).mockResolvedValue(null)
        vi.mocked(profesionalModel.create).mockResolvedValue({ id: 3 } as never)
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesionalCreado as never,
        )

        const resultado = await profesionalService.crear(datos)

        expect(profesionalModel.create).toHaveBeenCalledWith({
            usuarioId: 10,
            nombre: 'Ana',
            apellido: 'Gomez',
            dni: '12345678',
            telefono: '+5491112345678',
            matricula: 'MP-12345',
            especialidad: 'Cardiología',
        })
        expect(resultado).toEqual(profesionalCreado)
    })
})

describe('profesionalService.actualizar', () => {
    it('debe rechazar con 404 si el profesional no existe', async () => {
        vi.mocked(profesionalModel.findByPk).mockResolvedValue(null)

        await expect(
            profesionalService.actualizar(999, { nombre: 'Ana' }),
        ).rejects.toMatchObject({ statusCode: 404 })

        expect(profesionalModel.update).not.toHaveBeenCalled()
    })

    it('debe ignorar la modificación de usuarioId', async () => {
        const profesional = {
            ...profesionalCreado,
            nombre: 'Viejo',
            save: vi.fn(),
        }

        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )

        await profesionalService.actualizar(3, {
            usuarioId: 999,
            nombre: 'Nuevo',
        } as never)

        expect(profesional.usuarioId).toBe(10)
        expect(profesional.nombre).toBe('Nuevo')
        expect(profesional.save).toHaveBeenCalledTimes(1)
    })

    it('debe rechazar con 409 si cambia a un DNI de otro profesional', async () => {
        const profesional = { ...profesionalCreado, save: vi.fn() }

        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(profesionalModel.findOne).mockResolvedValue({
            id: 5,
            dni: '87654321',
        } as never)

        await expect(
            profesionalService.actualizar(3, { dni: '87654321' }),
        ).rejects.toMatchObject({ statusCode: 409 })

        expect(profesional.save).not.toHaveBeenCalled()
    })

    it('debe rechazar con 409 si cambia a una matrícula de otro profesional', async () => {
        const profesional = { ...profesionalCreado, save: vi.fn() }

        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(profesionalModel.findOne).mockResolvedValue({
            id: 5,
            matricula: 'MP-99999',
        } as never)

        await expect(
            profesionalService.actualizar(3, { matricula: 'MP-99999' }),
        ).rejects.toMatchObject({ statusCode: 409 })

        expect(profesional.save).not.toHaveBeenCalled()
    })

    it('debe rechazar con 400 si los datos son inválidos', async () => {
        const profesional = { ...profesionalCreado, save: vi.fn() }

        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )

        await expect(
            profesionalService.actualizar(3, { dni: 'abc' }),
        ).rejects.toMatchObject({ statusCode: 400 })

        expect(profesional.save).not.toHaveBeenCalled()
    })

    it('debe actualizar los campos permitidos', async () => {
        const profesional = { ...profesionalCreado, save: vi.fn() }

        vi.mocked(profesionalModel.findByPk).mockResolvedValue(
            profesional as never,
        )
        vi.mocked(profesionalModel.findOne).mockResolvedValue(null)

        const resultado = await profesionalService.actualizar(3, {
            nombre: 'Nuevo',
            especialidad: 'Neurología',
        })

        expect(profesional.nombre).toBe('Nuevo')
        expect(profesional.especialidad).toBe('Neurología')
        expect(profesional.save).toHaveBeenCalledTimes(1)
        expect(resultado).toEqual(profesional)
    })
})
