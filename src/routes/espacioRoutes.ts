import { Router } from 'express'

import { espacioController } from '../controllers/espacioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /espacios/ocupacion:
 *   get:
 *     tags:
 *       - Espacios
 *     summary: Devuelve la ocupación de los espacios en un rango de fechas
 *     description: >
 *       Solo ADMIN o PROFESIONAL. Devuelve los espacios con sus asignaciones
 *       fijas y las específicas comprendidas entre start y end.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: start
 *         in: query
 *         required: true
 *         description: Fecha de inicio del rango.
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-11-16'
 *       - name: end
 *         in: query
 *         required: true
 *         description: Fecha de fin del rango.
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-11-22'
 *     responses:
 *       '200':
 *         description: Espacios con sus asignaciones en el rango.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OcupacionEspacioResponse'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get(
    '/ocupacion',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    espacioController.obtenerOcupacion,
)

/**
 * @openapi
 * /espacios:
 *   get:
 *     tags:
 *       - Espacios
 *     summary: Lista espacios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: activo
 *         in: query
 *         required: false
 *         description: Filtra por estado activo/inactivo.
 *         schema:
 *           type: boolean
 *       - name: tipo
 *         in: query
 *         required: false
 *         description: Filtra por tipo de espacio.
 *         schema:
 *           type: string
 *           enum:
 *             - GIMNASIO
 *             - CONSULTORIO
 *       - name: ubicacion
 *         in: query
 *         required: false
 *         description: Filtra por ubicación del espacio.
 *         schema:
 *           type: string
 *           enum:
 *             - ADELANTE
 *             - ATRAS
 *     responses:
 *       '200':
 *         description: Listado de espacios.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Espacio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 */
router.get('/', verificarToken, espacioController.listar)

/**
 * @openapi
 * /espacios/{id}:
 *   get:
 *     tags:
 *       - Espacios
 *     summary: Obtiene un espacio por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del espacio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Espacio solicitado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espacio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/:id', verificarToken, espacioController.buscarPorId)

/**
 * @openapi
 * /espacios:
 *   post:
 *     tags:
 *       - Espacios
 *     summary: Crea un espacio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearEspacioRequest'
 *     responses:
 *       '201':
 *         description: Espacio creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espacio'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.post('/', verificarToken, verificarRol('ADMIN'), espacioController.crear)

/**
 * @openapi
 * /espacios/{id}:
 *   put:
 *     tags:
 *       - Espacios
 *     summary: Actualiza un espacio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del espacio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarEspacioRequest'
 *     responses:
 *       '200':
 *         description: Espacio actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espacio'
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
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.actualizar,
)

/**
 * @openapi
 * /espacios/{id}/desactivar:
 *   patch:
 *     tags:
 *       - Espacios
 *     summary: Desactiva un espacio
 *     description: Operación idempotente. Solo ADMIN.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del espacio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Espacio desactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espacio'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.patch(
    '/:id/desactivar',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.desactivar,
)

/**
 * @openapi
 * /espacios/{id}/reactivar:
 *   patch:
 *     tags:
 *       - Espacios
 *     summary: Reactiva un espacio
 *     description: Operación idempotente. Solo ADMIN.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del espacio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Espacio reactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espacio'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.patch(
    '/:id/reactivar',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.reactivar,
)

/**
 * @openapi
 * /espacios/{id}:
 *   delete:
 *     tags:
 *       - Espacios
 *     summary: Elimina un espacio
 *     description: >
 *       Solo ADMIN. Falla con 409 si el espacio tiene asignaciones o tarifas
 *       asociadas; en ese caso puede desactivarse en su lugar.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del espacio.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '204':
 *         description: Espacio eliminado. Sin contenido.
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
router.delete(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.eliminar,
)

export default router
