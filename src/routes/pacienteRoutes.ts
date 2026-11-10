import { Router } from 'express'

import { pacienteController } from '../controllers/pacienteController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /pacientes:
 *   post:
 *     tags:
 *       - Pacientes
 *     summary: Registra un paciente (cuenta + perfil)
 *     description: >
 *       Alta pública de pacientes. Crea la cuenta con rol PACIENTE y su perfil
 *       en una sola transacción.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearPacienteRequest'
 *     responses:
 *       '201':
 *         description: Paciente creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '409':
 *         $ref: '#/components/responses/Conflicto'
 */
router.post('/', pacienteController.crear)

/**
 * @openapi
 * /pacientes:
 *   get:
 *     tags:
 *       - Pacientes
 *     summary: Lista todos los pacientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Listado de pacientes ordenado por id ascendente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Paciente'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    pacienteController.listar,
)

/**
 * @openapi
 * /pacientes/me:
 *   get:
 *     tags:
 *       - Pacientes
 *     summary: Devuelve el perfil del paciente autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Perfil del paciente autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/me', verificarToken, pacienteController.obtenerMiPerfil)

/**
 * @openapi
 * /pacientes/me:
 *   put:
 *     tags:
 *       - Pacientes
 *     summary: Actualiza el perfil del paciente autenticado
 *     description: >
 *       No permite cambiar el email ni la contraseña; para eso se usa
 *       PUT /usuarios/{id}.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarPacienteRequest'
 *     responses:
 *       '200':
 *         description: Paciente actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 *       '409':
 *         $ref: '#/components/responses/Conflicto'
 */
router.put('/me', verificarToken, pacienteController.actualizarMiPerfil)

/**
 * @openapi
 * /pacientes/{id}:
 *   get:
 *     tags:
 *       - Pacientes
 *     summary: Obtiene un paciente por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del paciente.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Paciente encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
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
    pacienteController.buscarPorId,
)

/**
 * @openapi
 * /pacientes/{id}:
 *   put:
 *     tags:
 *       - Pacientes
 *     summary: Actualiza un paciente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del paciente.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarPacienteRequest'
 *     responses:
 *       '200':
 *         description: Paciente actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
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
    pacienteController.actualizar,
)

/**
 * @openapi
 * /pacientes/{id}:
 *   delete:
 *     tags:
 *       - Pacientes
 *     summary: Elimina un paciente y su cuenta
 *     description: >
 *       No se permite eliminar un paciente con turnos o estudios asociados;
 *       en ese caso responde 409.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del paciente.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '204':
 *         description: Paciente eliminado (sin body).
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
    pacienteController.eliminar,
)

export default router
