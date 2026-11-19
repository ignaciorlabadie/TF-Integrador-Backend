import { Router } from 'express'

import { asignacionEspacioController } from '../controllers/asignacionEspacioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /asignaciones-espacio:
 *   get:
 *     tags:
 *       - Asignaciones de espacio
 *     summary: Lista asignaciones de espacio
 *     description: >
 *       ADMIN o PROFESIONAL. Un PROFESIONAL ve solo sus propias asignaciones,
 *       incluso si envía otro profesionalId.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: espacioId
 *         in: query
 *         required: false
 *         description: Filtra por ID de espacio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: profesionalId
 *         in: query
 *         required: false
 *         description: Filtra por ID de profesional.
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: tipo
 *         in: query
 *         required: false
 *         description: Filtra por tipo de asignación.
 *         schema:
 *           type: string
 *           enum:
 *             - FIJA
 *             - ESPECIFICA
 *     responses:
 *       '200':
 *         description: Listado de asignaciones con espacio y profesional.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AsignacionEspacio'
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
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.listar,
)

/**
 * @openapi
 * /asignaciones-espacio/{id}:
 *   get:
 *     tags:
 *       - Asignaciones de espacio
 *     summary: Obtiene una asignación por ID
 *     description: Un PROFESIONAL solo puede ver sus propias asignaciones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la asignación.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Asignación solicitada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionEspacio'
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
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.buscarPorId,
)

/**
 * @openapi
 * /asignaciones-espacio:
 *   post:
 *     tags:
 *       - Asignaciones de espacio
 *     summary: Crea una asignación de espacio
 *     description: >
 *       ADMIN o PROFESIONAL. Un PROFESIONAL solo puede crear asignaciones
 *       ESPECIFICA para sí mismo. Falla con 409 si se superpone con otra
 *       asignación o si el espacio está inactivo.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearAsignacionEspacioRequest'
 *     responses:
 *       '201':
 *         description: Asignación creada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionEspacio'
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
    asignacionEspacioController.crear,
)

/**
 * @openapi
 * /asignaciones-espacio/{id}:
 *   put:
 *     tags:
 *       - Asignaciones de espacio
 *     summary: Actualiza una asignación de espacio
 *     description: >
 *       Un PROFESIONAL solo puede editar sus asignaciones ESPECIFICA y no
 *       puede convertirlas en FIJA.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la asignación.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarAsignacionEspacioRequest'
 *     responses:
 *       '200':
 *         description: Asignación actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionEspacio'
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
router.put(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.actualizar,
)

/**
 * @openapi
 * /asignaciones-espacio/{id}:
 *   delete:
 *     tags:
 *       - Asignaciones de espacio
 *     summary: Elimina una asignación de espacio
 *     description: Un PROFESIONAL solo puede eliminar sus propias asignaciones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la asignación.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '204':
 *         description: Asignación eliminada. Sin contenido.
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.delete(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.eliminar,
)

export default router
