import { Router } from 'express'
import { agendaController } from '../controllers/agendaController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.get('/', verificarToken, agendaController.listar)

router.get(
    '/profesional/:profesionalId',
    verificarToken,
    agendaController.listarPorProfesional,
)

router.get('/:id', verificarToken, agendaController.buscarPorId)

router.post(
    '/',
    verificarToken,
    verificarRol('ADMIN'),
    agendaController.crear,
)

router.put(
    '/:id',
    verificarToken,
    verificarRol('ADMIN'),
    agendaController.actualizar,
)

router.patch(
    '/:id/desactivar',
    verificarToken,
    verificarRol('ADMIN'),
    agendaController.desactivar,
)

export default router

