import { Router } from 'express'

import { usuarioController } from '../controllers/usuarioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import {
    verificarRol,
    verificarAdminOPropio,
} from '../middlewares/rolMiddleware.js'

const router = Router()

/**
 * @openapi
 * /usuarios:
 *   post:
 *     tags:
 *       - Usuarios
 *     summary: Crea una cuenta PROFESIONAL o ADMIN
 *     description: >
 *       Alta de cuentas por parte de un administrador. No acepta el rol
 *       PACIENTE: el alta de pacientes se realiza en POST /pacientes.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearUsuarioRequest'
 *     responses:
 *       '201':
 *         description: Cuenta creada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioResumen'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 *       '409':
 *         $ref: '#/components/responses/Conflicto'
 */
router.post('/', verificarToken, verificarRol('ADMIN'), usuarioController.crear)

/**
 * @openapi
 * /usuarios:
 *   get:
 *     tags:
 *       - Usuarios
 *     summary: Lista todas las cuentas
 *     description: No incluye datos sensibles.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Listado de cuentas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '403':
 *         $ref: '#/components/responses/SinPermisos'
 */
router.get('/', verificarToken, verificarRol('ADMIN'), usuarioController.listar)

/**
 * @openapi
 * /usuarios/email/{email}:
 *   get:
 *     tags:
 *       - Usuarios
 *     summary: Busca una cuenta por email
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *         description: Email a buscar.
 *         schema:
 *           type: string
 *           format: email
 *           example: profesional@example.com
 *     responses:
 *       '200':
 *         description: Cuenta encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
    '/email/:email',
    verificarToken,
    verificarRol('ADMIN'),
    usuarioController.buscarPorEmail,
)

/**
 * @openapi
 * /usuarios/{id}:
 *   get:
 *     tags:
 *       - Usuarios
 *     summary: Obtiene una cuenta por ID
 *     description: Accesible por un ADMIN o por el propio usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del usuario.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Cuenta encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
    verificarAdminOPropio,
    usuarioController.buscarPorId,
)

/**
 * @openapi
 * /usuarios/{id}:
 *   put:
 *     tags:
 *       - Usuarios
 *     summary: Actualiza email, contraseña o estado de una cuenta
 *     description: >
 *       Accesible por un ADMIN o por el propio usuario autenticado. Solo un
 *       ADMIN puede modificar el campo activo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del usuario.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarUsuarioRequest'
 *     responses:
 *       '200':
 *         description: Cuenta actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
    verificarAdminOPropio,
    usuarioController.actualizar,
)

/**
 * @openapi
 * /usuarios/{id}/desactivar:
 *   patch:
 *     tags:
 *       - Usuarios
 *     summary: Desactiva una cuenta
 *     description: >
 *       No elimina la cuenta: cambia activo a false. Un usuario desactivado no
 *       puede iniciar sesión.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del usuario.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Cuenta desactivada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
    usuarioController.desactivar,
)

/**
 * @openapi
 * /usuarios/{id}/reactivar:
 *   patch:
 *     tags:
 *       - Usuarios
 *     summary: Reactiva una cuenta desactivada
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID numérico del usuario.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Cuenta reactivada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
    '/:id/reactivar',
    verificarToken,
    verificarRol('ADMIN'),
    usuarioController.reactivar,
)

export default router
