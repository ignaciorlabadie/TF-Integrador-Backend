import type { NextFunction, Request, Response } from 'express'
import { tarifaEspacioService } from '../services/tarifaEspacioService.js'
import type { ListarTarifasEspacioFiltros } from '../services/tarifaEspacioService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { validarId } from '../utils/validarId.js'

function parsearVigente(valor: unknown): boolean {
    if (valor === 'true') {
        return true
    }

    if (valor === 'false') {
        return false
    }

    throw new AppError(400, MENSAJES.FILTRO_VIGENTE_INVALIDO)
}

export class TarifaEspacioController {
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: ListarTarifasEspacioFiltros = {}
            const { espacioId, vigente } = req.query

            if (espacioId !== undefined) {
                filtros.espacioId = validarId(espacioId, 'espacioId')
            }

            if (vigente !== undefined) {
                filtros.vigente = parsearVigente(vigente)
            }

            const tarifas = await tarifaEspacioService.listar(filtros)

            return res.status(200).json(tarifas)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const tarifa = await tarifaEspacioService.buscarPorId(id)

            if (!tarifa) {
                throw new AppError(404, MENSAJES.TARIFA_NO_ENCONTRADA)
            }

            return res.status(200).json(tarifa)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const tarifa = await tarifaEspacioService.crear(req.body)

            return res.status(201).json(tarifa)
        } catch (error) {
            return next(error)
        }
    }
}

export const tarifaEspacioController = new TarifaEspacioController()
