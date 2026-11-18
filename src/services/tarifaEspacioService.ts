import { Op } from 'sequelize'
import { Espacio, TarifaEspacios } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { validarFecha } from '../utils/validacion.js'
import { validarEnteroPositivo } from '../utils/validarId.js'

export interface ListarTarifasEspacioFiltros {
    espacioId?: number
    vigente?: boolean
}

export interface DatosTarifaEspacio {
    espacioId: number
    precioPorHora: number | string
    fechaDesde: string
    fechaHasta?: string | null
}

interface DatosTarifaValidados {
    espacioId: number
    precioPorHora: string
    fechaDesde: string
    fechaHasta: string | null
}

const PRECIO_REGEX = /^\d+(\.\d{1,2})?$/

function incluirEspacio() {
    return [
        {
            model: Espacio,
            as: 'espacio',
            attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
        },
    ]
}

function validarPrecioPorHora(valor: unknown): string {
    const texto =
        typeof valor === 'number'
            ? String(valor)
            : typeof valor === 'string'
              ? valor.trim()
              : ''
    const numero = Number(texto)

    if (!PRECIO_REGEX.test(texto) || numero <= 0) {
        throw new AppError(400, MENSAJES.TARIFA_PRECIO_INVALIDO)
    }

    return numero.toFixed(2)
}

function validarDatosCreacion(datos: DatosTarifaEspacio): DatosTarifaValidados {
    if (!datos || typeof datos !== 'object') {
        throw new AppError(400, MENSAJES.TARIFA_DATOS_INVALIDOS)
    }

    const espacioId = validarEnteroPositivo(datos.espacioId, 'ID del espacio')
    const precioPorHora = validarPrecioPorHora(datos.precioPorHora)
    const fechaDesde = validarFecha(datos.fechaDesde)

    let fechaHasta: string | null = null

    if (datos.fechaHasta !== undefined && datos.fechaHasta !== null) {
        fechaHasta = validarFecha(datos.fechaHasta)
    }

    if (fechaHasta !== null && fechaHasta < fechaDesde) {
        throw new AppError(400, MENSAJES.RANGO_FECHAS_INVALIDO)
    }

    return { espacioId, precioPorHora, fechaDesde, fechaHasta }
}

function haySolapamiento(
    inicioA: string,
    finA: string | null,
    inicioB: string,
    finB: string | null,
): boolean {
    const finBIndefinido = finB === null
    const finAIndefinido = finA === null

    const inicioAAntesDeFinB = finBIndefinido || inicioA <= finB
    const inicioBAntesDeFinA = finAIndefinido || inicioB <= finA

    return inicioAAntesDeFinB && inicioBAntesDeFinA
}

async function verificarSolapamiento(
    datos: DatosTarifaValidados,
    idExcluir?: number,
): Promise<void> {
    const where: Record<string, unknown> = {
        espacioId: datos.espacioId,
    }

    if (idExcluir !== undefined) {
        where.id = { [Op.ne]: idExcluir }
    }

    const candidatas = await TarifaEspacios.findAll({ where })

    const conflicto = candidatas.some((candidata) => {
        if (idExcluir !== undefined && candidata.id === idExcluir) {
            return false
        }

        return haySolapamiento(
            datos.fechaDesde,
            datos.fechaHasta,
            candidata.fechaDesde,
            candidata.fechaHasta,
        )
    })

    if (conflicto) {
        throw new AppError(409, MENSAJES.TARIFA_SOLAPADA)
    }
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
            validarEnteroPositivo(id, 'ID de la tarifa'),
            { include: incluirEspacio() },
        )
    }

    async crear(datos: DatosTarifaEspacio): Promise<TarifaEspacios | null> {
        const datosValidados = validarDatosCreacion(datos)
        const espacio = await Espacio.findByPk(datosValidados.espacioId)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
        }

        if (!espacio.activo) {
            throw new AppError(409, MENSAJES.ESPACIO_INACTIVO)
        }

        await verificarSolapamiento(datosValidados)

        const tarifa = await TarifaEspacios.create({
            espacioId: datosValidados.espacioId,
            precioPorHora: datosValidados.precioPorHora,
            fechaDesde: datosValidados.fechaDesde,
            fechaHasta: datosValidados.fechaHasta,
        })

        return this.buscarPorId(tarifa.id)
    }

    async actualizar(
        id: number,
        datos: DatosTarifaEspacio,
    ): Promise<TarifaEspacios | null> {
        const idValidado = validarEnteroPositivo(id, 'ID de la tarifa')

        const existente = await TarifaEspacios.findByPk(idValidado)

        if (!existente) {
            throw new AppError(404, MENSAJES.TARIFA_NO_ENCONTRADA)
        }

        const datosValidados = validarDatosCreacion(datos)

        const espacio = await Espacio.findByPk(datosValidados.espacioId)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
        }

        if (!espacio.activo) {
            throw new AppError(409, MENSAJES.ESPACIO_INACTIVO)
        }

        await verificarSolapamiento(datosValidados, idValidado)

        await TarifaEspacios.update(
            {
                espacioId: datosValidados.espacioId,
                precioPorHora: datosValidados.precioPorHora,
                fechaDesde: datosValidados.fechaDesde,
                fechaHasta: datosValidados.fechaHasta,
            },
            { where: { id: idValidado } },
        )

        return this.buscarPorId(idValidado)
    }
}

export const tarifaEspacioService = new TarifaEspacioService()
