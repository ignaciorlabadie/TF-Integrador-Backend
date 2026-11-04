import { Router } from 'express'

import {
    login,
    obtenerPerfil,
    olvidarPassword,
    resetearPassword,
} from '../controllers/authController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'

const router = Router()

router.post('/login', login)
router.post('/forgot-password', olvidarPassword)
router.post('/reset-password', resetearPassword)
router.get('/me', verificarToken, obtenerPerfil)

export default router
