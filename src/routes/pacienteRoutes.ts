import { Router } from 'express'

import {
    obtenerPacientes,
    obtenerPacientePorId,
    obtenerMiPerfil,
    registrarPaciente,
    modificarPaciente,
    modificarMiPerfil,
    eliminarPaciente,
} from '../controllers/pacienteController.js'

import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'

const router = Router()

router.post('/', registrarPaciente)

router.get('/', verificarToken, verificarRol('ADMIN'), obtenerPacientes)

router.get('/me', verificarToken, obtenerMiPerfil)

router.put('/me', verificarToken, modificarMiPerfil)

router.get('/:id', verificarToken, verificarRol('ADMIN'), obtenerPacientePorId)

router.put('/:id', verificarToken, verificarRol('ADMIN'), modificarPaciente)

router.delete('/:id', verificarToken, verificarRol('ADMIN'), eliminarPaciente)

export default router
