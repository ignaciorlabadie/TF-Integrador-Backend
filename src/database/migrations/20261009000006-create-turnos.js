'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('turnos', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            pacienteId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'pacientes',
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
            agendaId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'agendas',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            fecha: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            hora: {
                type: Sequelize.TIME,
                allowNull: false,
            },
            estado: {
                type: Sequelize.ENUM(
                    'PENDIENTE',
                    'CONFIRMADO',
                    'CANCELADO',
                    'COMPLETADO',
                ),
                allowNull: false,
                defaultValue: 'PENDIENTE',
            },
            motivo: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            observaciones: {
                type: Sequelize.TEXT,
                allowNull: true,
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
        await queryInterface.dropTable('turnos')
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_turnos_estado";',
        )
    },
}
