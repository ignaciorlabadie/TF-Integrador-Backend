import { Router } from 'express'
import {
    obtenerEstudios,
    obtenerEstudioPorId,
    obtenerEstudiosPaciente,
    registrarEstudio,
    modificarArchivo,
    obtenerArchivo,
} from '../controllers/estudioController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarRol } from '../middlewares/rolMiddleware.js'
import uploadEstudio from '../config/multer.js'

const router = Router()

router.get('/', verificarToken, verificarRol('ADMIN', 'PROFESIONAL'), obtenerEstudios)
router.get('/:id', verificarToken, verificarRol('ADMIN', 'PROFESIONAL'), obtenerEstudioPorId)
router.get(
    '/paciente/:pacienteId',
    verificarToken,
    verificarRol('ADMIN', 'PACIENTE'),
    obtenerEstudiosPaciente,
)
router.post('/', verificarToken, verificarRol('ADMIN'), registrarEstudio)
router.put(
    '/:id/archivo',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    uploadEstudio.single('archivo'),
    modificarArchivo,
)
router.get(
    '/:id/archivo',
    verificarToken,
    verificarRol('ADMIN', 'PROFESIONAL'),
    obtenerArchivo,
)

export default router