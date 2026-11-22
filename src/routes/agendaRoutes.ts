import { Router } from 'express'
import { agendaController } from '../controllers/agendaController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /agendas:
 *   get:
 *     tags:
 *       - Agendas
 *     summary: Lista agendas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: profesionalId
 *         in: query
 *         required: false
 *         description: Filtra por ID de profesional.
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: activo
 *         in: query
 *         required: false
 *         description: Filtra por estado activo/inactivo.
 *         schema:
 *           type: boolean
 *     responses:
 *       '200':
 *         description: Listado de agendas con el profesional asociado.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agenda'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 */
router.get('/', verificarToken, agendaController.listar)

/**
 * @openapi
 * /agendas/profesional/{profesionalId}:
 *   get:
 *     tags:
 *       - Agendas
 *     summary: Lista las agendas de un profesional
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: profesionalId
 *         in: path
 *         required: true
 *         description: ID numérico del profesional.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Agendas del profesional.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agenda'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get(
    '/profesional/:profesionalId',
    verificarToken,
    agendaController.listarPorProfesional,
)

/**
 * @openapi
 * /agendas/{id}:
 *   get:
 *     tags:
 *       - Agendas
 *     summary: Obtiene una agenda por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la agenda.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Agenda solicitada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agenda'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/:id', verificarToken, agendaController.buscarPorId)

/**
 * @openapi
 * /agendas:
 *   post:
 *     tags:
 *       - Agendas
 *     summary: Crea una agenda
 *     description: >
 *       Solo ADMIN. No puede existir otra agenda activa del mismo profesional
 *       para el mismo día y rango horario.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearAgendaRequest'
 *     responses:
 *       '201':
 *         description: Agenda creada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agenda'
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
router.post('/', verificarToken, verificarRol('ADMIN'), agendaController.crear)

/**
 * @openapi
 * /agendas/{id}:
 *   put:
 *     tags:
 *       - Agendas
 *     summary: Actualiza una agenda
 *     description: >
 *       Solo ADMIN. Si hay turnos futuros que quedan fuera de la nueva
 *       disponibilidad, se requiere cancelarTurnosAfectados en true.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la agenda.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarAgendaRequest'
 *     responses:
 *       '200':
 *         description: Agenda actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agenda'
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
    agendaController.actualizar,
)

/**
 * @openapi
 * /agendas/{id}/desactivar:
 *   patch:
 *     tags:
 *       - Agendas
 *     summary: Desactiva una agenda
 *     description: >
 *       Solo ADMIN. Si existen turnos futuros se requiere
 *       cancelarTurnosFuturos en true. Responde 204 sin cuerpo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la agenda.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DesactivarAgendaRequest'
 *     responses:
 *       '204':
 *         description: Agenda desactivada. Sin contenido.
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
router.patch(
    '/:id/desactivar',
    verificarToken,
    verificarRol('ADMIN'),
    agendaController.desactivar,
)

/**
 * @openapi
 * /agendas/{id}/activar:
 *   patch:
 *     tags:
 *       - Agendas
 *     summary: Activa una agenda
 *     description: >
 *       Solo ADMIN. Idempotente: si ya está activa devuelve la agenda sin cambios.
 *       Verifica que no exista otra agenda activa del mismo profesional,
 *       día y rango horario. Responde 200 con la agenda completa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico de la agenda.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Agenda activada (o ya activa).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agenda'
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
router.patch(
    '/:id/activar',
    verificarToken,
    verificarRol('ADMIN'),
    agendaController.activar,
)

export default router
