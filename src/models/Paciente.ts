import { DataTypes, Model } from 'sequelize'

import type { DatosPersona } from '../types/DatosPersona.js'

import sequelize from '../config/database.js'

class Paciente extends Model implements DatosPersona {
    declare id: number
    declare usuarioId: number

    declare nombre: string
    declare apellido: string
    declare dni: string
    declare telefono: string

    declare fechaNacimiento: string
    declare direccion: string

    declare createdAt: Date
    declare updatedAt: Date
}

Paciente.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },

        usuarioId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },

        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 100],
            },
        },

        apellido: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 100],
            },
        },

        dni: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },

        telefono: {
            type: DataTypes.STRING(25),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [6, 25],
            },
        },

        fechaNacimiento: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        direccion: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [3, 150],
            },
        },
    },
    {
        sequelize,
        tableName: 'pacientes',
        timestamps: true,
    },
)

export default Paciente
