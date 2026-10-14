import { Router } from 'express'
import {
    obtenerEstudios,
    obtenerEstudioPorId,
    obtenerEstudiosPaciente,
    registrarEstudio,
    adjuntarArchivo,
    modificarArchivo,
} from '../controllers/estudioController.js'

const router = Router()

router.get('/', obtenerEstudios)
router.get('/:id', obtenerEstudioPorId)
router.get('/paciente/:pacienteId', obtenerEstudiosPaciente)
router.post('/', registrarEstudio)
router.patch('/:id/adjuntar-archivo', adjuntarArchivo)
router.put('/:id/archivo', modificarArchivo)

export default router