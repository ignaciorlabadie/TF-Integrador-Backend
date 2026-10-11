import { DataTypes, Model } from 'sequelize'

import type { EstadoTurno } from '../types/EstadoTurno.js'

import sequelize from '../config/database.js'

class Turno extends Model {
    declare id: number

    declare pacienteId: number
    declare profesionalId: number
    declare agendaId: number

    declare fecha: string
    declare hora: string

    declare estado: EstadoTurno
    declare motivo: string
    declare observaciones?: string | null

    declare createdAt: Date
    declare updatedAt: Date
}

Turno.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        pacienteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'pacientes',
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

        agendaId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'agendas',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },

        fecha: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        hora: {
            type: DataTypes.TIME,
            allowNull: false,
        },

        estado: {
            type: DataTypes.ENUM(
                'pendiente',
                'confirmado',
                'cancelado',
                'completado',
            ),
            allowNull: false,
            defaultValue: 'pendiente',
        },

        motivo: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 255],
            },
        },

        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'turnos',
        timestamps: true,
    },
)

export default Turno
