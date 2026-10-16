import { Router } from 'express'

import authRoutes from './authRoutes.js'
import usuarioRoutes from './usuarioRoutes.js'
import pacienteRoutes from './pacienteRoutes.js'
import estudioRoutes from './estudioRoutes.js'
import autorizacionEstudioRoutes from './autorizacionEstudioRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/usuarios', usuarioRoutes)
router.use('/pacientes', pacienteRoutes)
router.use('/estudios', estudioRoutes)
router.use('/autorizacionestudios', autorizacionEstudioRoutes)

export default router
