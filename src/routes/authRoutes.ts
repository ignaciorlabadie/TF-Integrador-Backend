import { Router } from 'express'

import {
    login,
    obtenerPerfil,
    olvidarPassword,
    resetearPassword,
} from '../controllers/authController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'

const router = Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Inicia sesión y devuelve un JWT
 *     description: Autentica con email y contraseña. El email se normaliza antes de buscarlo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Inicio de sesión exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 *       '401':
 *         description: Email o contraseña incorrectos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: El usuario está desactivado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         $ref: '#/components/responses/ErrorInterno'
 */
router.post('/login', login)

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Solicita el enlace de recuperación de contraseña
 *     description: >
 *       Responde siempre 200 con un mensaje genérico, exista o no el email,
 *       para no revelar qué cuentas están registradas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       '200':
 *         description: Solicitud procesada (respuesta genérica).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 */
router.post('/forgot-password', olvidarPassword)

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Establece una nueva contraseña con el token recibido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       '200':
 *         description: Contraseña actualizada correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *       '400':
 *         $ref: '#/components/responses/DatosInvalidos'
 */
router.post('/reset-password', resetearPassword)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Devuelve el perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Perfil público del usuario (sin datos sensibles).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       '401':
 *         $ref: '#/components/responses/NoAutenticado'
 *       '404':
 *         $ref: '#/components/responses/NoEncontrado'
 */
router.get('/me', verificarToken, obtenerPerfil)

export default router
