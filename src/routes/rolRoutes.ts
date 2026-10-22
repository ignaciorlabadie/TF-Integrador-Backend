import { Router } from 'express'

import { obtenerRoles } from '../controllers/rolController.js'

const router = Router()

router.get('/', obtenerRoles)

export default router
