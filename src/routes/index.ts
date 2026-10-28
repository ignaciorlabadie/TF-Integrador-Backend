import { Router } from 'express'

import authRoutes from './authRoutes.js'
import usuarioRoutes from './usuarioRoutes.js'
import pacienteRoutes from './pacienteRoutes.js'
import profesionalRoutes from './profesionalRoutes.js'
import rolRoutes from './rolRoutes.js'
import estudioRoutes from './estudioRoutes.js'
import autorizacionEstudioRoutes from './autorizacionEstudioRoutes.js'
import espacioRoutes from './espacioRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/usuarios', usuarioRoutes)
router.use('/espacios', espacioRoutes)
router.use('/pacientes', pacienteRoutes)
router.use('/profesionales', profesionalRoutes)
router.use('/roles', rolRoutes)
router.use('/estudios', estudioRoutes)
router.use('/autorizacionestudios', autorizacionEstudioRoutes)

export default router
