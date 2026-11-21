import { Router } from 'express'
import {
    obtenerEstudios,
    obtenerEstudioPorId,
    obtenerEstudiosPaciente,
    registrarEstudio,
    modificarArchivo,
    obtenerArchivo,
} from '../controllers/estudioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'
import uploadEstudio from '../config/multer.js'

const router = Router()

/**
 * @openapi
 * /estudios:
 *   get:
 *     tags:
 *       - Estudios
 *     summary: Lista todos los estudios
 *     description: Solo ADMIN o PROFESIONAL. Ordenados por fecha descendente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Listado de estudios.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Estudio'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    obtenerEstudios,
)

/**
 * @openapi
 * /estudios/{id}:
 *   get:
 *     tags:
 *       - Estudios
 *     summary: Obtiene un estudio por ID
 *     description: >
 *       ADMIN, PROFESIONAL o PACIENTE. Los pacientes solo pueden acceder a sus
 *       propios estudios. Incluye el paciente y las autorizaciones vigentes con
 *       su profesional.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del estudio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Estudio solicitado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Estudio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL', 'PACIENTE'),
    obtenerEstudioPorId,
)

/**
 * @openapi
 * /estudios/paciente/{pacienteId}:
 *   get:
 *     tags:
 *       - Estudios
 *     summary: Lista los estudios de un paciente
 *     description: >
 *       ADMIN o PACIENTE. Los pacientes ven siempre sus propios estudios; el
 *       ID de la ruta se ignora para ese rol. Incluye solo las autorizaciones
 *       disponibles y no vencidas.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: pacienteId
 *         in: path
 *         required: true
 *         description: ID numérico del paciente.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Estudios del paciente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Estudio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get(
    '/paciente/:pacienteId',
    verificarToken,
    verificarRol('ADMIN', 'PACIENTE'),
    obtenerEstudiosPaciente,
)

/**
 * @openapi
 * /estudios:
 *   post:
 *     tags:
 *       - Estudios
 *     summary: Registra un estudio
 *     description: >
 *       Solo ADMIN. Los campos se envían como multipart/form-data. El archivo
 *       es opcional y debe ser PDF, JPEG o PNG de hasta 10 MB.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CrearEstudioRequest'
 *     responses:
 *       '201':
 *         description: Estudio registrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Estudio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.post(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    uploadEstudio.single('archivo'),
    registrarEstudio,
)

/**
 * @openapi
 * /estudios/{id}/archivo:
 *   put:
 *     tags:
 *       - Estudios
 *     summary: Reemplaza el archivo de un estudio
 *     description: >
 *       ADMIN, PROFESIONAL o PACIENTE (solo su propio estudio). El archivo es
 *       obligatorio, debe ser PDF, JPEG o PNG de hasta 10 MB y reemplaza al
 *       archivo anterior.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del estudio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - archivo
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: PDF, JPEG o PNG de hasta 10 MB.
 *     responses:
 *       '200':
 *         description: Estudio con la ruta del nuevo archivo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Estudio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.put(
    '/:id/archivo',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL', 'PACIENTE'),
    uploadEstudio.single('archivo'),
    modificarArchivo,
)

/**
 * @openapi
 * /estudios/{id}/archivo:
 *   get:
 *     tags:
 *       - Estudios
 *     summary: Obtiene una URL firmada del archivo de un estudio
 *     description: >
 *       ADMIN, PROFESIONAL o PACIENTE (solo su propio estudio). No devuelve el
 *       binario: responde con una URL temporal de Supabase y su tiempo de
 *       validez en segundos.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del estudio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: URL firmada para descargar el archivo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UrlFirmadaResponse'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get(
    '/:id/archivo',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL', 'PACIENTE'),
    obtenerArchivo,
)

export default router
