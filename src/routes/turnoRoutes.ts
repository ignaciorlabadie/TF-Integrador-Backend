import { Router } from 'express'

import { turnoController } from '../controllers/turnoController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    turnoController.listar,
)

router.get(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    turnoController.buscarPorId,
)

router.post(
    '/',
    verificarToken,
    turnoController.crear,
)

router.put(
    '/:id',
    verificarToken,
    turnoController.actualizar,
)

router.delete(
    '/:id',
    verificarToken,
    turnoController.cancelar,
)

export default router
