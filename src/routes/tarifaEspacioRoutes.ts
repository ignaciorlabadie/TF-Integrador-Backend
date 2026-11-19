import { Router } from 'express'

import { tarifaEspacioController } from '../controllers/tarifaEspacioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /tarifas-espacio:
 *   get:
 *     tags:
 *       - Tarifas de espacio
 *     summary: Lista tarifas de espacio
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
 *       - name: vigente
 *         in: query
 *         required: false
 *         description: Filtra por vigencia (fechaHasta en null).
 *         schema:
 *           type: boolean
 *     responses:
 *       '200':
 *         description: Listado de tarifas ordenado por fecha de inicio descendente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TarifaEspacio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    tarifaEspacioController.listar,
)

/**
 * @openapi
 * /tarifas-espacio/vigente:
 *   get:
 *     tags:
 *       - Tarifas de espacio
 *     summary: Obtiene la tarifa vigente de un espacio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: espacioId
 *         in: query
 *         required: true
 *         description: ID del espacio cuya tarifa vigente se busca.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Tarifa vigente del espacio.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TarifaEspacio'
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
    '/vigente',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    tarifaEspacioController.obtenerVigente,
)

/**
 * @openapi
 * /tarifas-espacio/{id}:
 *   get:
 *     tags:
 *       - Tarifas de espacio
 *     summary: Obtiene una tarifa por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la tarifa.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Tarifa solicitada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TarifaEspacio'
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
    tarifaEspacioController.buscarPorId,
)

/**
 * @openapi
 * /tarifas-espacio:
 *   post:
 *     tags:
 *       - Tarifas de espacio
 *     summary: Crea una tarifa de espacio
 *     description: >
 *       Solo ADMIN. No puede superponerse con otra tarifa del mismo espacio
 *       ni asignarse a un espacio inactivo. Si no se envía fechaHasta, la
 *       tarifa queda vigente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearTarifaEspacioRequest'
 *     responses:
 *       '201':
 *         description: Tarifa creada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TarifaEspacio'
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
    verificarRol('ADMIN'),
    tarifaEspacioController.crear,
)

/**
 * @openapi
 * /tarifas-espacio/{id}:
 *   put:
 *     tags:
 *       - Tarifas de espacio
 *     summary: Actualiza una tarifa de espacio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la tarifa.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarTarifaEspacioRequest'
 *     responses:
 *       '200':
 *         description: Tarifa actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TarifaEspacio'
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
    verificarRol('ADMIN'),
    tarifaEspacioController.actualizar,
)

/**
 * @openapi
 * /tarifas-espacio/{id}:
 *   delete:
 *     tags:
 *       - Tarifas de espacio
 *     summary: Elimina una tarifa de espacio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la tarifa.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '204':
 *         description: Tarifa eliminada. Sin contenido.
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
    verificarRol('ADMIN'),
    tarifaEspacioController.eliminar,
)

export default router
