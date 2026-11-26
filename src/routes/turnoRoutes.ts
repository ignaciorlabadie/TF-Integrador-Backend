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
 *       ADMIN ve todos los turnos y puede filtrar por profesionalId,
 *       pacienteId, fecha y estado. PACIENTE ve solo los suyos y PROFESIONAL
 *       solo los de su perfil; ambos pueden filtrar por fecha y estado, y los
 *       filtros profesionalId/pacienteId se ignoran. Al PACIENTE el
 *       profesional le llega con sus datos públicos. Los resultados se ordenan
 *       por fecha y hora ascendente e incluyen paciente, profesional y agenda.
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
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 */
router.get('/', verificarToken, turnoController.listar)

/**
 * @openapi
 * /turnos/horarios-libres:
 *   get:
 *     tags:
 *       - Turnos
 *     summary: Horarios libres de un profesional en una fecha
 *     description: >
 *       Arma la grilla de turnos de las agendas activas del profesional para
 *       el día de la semana de la fecha y descarta los horarios ocupados y,
 *       si la fecha es hoy, los que ya pasaron. Una fecha pasada devuelve una
 *       lista vacía.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: profesionalId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: fecha
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-12-01'
 *     responses:
 *       '200':
 *         description: Horarios disponibles ordenados por hora.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HorarioLibre'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/horarios-libres', verificarToken, turnoController.horariosLibres)

/**
 * @openapi
 * /turnos/{id}:
 *   get:
 *     tags:
 *       - Turnos
 *     summary: Obtiene un turno por ID
 *     description: >
 *       ADMIN puede ver cualquier turno. PACIENTE y PROFESIONAL solo los
 *       suyos; un turno ajeno responde 404.
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
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/:id', verificarToken, turnoController.buscarPorId)

/**
 * @openapi
 * /turnos:
 *   post:
 *     tags:
 *       - Turnos
 *     summary: Crea un turno
 *     description: >
 *       Solo PACIENTE y ADMIN. Para un PACIENTE el pacienteId sale de su
 *       perfil y se ignora el del body; el ADMIN debe enviarlo. La fecha y
 *       hora no pueden ser pasadas, la agenda debe ser del profesional, estar
 *       activa, coincidir con el día de la semana, y la hora debe caer en la
 *       grilla de la agenda (horaInicio + n × duracionTurno). El estado se
 *       define como CONFIRMADO. Falla con 409 si el horario ya está ocupado o
 *       la agenda está inactiva.
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
    verificarRol('ADMIN', 'PACIENTE'),
    turnoController.crear,
)

/**
 * @openapi
 * /turnos/{id}:
 *   put:
 *     tags:
 *       - Turnos
 *     summary: Actualiza un turno
 *     description: >
 *       Solo ADMIN. Permite cambiar fecha, hora, motivo, observaciones y
 *       estado. Si cambia la fecha o la hora se valida contra la agenda del
 *       turno y se reinicia el registro de recordatorio enviado.
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
    turnoController.actualizar,
)

/**
 * @openapi
 * /turnos/{id}:
 *   delete:
 *     tags:
 *       - Turnos
 *     summary: Cancela un turno
 *     description: >
 *       ADMIN cancela cualquier turno y PACIENTE solo los suyos (uno ajeno
 *       responde 404). PROFESIONAL no puede cancelar. No elimina el registro:
 *       cambia su estado a CANCELADO y devuelve el turno actualizado con
 *       código 200. Solo se cancelan turnos PENDIENTE o CONFIRMADO; el resto
 *       responde 409.
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
    verificarRol('ADMIN', 'PACIENTE'),
    turnoController.cancelar,
)

export default router
