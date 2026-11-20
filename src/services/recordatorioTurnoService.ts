import { Op } from 'sequelize'

import sequelize from '../config/database.js'
import { Paciente, Profesional, Turno, Usuario } from '../models/index.js'
import { ATRIBUTOS_USUARIO_PUBLICOS } from '../models/atributosUsuario.js'
import type { EstadoTurno } from '../types/EstadoTurno.js'
import { enviarEmailTurnoRecordatorio } from './emailService.js'

type TurnoConRelaciones = Turno & {
    paciente?: Paciente & { usuario?: Usuario }
    profesional?: Profesional
}

const ESTADOS_RECORDATORIO: EstadoTurno[] = ['PENDIENTE', 'CONFIRMADO']
const VENTANA_MINUTOS = 10

function obtenerZonaHoraria(): string {
    return process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires'
}

function obtenerPartesEnZona(fecha: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    })

    const partes = formatter.formatToParts(fecha)
    const mapa: Record<string, string> = {}

    for (const parte of partes) {
        if (parte.type !== 'literal') {
            mapa[parte.type] = parte.value
        }
    }

    return {
        year: Number(mapa.year),
        month: Number(mapa.month),
        day: Number(mapa.day),
        hour: Number(mapa.hour),
        minute: Number(mapa.minute),
        second: Number(mapa.second),
    }
}

function fechaEnZona(fecha: Date, timeZone: string): string {
    const partes = obtenerPartesEnZona(fecha, timeZone)
    const mes = String(partes.month).padStart(2, '0')
    const dia = String(partes.day).padStart(2, '0')

    return `${partes.year}-${mes}-${dia}`
}

function turnoFechaHoraAms(
    fecha: string,
    hora: string,
    timeZone: string,
): number | null {
    const partesFecha = fecha.slice(0, 10).split('-').map(Number)
    const partesHora = hora.split(':').map(Number)

    const anio = partesFecha[0]
    const mes = partesFecha[1]
    const dia = partesFecha[2]
    const horas = partesHora[0]
    const minutos = partesHora[1]
    const segundos = partesHora[2] ?? 0

    if (
        anio === undefined ||
        mes === undefined ||
        dia === undefined ||
        horas === undefined ||
        minutos === undefined ||
        [anio, mes, dia, horas, minutos, segundos].some((valor) =>
            Number.isNaN(valor),
        )
    ) {
        return null
    }

    const deseado = Date.UTC(anio, mes - 1, dia, horas, minutos, segundos)
    let utc = deseado

    for (let i = 0; i < 3; i++) {
        const partes = obtenerPartesEnZona(new Date(utc), timeZone)
        const comoUtc = Date.UTC(
            partes.year,
            partes.month - 1,
            partes.day,
            partes.hour,
            partes.minute,
            partes.second,
        )
        const diferencia = deseado - comoUtc

        utc += diferencia

        if (diferencia === 0) {
            break
        }
    }

    return utc
}

function obtenerRangoFechas(inicio: Date, fin: Date, timeZone: string) {
    const fechas = new Set<string>()
    const cursor = new Date(inicio.getTime() - 24 * 60 * 60 * 1000)
    const limite = fin.getTime() + 24 * 60 * 60 * 1000

    while (cursor.getTime() <= limite) {
        fechas.add(fechaEnZona(cursor, timeZone))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return Array.from(fechas)
}

async function enviarRecordatorio(turno: TurnoConRelaciones): Promise<void> {
    const paciente = turno.paciente
    const profesional = turno.profesional

    if (!paciente?.usuario || !profesional) {
        console.warn(
            `No se pudo enviar recordatorio del turno ${turno.id}: faltan datos de contacto`,
        )
        return
    }

    await enviarEmailTurnoRecordatorio(
        paciente.usuario.email,
        paciente.nombre,
        turno.fecha,
        turno.hora,
        profesional.nombre,
    )
}

export async function procesarRecordatoriosTurnos(): Promise<void> {
    const timeZone = obtenerZonaHoraria()
    const ahora = new Date()
    const objetivo = ahora.getTime() + 24 * 60 * 60 * 1000
    const margenMs = VENTANA_MINUTOS * 60 * 1000
    const desde = new Date(objetivo - margenMs)
    const hasta = new Date(objetivo + margenMs)

    const fechas = obtenerRangoFechas(desde, hasta, timeZone)

    if (fechas.length === 0) {
        return
    }

    const turnos = (await Turno.findAll({
        where: {
            estado: { [Op.in]: ESTADOS_RECORDATORIO },
            recordatorioEnviadoAt: { [Op.is]: null },
            fecha: { [Op.in]: fechas },
        },
        include: [
            {
                model: Paciente,
                as: 'paciente',
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ATRIBUTOS_USUARIO_PUBLICOS,
                    },
                ],
            },
            { model: Profesional, as: 'profesional' },
        ],
    })) as TurnoConRelaciones[]

    let enviados = 0
    let omitidos = 0
    let fallidos = 0

    for (const turno of turnos) {
        const fechaHoraMs = turnoFechaHoraAms(turno.fecha, turno.hora, timeZone)

        if (fechaHoraMs === null) {
            omitidos++
            continue
        }

        if (fechaHoraMs < desde.getTime() || fechaHoraMs > hasta.getTime()) {
            omitidos++
            continue
        }

        const [cantidadActualizada] = await Turno.update(
            { recordatorioEnviadoAt: new Date() },
            {
                where: {
                    id: turno.id,
                    recordatorioEnviadoAt: { [Op.is]: null },
                    estado: { [Op.in]: ESTADOS_RECORDATORIO },
                },
            },
        )

        if (cantidadActualizada === 0) {
            omitidos++
            continue
        }

        try {
            await enviarRecordatorio(turno)
            enviados++
        } catch (error) {
            fallidos++
            console.error(
                `Error al enviar recordatorio del turno ${turno.id}:`,
                error,
            )

            await Turno.update(
                { recordatorioEnviadoAt: null },
                {
                    where: {
                        id: turno.id,
                        estado: { [Op.in]: ESTADOS_RECORDATORIO },
                    },
                },
            )
        }
    }

    if (enviados > 0 || fallidos > 0) {
        console.log(
            `Recordatorios de turnos: enviados=${enviados}, omitidos=${omitidos}, fallidos=${fallidos}`,
        )
    }
}

let intervaloRecordatorios: ReturnType<typeof setInterval> | null = null
let ejecutando = false

export function iniciarRecordatoriosTurnos(): void {
    if (intervaloRecordatorios) {
        return
    }

    if (process.env.NODE_ENV === 'test') {
        return
    }

    if (process.env.RECORDATORIOS_TURNOS_HABILITADOS === 'false') {
        return
    }

    const intervalo = Number(
        process.env.RECORDATORIO_TURNO_INTERVALO_MS ?? 10 * 60 * 1000,
    )
    const intervaloMs =
        Number.isFinite(intervalo) && intervalo > 0 ? intervalo : 10 * 60 * 1000

    const ejecutar = async () => {
        if (ejecutando) {
            return
        }

        ejecutando = true

        try {
            await sequelize.authenticate()
            await procesarRecordatoriosTurnos()
        } catch (error) {
            console.error('Error al procesar recordatorios de turnos:', error)
        } finally {
            ejecutando = false
        }
    }

    void ejecutar()
    intervaloRecordatorios = setInterval(() => {
        void ejecutar()
    }, intervaloMs)

    if (
        typeof intervaloRecordatorios === 'object' &&
        'unref' in intervaloRecordatorios &&
        typeof intervaloRecordatorios.unref === 'function'
    ) {
        intervaloRecordatorios.unref()
    }
}

export function detenerRecordatoriosTurnos(): void {
    if (!intervaloRecordatorios) {
        return
    }

    clearInterval(intervaloRecordatorios)
    intervaloRecordatorios = null
}
