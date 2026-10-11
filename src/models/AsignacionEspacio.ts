import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/database.js'
import type { DiaSemana } from '../types/DiaSemana.ts'
import type { TipoAsignacionEspacio } from '../types/TipoAsignacionEspacio.ts'

class AsignacionEspacio extends Model {
    declare id: number

    declare espacioId: number
    declare profesionalId: number
    declare tipo: TipoAsignacionEspacio
    // fija son las horas designadas que tiene un profesional. Sería su MODULO
    // Especifica se usa cuando un profesional agrega una o varias horas para uno o varios dias en concreto.
    // Las dos se deben contar de igual forma para el valor del alquiler de c/u
    declare diaSemana: DiaSemana | null
    declare fecha: Date | null

    declare horaInicio: string
    declare horaFin: string

    declare createdAt: Date
    declare updatedAt: Date

    // OPERACIONES DEL DIAGRAMA UML
    // calcula la cantidad de horas de uso del espacio:
    calcularHorasUso(): number {
        const [horaInicioH, horaInicioM] = this.horaInicio.split(':').map(Number) as [number, number]
        const [horaFinH, horaFinM] = this.horaFin.split(':').map(Number) as [number, number]

        const minutosInicio = (horaInicioH * 60) + horaInicioM
        const minutosFin = (horaFinH * 60) + horaFinM

        const minutosTotales = minutosFin - minutosInicio
        
        return minutosTotales / 60 // obtenemos en horas
    }

    // Para el valor del alquiler, consulta en la BD el precio por hora de cada profesional
    calcularAlquiler(precioPorHoraVigente: number): number {
        const horasUso = this.calcularHorasUso()
        return horasUso * precioPorHoraVigente
    }
}


AsignacionEspacio.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        espacioId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'espacios',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },
        profesionalId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'profesionales',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },
        tipo: {
            type: DataTypes.ENUM('FIJA', 'ESPECIFICA'),
            allowNull: false,
        },
        diaSemana: {
            type: DataTypes.ENUM(
                'LUNES',
                'MARTES',
                'MIERCOLES',
                'JUEVES',
                'VIERNES',
                'SABADO',
                'DOMINGO',
            ),
            allowNull: true,
        },
        fecha: {
            type: DataTypes.DATEONLY, // DATEONLY guarda solo YYYY-MM-DD (sin hora)
            allowNull: true,
        },
        horaInicio: {
            type: DataTypes.TIME, // Guarda HH:mm:ss
            allowNull: false,
        },
        horaFin: {
            type: DataTypes.TIME,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'asignaciones_espacios',
        timestamps: true,
        validate: {
            // Esta validación asegura la coherencia de los datos antes de guardar
            validarTipoAsignacion() {
                if (
                    this.tipo === 'FIJA' &&
                    (!this.diaSemana || this.fecha !== null)
                ) {
                    throw new Error(
                        'Una asignación FIJA debe tener día de semana y no una fecha específica.',
                    )
                }
                if (
                    this.tipo === 'ESPECIFICA' &&
                    (!this.fecha || this.diaSemana !== null)
                ) {
                    throw new Error(
                        'Una asignación ESPECIFICA debe tener fecha y no un día de semana.',
                    )
                }
            },
        },
    },
)

export default AsignacionEspacio