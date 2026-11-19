import { Router } from 'express'

import { tarifaEspacioController } from '../controllers/tarifaEspacioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    tarifaEspacioController.listar,
)

router.get(
    '/vigente',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    tarifaEspacioController.obtenerVigente,
)

router.get(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    tarifaEspacioController.buscarPorId,
)

router.post(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    tarifaEspacioController.crear,
)

router.put(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    tarifaEspacioController.actualizar,
)

router.delete(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    tarifaEspacioController.eliminar,
)

export default router
