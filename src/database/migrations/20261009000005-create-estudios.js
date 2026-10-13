'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('estudios', {
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
            tipo: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            fecha: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            descripcion: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            archivoURL: {
                type: Sequelize.STRING,
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
        await queryInterface.dropTable('estudios')
    },
}
