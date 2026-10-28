import { Router } from 'express'

import { usuarioController } from '../controllers/usuarioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import {
    verificarRol,
    verificarAdminOPropio,
} from '../middlewares/rolMiddleware.js'

const router = Router()

router.post('/', verificarToken, verificarRol('ADMIN'), usuarioController.crear)

router.get('/', verificarToken, verificarRol('ADMIN'), usuarioController.listar)

router.get(
    '/email/:email',
    verificarToken,
    verificarRol('ADMIN'),
    usuarioController.buscarPorEmail,
)

router.get(
    '/:id',
    verificarToken,
    verificarAdminOPropio,
    usuarioController.buscarPorId,
)

router.put(
    '/:id',
    verificarToken,
    verificarAdminOPropio,
    usuarioController.actualizar,
)

router.patch(
    '/:id/desactivar',
    verificarToken,
    verificarRol('ADMIN'),
    usuarioController.desactivar,
)

router.patch(
    '/:id/reactivar',
    verificarToken,
    verificarRol('ADMIN'),
    usuarioController.reactivar,
)

export default router
