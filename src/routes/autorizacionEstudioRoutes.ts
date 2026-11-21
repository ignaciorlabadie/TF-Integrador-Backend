import { Router } from 'express'
import {
    obtenerAutorizaciones,
    obtenerAutorizacionPorId,
    crearAutorizacion,
    revocarAutorizacion,
    verificarVigencia,
} from '../controllers/autorizacionEstudioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /autorizacionestudios:
 *   get:
 *     tags:
 *       - Autorizaciones de estudio
 *     summary: Lista las autorizaciones de estudio
 *     description: >
 *       ADMIN o PROFESIONAL ven todas. PACIENTE solo las autorizaciones de sus
 *       propios estudios.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Listado de autorizaciones.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AutorizacionEstudio'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL', 'PACIENTE'),
    obtenerAutorizaciones,
)

/**
 * @openapi
 * /autorizacionestudios/{id}:
 *   get:
 *     tags:
 *       - Autorizaciones de estudio
 *     summary: Obtiene una autorización por ID
 *     description: >
 *       ADMIN o PROFESIONAL pueden consultar cualquier autorización. PACIENTE
 *       solo las de sus propios estudios.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la autorización.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Autorización solicitada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutorizacionEstudio'
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
    obtenerAutorizacionPorId,
)

/**
 * @openapi
 * /autorizacionestudios/{id}/vigencia:
 *   get:
 *     tags:
 *       - Autorizaciones de estudio
 *     summary: Consulta la vigencia de una autorización
 *     description: >
 *       Una autorización está vigente si su estado es DISPONIBLE y su fecha
 *       de vencimiento no pasó. ADMIN y PROFESIONAL pueden consultarla;
 *       PACIENTE solo si pertenece a uno de sus estudios.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la autorización.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Estado de vigencia de la autorización.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VigenciaAutorizacionResponse'
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
    '/:id/vigencia',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL', 'PACIENTE'),
    verificarVigencia,
)

/**
 * @openapi
 * /autorizacionestudios:
 *   post:
 *     tags:
 *       - Autorizaciones de estudio
 *     summary: Crea una autorización de estudio
 *     description: >
 *       ADMIN o PROFESIONAL. El estado se define automáticamente como
 *       DISPONIBLE. No puede existir otra autorización vigente para el mismo
 *       profesional y estudio.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearAutorizacionEstudioRequest'
 *     responses:
 *       '201':
 *         description: Autorización creada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutorizacionEstudio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 *       '409':
 *         $ref: '#/components/responses/Conflicto'
 */
router.post(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    crearAutorizacion,
)

/**
 * @openapi
 * /autorizacionestudios/{id}/revocar:
 *   patch:
 *     tags:
 *       - Autorizaciones de estudio
 *     summary: Revoca una autorización
 *     description: Cambia el estado de la autorización a VENCIDO.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la autorización.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Autorización revocada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutorizacionEstudio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.patch(
    '/:id/revocar',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    revocarAutorizacion,
)

export default router
