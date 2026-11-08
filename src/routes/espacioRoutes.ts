import { Router } from 'express'

import { espacioController } from '../controllers/espacioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.get(
    '/ocupacion',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    espacioController.obtenerOcupacion,
)

router.get('/', verificarToken, espacioController.listar)

router.get('/:id', verificarToken, espacioController.buscarPorId)

router.post('/', verificarToken, verificarRol('ADMIN'), espacioController.crear)

router.put(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.actualizar,
)

router.patch(
    '/:id/desactivar',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.desactivar,
)

router.patch(
    '/:id/reactivar',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.reactivar,
)

router.delete(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    espacioController.eliminar,
)

export default router
