import type { Request, Response } from 'express'

import { ROLES } from '../types/Rol.js'

export async function obtenerRoles(_req: Request, res: Response) {
    return res.status(200).json(ROLES)
}
