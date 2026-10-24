import { Router } from 'express'

import { profesionalController } from '../controllers/profesionalController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.get('/', verificarToken, profesionalController.listar)

router.get(
    '/mi-perfil',
    verificarToken,
    profesionalController.buscarPorUsuarioId,
)

router.get('/:id', verificarToken, profesionalController.buscarPorId)

router.post(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    profesionalController.crear,
)

router.put('/:id', verificarToken, profesionalController.actualizar)

export default router
