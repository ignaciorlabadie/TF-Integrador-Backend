import { Op } from 'sequelize'
import { Espacio, TarifaEspacios } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { validarEnteroPositivo } from '../utils/validarId.js'

export interface ListarTarifasEspacioFiltros {
    espacioId?: number
    vigente?: boolean
}

function incluirEspacio() {
    return [
        {
            model: Espacio,
            as: 'espacio',
            attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
        },
    ]
}

export class TarifaEspacioService {
    async listar(
        filtros: ListarTarifasEspacioFiltros = {},
    ): Promise<TarifaEspacios[]> {
        const where: Record<string, unknown> = {}

        if (filtros.espacioId !== undefined) {
            where.espacioId = validarEnteroPositivo(
                filtros.espacioId,
                'ID del espacio',
            )
        }

        if (filtros.vigente !== undefined) {
            if (typeof filtros.vigente !== 'boolean') {
                throw new AppError(400, MENSAJES.FILTRO_VIGENTE_INVALIDO)
            }

            where.fechaHasta = filtros.vigente
                ? { [Op.is]: null }
                : { [Op.not]: null }
        }

        return TarifaEspacios.findAll({
            where,
            include: incluirEspacio(),
            order: [
                ['fechaDesde', 'DESC'],
                ['id', 'DESC'],
            ],
        })
    }

    async buscarPorId(id: number): Promise<TarifaEspacios | null> {
        return TarifaEspacios.findByPk(
            validarEnteroPositivo(id, 'ID de la tarifa de espacio'),
            { include: incluirEspacio() },
        )
    }
}

export const tarifaEspacioService = new TarifaEspacioService()
