import { Router } from 'express'

import { obtenerRoles } from '../controllers/rolController.js'

const router = Router()

/**
 * @openapi
 * /roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Lista los roles disponibles
 *     description: >
 *       Endpoint público. Devuelve el catálogo de roles usado por el sistema;
 *       el rol de cada cuenta se define en el endpoint que la crea.
 *     responses:
 *       '200':
 *         description: Roles disponibles.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Rol'
 *             example:
 *               - PACIENTE
 *               - PROFESIONAL
 *               - ADMIN
 */
router.get('/', obtenerRoles)

export default router
