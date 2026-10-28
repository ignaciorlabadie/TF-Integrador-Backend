import { Router } from 'express'

import { pacienteController } from '../controllers/pacienteController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.post('/', pacienteController.crear)

router.get(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    pacienteController.listar,
)

router.get('/me', verificarToken, pacienteController.obtenerMiPerfil)

router.put('/me', verificarToken, pacienteController.actualizarMiPerfil)

router.get(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    pacienteController.buscarPorId,
)

router.put(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    pacienteController.actualizar,
)

router.delete(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    pacienteController.eliminar,
)

export default router
