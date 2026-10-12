'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('tarifas_espacios', {
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
            precioPorHora: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
            },
            fechaDesde: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            fechaHasta: {
                type: Sequelize.DATEONLY,
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
        await queryInterface.dropTable('tarifas_espacios')
    },
}
