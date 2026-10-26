import { Router } from 'express';
import { getOcupacionAdmin } from '../controllers/espacioController.js';


const router = Router();

router.get('/ocupacion', getOcupacionAdmin);

export default router;