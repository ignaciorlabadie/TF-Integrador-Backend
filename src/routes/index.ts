import { Router } from 'express'

import authRoutes from './authRoutes.js'
import usuarioRoutes from './usuarioRoutes.js'
import pacienteRoutes from './pacienteRoutes.js'
import profesionalRoutes from './profesionalRoutes.js'
import rolRoutes from './rolRoutes.js'
import estudioRoutes from './estudioRoutes.js'
import autorizacionEstudioRoutes from './autorizacionEstudioRoutes.js'
import espacioRoutes from './espacioRoutes.js'
import agendaRoutes from './agendaRoutes.js'
import turnoRoutes from './turnoRoutes.js'

const router = Router()

router.get('/', (_req, res) => {
    return res.status(200).json({
        mensaje: 'API del sistema de turnos',
    })
})

router.use('/auth', authRoutes)
router.use('/usuarios', usuarioRoutes)
router.use('/espacios', espacioRoutes)
router.use('/pacientes', pacienteRoutes)
router.use('/profesionales', profesionalRoutes)
router.use('/roles', rolRoutes)
router.use('/estudios', estudioRoutes)
router.use('/autorizacionestudios', autorizacionEstudioRoutes)
router.use('/agendas', agendaRoutes)
router.use('/turnos', turnoRoutes)

export default router
