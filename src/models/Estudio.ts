import { DataTypes, Model } from 'sequelize'

import sequelize from '../config/database.js'

class Estudio extends Model {
    declare id: number
    declare pacienteId: number
    declare tipo: string
    declare fecha: string
    declare descripcion: string | null
    declare archivoURL: string | null

    declare createdAt: Date
    declare updatedAt: Date

    // Métodos de instancia según el diagrama UML
    public adjuntarArchivo(url: string): void {
        this.archivoURL = url
    }

    public actualizarArchivo(nuevaUrl: string): void {
        this.archivoURL = nuevaUrl
    }
}

Estudio.init(
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

        tipo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 100],
            },
        },

        fecha: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        descripcion: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        archivoURL: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'estudios',
        timestamps: true,
    },
)

export default Estudio
