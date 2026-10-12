'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('asignaciones_espacios', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            espacioId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'espacios',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            profesionalId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'profesionales',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            tipo: {
                type: Sequelize.ENUM('FIJA', 'ESPECIFICA'),
                allowNull: false,
            },
            diaSemana: {
                type: Sequelize.ENUM(
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
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            horaInicio: {
                type: Sequelize.TIME,
                allowNull: false,
            },
            horaFin: {
                type: Sequelize.TIME,
                allowNull: false,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        })
    },

    async down(queryInterface) {
        await queryInterface.dropTable('asignaciones_espacios')
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_asignaciones_espacios_tipo";',
        )
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_asignaciones_espacios_diaSemana";',
        )
    },
}
