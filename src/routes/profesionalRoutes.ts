import { Router } from 'express'

import { profesionalController } from '../controllers/profesionalController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /profesionales:
 *   get:
 *     tags:
 *       - Profesionales
 *     summary: Lista todos los profesionales
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Listado de profesionales ordenado por id ascendente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Profesional'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 */
router.get('/', verificarToken, profesionalController.listar)

/**
 * @openapi
 * /profesionales/mi-perfil:
 *   get:
 *     tags:
 *       - Profesionales
 *     summary: Devuelve el perfil profesional del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Perfil del profesional autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesional'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get(
    '/mi-perfil',
    verificarToken,
    profesionalController.buscarPorUsuarioId,
)

/**
 * @openapi
 * /profesionales/{id}:
 *   get:
 *     tags:
 *       - Profesionales
 *     summary: Obtiene un profesional por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del profesional.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Profesional solicitado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesional'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/:id', verificarToken, profesionalController.buscarPorId)

/**
 * @openapi
 * /profesionales:
 *   post:
 *     tags:
 *       - Profesionales
 *     summary: Crea un perfil profesional
 *     description: >
 *       Solo ADMIN. La cuenta indicada por usuarioId debe existir y tener rol
 *       PROFESIONAL; no puede tener ya un perfil profesional asociado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearProfesionalRequest'
 *     responses:
 *       '201':
 *         description: Perfil profesional creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesional'
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
    profesionalController.crear,
)

/**
 * @openapi
 * /profesionales/{id}:
 *   put:
 *     tags:
 *       - Profesionales
 *     summary: Actualiza un profesional
 *     description: >
 *       Solo un ADMIN o el propio profesional autenticado. usuarioId no se
 *       modifica aunque se envíe en el body.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del profesional.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarProfesionalRequest'
 *     responses:
 *       '200':
 *         description: Profesional actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesional'
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
router.put('/:id', verificarToken, profesionalController.actualizar)

export default router
