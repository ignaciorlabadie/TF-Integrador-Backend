import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

vi.mock('../../src/models/index.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return mocks.modelosMock()
})

vi.mock('../../src/models/Usuario.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.usuarioModel }
})

vi.mock('../../src/config/database.js', async () => {
    const mocks = await import('../helpers/mocksModelos.js')

    return { default: mocks.databaseMock() }
})

vi.mock('../../src/services/storageService.js', () => ({
    subirArchivoEstudio: vi.fn().mockResolvedValue('estudios/5/archivo.pdf'),
    crearUrlFirmada: vi.fn().mockReturnValue({
        url: 'https://test.supabase.co/storage/v1/object/sign/estudios/5/archivo.pdf',
        expiresIn: 3600,
    }),
    eliminarArchivoEstudio: vi.fn().mockResolvedValue(undefined),
}))

import {
    subirArchivoEstudio,
    crearUrlFirmada,
} from '../../src/services/storageService.js'
import {
    estudioModel,
    pacienteModel,
} from '../helpers/mocksModelos.js'
import app from '../../src/app.js'

const JWT_SECRET = 'secreto-de-prueba'

function tokenPara(
    id: number,
    rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN',
) {
    return jwt.sign(
        { id, email: `${rol.toLowerCase()}@test.com`, rol },
        JWT_SECRET,
    )
}

function autenticado(
    rol: 'PACIENTE' | 'PROFESIONAL' | 'ADMIN',
    id = 1,
) {
    return {
        Authorization: `Bearer ${tokenPara(id, rol)}`,
    }
}

const estudioExistente = {
    id: 1,
    pacienteId: 5,
    tipo: 'Radiografía',
    fecha: '2025-03-10',
    descripcion: 'Control de rutina',
    archivoURL: null,
    paciente: {
        id: 5,
        nombre: 'Ana',
        apellido: 'Gomez',
        dni: '12345678',
    },
    autorizaciones: [],
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('JWT_SECRET', JWT_SECRET)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('GET /api/estudios', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/estudios')

        expect(respuesta.status).toBe(401)
        expect(estudioModel.findAll).not.toHaveBeenCalled()
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .get('/api/estudios')
            .set(autenticado('PACIENTE', 1))

        expect(respuesta.status).toBe(403)
    })

    it('debe listar los estudios ordenados por fecha descendente como administrador', async () => {
        vi.mocked(estudioModel.findAll).mockResolvedValue([estudioExistente])

        const respuesta = await request(app)
            .get('/api/estudios')
            .set(autenticado('ADMIN', 99))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([estudioExistente])
        expect(estudioModel.findAll).toHaveBeenCalledWith({
            order: [['fecha', 'DESC']],
        })
    })

    it('debe listar los estudios como profesional', async () => {
        vi.mocked(estudioModel.findAll).mockResolvedValue([])

        const respuesta = await request(app)
            .get('/api/estudios')
            .set(autenticado('PROFESIONAL', 7))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([])
    })
})

describe('GET /api/estudios/:id', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/estudios/1')

        expect(respuesta.status).toBe(401)
    })

    it('debe devolver el estudio con su paciente y autorizaciones', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue(
            estudioExistente as never,
        )

        const respuesta = await request(app)
            .get('/api/estudios/1')
            .set(autenticado('PROFESIONAL', 7))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.id).toBe(1)
        expect(respuesta.body.paciente.dni).toBe('12345678')
        expect(estudioModel.findByPk).toHaveBeenCalledWith(
            1,
            expect.any(Object),
        )
    })

    it('debe responder 404 cuando el estudio no existe', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/estudios/999')
            .set(autenticado('ADMIN', 99))

        expect(respuesta.status).toBe(404)
    })
})

describe('GET /api/estudios/paciente/:pacienteId', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/estudios/paciente/5')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un profesional', async () => {
        const respuesta = await request(app)
            .get('/api/estudios/paciente/5')
            .set(autenticado('PROFESIONAL', 7))

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 404 cuando el paciente no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/estudios/paciente/5')
            .set(autenticado('PACIENTE', 1))

        expect(respuesta.status).toBe(404)
    })

    it('debe listar los estudios del paciente con autorizaciones vigentes', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 5,
            nombre: 'Ana',
        } as never)
        vi.mocked(estudioModel.findAll).mockResolvedValue([estudioExistente])

        const respuesta = await request(app)
            .get('/api/estudios/paciente/5')
            .set(autenticado('PACIENTE', 1))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual([estudioExistente])
        expect(estudioModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { pacienteId: 5 },
                order: [['fecha', 'DESC']],
            }),
        )
    })
})

describe('POST /api/estudios', () => {
    const datosEstudio = {
        pacienteId: '5',
        tipo: 'Resonancia',
        fecha: '2025-03-11',
        descripcion: 'Control de rodilla',
    }

    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).post('/api/estudios')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .post('/api/estudios')
            .set(autenticado('PACIENTE', 1))
            .send(datosEstudio)

        expect(respuesta.status).toBe(403)
    })

    it('debe rechazar cuando falta el tipo de estudio', async () => {
        const respuesta = await request(app)
            .post('/api/estudios')
            .set(autenticado('ADMIN', 99))
            .send({ ...datosEstudio, tipo: '' })

        expect(respuesta.status).toBe(400)
        expect(estudioModel.create).not.toHaveBeenCalled()
    })

    it('debe rechazar cuando la fecha tiene formato inválido', async () => {
        const respuesta = await request(app)
            .post('/api/estudios')
            .set(autenticado('ADMIN', 99))
            .send({ ...datosEstudio, fecha: '11-03-2025' })

        expect(respuesta.status).toBe(400)
    })

    it('debe rechazar cuando falta la descripción', async () => {
        const respuesta = await request(app)
            .post('/api/estudios')
            .set(autenticado('ADMIN', 99))
            .send({ ...datosEstudio, descripcion: '' })

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 cuando el paciente no existe', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .post('/api/estudios')
            .set(autenticado('ADMIN', 99))
            .send(datosEstudio)

        expect(respuesta.status).toBe(404)
        expect(estudioModel.create).not.toHaveBeenCalled()
    })

    it('debe crear el estudio sin archivo como administrador', async () => {
        vi.mocked(pacienteModel.findByPk).mockResolvedValue({
            id: 5,
            nombre: 'Ana',
        } as never)
        vi.mocked(estudioModel.create).mockResolvedValue({
            id: 2,
            ...datosEstudio,
            pacienteId: 5,
            archivoURL: null,
        } as never)

        const respuesta = await request(app)
            .post('/api/estudios')
            .set(autenticado('ADMIN', 99))
            .send(datosEstudio)

        expect(respuesta.status).toBe(201)
        expect(respuesta.body.id).toBe(2)
        expect(respuesta.body.archivoURL).toBeNull()
        expect(estudioModel.create).toHaveBeenCalledWith({
            pacienteId: 5,
            tipo: 'Resonancia',
            fecha: '2025-03-11',
            descripcion: 'Control de rodilla',
            archivoURL: null,
        })
    })
})

describe('PUT /api/estudios/:id/archivo', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).put(
            '/api/estudios/1/archivo',
        )

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 403 a un paciente', async () => {
        const respuesta = await request(app)
            .put('/api/estudios/1/archivo')
            .set(autenticado('PACIENTE', 1))

        expect(respuesta.status).toBe(403)
    })

    it('debe responder 400 si no se proporciona un archivo', async () => {
        const respuesta = await request(app)
            .put('/api/estudios/1/archivo')
            .set(autenticado('PROFESIONAL', 7))

        expect(respuesta.status).toBe(400)
    })

    it('debe responder 404 cuando el estudio no existe', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .put('/api/estudios/1/archivo')
            .set(autenticado('PROFESIONAL', 7))
            .attach('archivo', Buffer.from('contenido'), 'nuevo.pdf')

        expect(respuesta.status).toBe(404)
    })

    it('debe actualizar el archivo del estudio', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue({
            ...estudioExistente,
            update: vi.fn().mockResolvedValue({
                ...estudioExistente,
                archivoURL: 'estudios/5/nuevo.pdf',
            }),
        } as never)

        const respuesta = await request(app)
            .put('/api/estudios/1/archivo')
            .set(autenticado('ADMIN', 99))
            .attach('archivo', Buffer.from('contenido'), 'nuevo.pdf')

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.archivoURL).toBe('estudios/5/nuevo.pdf')
        expect(subirArchivoEstudio).toHaveBeenCalled()
    })
})

describe('GET /api/estudios/:id/archivo', () => {
    it('debe responder 401 sin token', async () => {
        const respuesta = await request(app).get('/api/estudios/1/archivo')

        expect(respuesta.status).toBe(401)
    })

    it('debe responder 404 cuando el estudio no existe', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue(null)

        const respuesta = await request(app)
            .get('/api/estudios/1/archivo')
            .set(autenticado('PROFESIONAL', 7))

        expect(respuesta.status).toBe(404)
    })

    it('debe responder 404 cuando el estudio no tiene archivo', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue({
            ...estudioExistente,
            archivoURL: null,
        } as never)

        const respuesta = await request(app)
            .get('/api/estudios/1/archivo')
            .set(autenticado('PROFESIONAL', 7))

        expect(respuesta.status).toBe(404)
    })

    it('debe devolver la URL firmada del archivo', async () => {
        vi.mocked(estudioModel.findByPk).mockResolvedValue({
            ...estudioExistente,
            archivoURL: 'estudios/5/archivo.pdf',
        } as never)

        const respuesta = await request(app)
            .get('/api/estudios/1/archivo')
            .set(autenticado('ADMIN', 99))

        expect(respuesta.status).toBe(200)
        expect(respuesta.body).toEqual({
            url: 'https://test.supabase.co/storage/v1/object/sign/estudios/5/archivo.pdf',
            expiresIn: 3600,
        })
        expect(crearUrlFirmada).toHaveBeenCalledWith('estudios/5/archivo.pdf')
    })
})