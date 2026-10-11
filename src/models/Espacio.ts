import { DataTypes, Model } from 'sequelize'
import type { TipoEspacio } from '../types/TipoEspacio.js'
import type { UbicacionEspacio } from '../types/UbicacionEspacio.js'
import sequelize from '../config/database.js'

class Espacio extends Model {
    declare id: number

    declare nombre: string
    declare tipo: TipoEspacio
    declare ubicacion: UbicacionEspacio
    declare activo: boolean

    declare createdAt: Date
    declare updatedAt: Date
}

Espacio.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 100],
            },
        },
        tipo: {
            type: DataTypes.ENUM('GIMNASIO', 'CONSULTORIO'),
            allowNull: false,
        },
        ubicacion: {
            type: DataTypes.ENUM('ADELANTE', 'ATRAS'),
            allowNull: false,
        },
        activo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'espacios',
        timestamps: true,
    },
)

export default Espacio
