import { DataTypes, Model, Op } from 'sequelize'
import type { DiaSemana } from '../types/DiaSemana.ts'
import sequelize from '../config/database.js'
import Turno from './Turno.js'

class Agenda extends Model {
    declare id: number
    declare profesionalId: number
    declare diaSemana: DiaSemana
    declare horaInicio: string
    declare horaFin: string
    declare duracionTurno: number
    declare activo: boolean
    declare createdAt: Date
    declare updatedAt: Date

    // OPERACIONES DEL DIAGRAMA UML 

    async activar(): Promise<void> {
        this.activo = true
        await this.save()
    }

    async desactivar(): Promise<void> {
        this.activo = false
        await this.save()
    }

    calcularCapacidadTotal(): number {
        // calcula la cantidad de turnos que entran en el bloque horario
        const [horaInicioH, horaInicioM] = this.horaInicio.split(':').map(Number) as [number, number]
        
        const [horaFinH, horaFinM] = this.horaFin.split(':').map(Number) as [number, number]

        const minutosInicio = (horaInicioH * 60) + horaInicioM
        const minutosFin = (horaFinH * 60) + horaFinM

        const tiempoTotalMinutos = minutosFin - minutosInicio
        return Math.floor(tiempoTotalMinutos / this.duracionTurno)
    }

    async calcularTurnosDisponibles(fecha: string | Date): Promise<number> {
        if (!this.activo) return 0

        const capacidadTotal = this.calcularCapacidadTotal()

        const turnosOcupados = await Turno.count({
            where: {
                agendaId: this.id,
                fecha: fecha,
                estado: {
                    [Op.not]: 'cancelado' // los cancelados liberan el cupo
                }
            }
        })

        return capacidadTotal - turnosOcupados 
    }

    // verifica si hay turnos disponibles para la fecha y hora especificada
    async estaDisponible(fecha: string | Date, hora: string): Promise<boolean> {
        if (!this.activo) return false

        const turnoExistente = await Turno.findOne({
            where: {
                agendaId: this.id,
                fecha: fecha,
                hora: hora,
                estado: {
                    [Op.not]: 'cancelado'
                }
            }
        })

        // está disponible si NO encontro un turno ocupando ese lugar
        return turnoExistente === null
    }
} 

Agenda.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
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
            allowNull: false,
        },

        horaInicio: {
            type: DataTypes.TIME,
            allowNull: false,
        },

        horaFin: {
            type: DataTypes.TIME,
            allowNull: false,
        },

        duracionTurno: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isInt: true,
                min: 1,
            },
        },

        activo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'agendas',
        timestamps: true,
    },
)

export default Agenda