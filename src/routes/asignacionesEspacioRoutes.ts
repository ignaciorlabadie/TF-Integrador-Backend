import { Router } from 'express'

import { asignacionEspacioController } from '../controllers/asignacionEspacioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.listar,
)

router.get(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.buscarPorId,
)

router.post(
    '/',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.crear,
)

router.put(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.actualizar,
)

router.delete(
    '/:id',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    asignacionEspacioController.eliminar,
)

export default router
