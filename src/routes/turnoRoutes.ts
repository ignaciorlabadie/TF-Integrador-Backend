import { Router } from 'express'

import { turnoController } from '../controllers/turnoController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /turnos:
 *   get:
 *     tags:
 *       - Turnos
 *     summary: Lista turnos
 *     description: >
 *       Solo ADMIN. Los resultados se ordenan por fecha y hora ascendente e
 *       incluyen paciente, profesional y agenda.
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
 *       - name: pacienteId
 *         in: query
 *         required: false
 *         description: Filtra por ID de paciente.
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: fecha
 *         in: query
 *         required: false
 *         description: Filtra por fecha del turno.
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-11-20'
 *       - name: estado
 *         in: query
 *         required: false
 *         description: Filtra por estado del turno.
 *         schema:
 *           type: string
 *           enum:
 *             - PENDIENTE
 *             - CONFIRMADO
 *             - CANCELADO
 *             - COMPLETADO
 *     responses:
 *       '200':
 *         description: Listado de turnos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Turno'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get('/', verificarToken, verificarRol('ADMIN'), turnoController.listar)

/**
 * @openapi
 * /turnos/{id}:
 *   get:
 *     tags:
 *       - Turnos
 *     summary: Obtiene un turno por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del turno.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Turno solicitado con sus relaciones.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Turno'
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
    verificarRol('ADMIN'),
    turnoController.buscarPorId,
)

/**
 * @openapi
 * /turnos:
 *   post:
 *     tags:
 *       - Turnos
 *     summary: Crea un turno
 *     description: >
 *       El estado se define automáticamente como CONFIRMADO. Falla con 409 si
 *       el profesional ya tiene un turno en esa fecha y hora o si la agenda
 *       no está disponible.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearTurnoRequest'
 *     responses:
 *       '201':
 *         description: Turno creado con sus relaciones.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Turno'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 *       '409':
 *         $ref: '#/components/responses/Conflicto'
 */
router.post('/', verificarToken, turnoController.crear)

/**
 * @openapi
 * /turnos/{id}:
 *   put:
 *     tags:
 *       - Turnos
 *     summary: Actualiza un turno
 *     description: >
 *       Permite cambiar fecha, hora, motivo, observaciones y estado. Si cambia
 *       la fecha o la hora se reinicia el registro de recordatorio enviado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del turno.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarTurnoRequest'
 *     responses:
 *       '200':
 *         description: Turno actualizado con sus relaciones.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Turno'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 *       '409':
 *         $ref: '#/components/responses/Conflicto'
 */
router.put('/:id', verificarToken, turnoController.actualizar)

/**
 * @openapi
 * /turnos/{id}:
 *   delete:
 *     tags:
 *       - Turnos
 *     summary: Cancela un turno
 *     description: >
 *       No elimina el registro: cambia su estado a CANCELADO y devuelve el
 *       turno actualizado con código 200.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del turno.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Turno cancelado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Turno'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.delete('/:id', verificarToken, turnoController.cancelar)

export default router
