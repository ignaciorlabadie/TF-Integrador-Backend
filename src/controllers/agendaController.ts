import type { NextFunction, Request, Response } from 'express'
import { agendaService } from '../services/agendaService.js'
import type { ListarAgendasFiltros } from '../services/agendaService.js'
import { AppError } from '../errors/AppError.js'
import { validarId } from '../utils/validarId.js'

export class AgendaController {
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: ListarAgendasFiltros = {}
            const { profesionalId, activo } = req.query

            if (profesionalId !== undefined) {
                filtros.profesionalId = validarId(
                    profesionalId,
                    'profesionalId',
                )
            }

            if (activo !== undefined) {
                if (activo !== 'true' && activo !== 'false') {
                    throw new AppError(
                        400,
                        'El filtro activo debe ser true o false',
                    )
                }

                filtros.activo = activo === 'true'
            }

            const agendas = await agendaService.listar(filtros)

            return res.status(200).json(agendas)
        } catch (error) {
            return next(error)
        }
    }
}

export const agendaController = new AgendaController()
