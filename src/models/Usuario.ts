import { DataTypes, Model } from 'sequelize'
import type { Rol } from '../types/Rol.js'
import sequelize from '../config/database.js'

class Usuario extends Model {
    declare id: number
    declare email: string
    declare password: string
    declare rol: Rol
    declare activo: boolean
    declare resetPasswordTokenHash: string | null
    declare resetPasswordExpiresAt: Date | null
    declare createdAt: Date
    declare updatedAt: Date
}
Usuario.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(254),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
                len: [3, 254],
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        rol: {
            type: DataTypes.ENUM('PACIENTE', 'PROFESIONAL', 'ADMIN'),
            allowNull: false,
        },
        activo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        resetPasswordTokenHash: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        resetPasswordExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
    },
)
export default Usuario
