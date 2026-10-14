import { Router } from 'express'
import {
  obtenerAutorizaciones,
  obtenerAutorizacionPorId,
  crearAutorizacion,
  revocarAutorizacion,
  verificarVigencia,
} from '../controllers/autorizacionEstudioController.js'

const router = Router()

router.get('/', obtenerAutorizaciones)
router.get('/:id', obtenerAutorizacionPorId)
router.get('/:id/vigencia', verificarVigencia)
router.post('/', crearAutorizacion)
router.patch('/:id/revocar', revocarAutorizacion)

export default router