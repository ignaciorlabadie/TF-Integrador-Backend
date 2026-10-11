import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/database.js'

class TarifaEspacio extends Model {
    declare id: number

    declare espacioId: number
    declare precioPorHora: string
    declare fechaDesde: string
    declare fechaHasta: string | null // null indica que es el precio vigente actualmente

    declare createdAt: Date
    declare updatedAt: Date
}

TarifaEspacio.init(
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
        precioPorHora: {
            // DECIMAL(10, 2) hasta 8 dígitos enteros y 2 decimales
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0, // El precio no puede ser negativo
            },
        },
        fechaDesde: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        fechaHasta: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'tarifas_espacios',
        timestamps: true,
        validate: {
            // Validación de fechas:
            validarFechas(this: TarifaEspacio) {
                if (this.fechaHasta && this.fechaDesde > this.fechaHasta) {
                    throw new Error(
                        'La fecha de inicio de la tarifa no puede ser posterior a su fecha de fin.',
                    )
                }
            },
        },
    },
)

export default TarifaEspacio
