'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('autorizaciones_estudio', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            estudioId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'estudios',
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
            fechaAutorizacion: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            fechaVencimiento: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            estado: {
                type: Sequelize.ENUM('DISPONIBLE', 'VENCIDO'),
                allowNull: false,
                defaultValue: 'DISPONIBLE',
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
        await queryInterface.dropTable('autorizaciones_estudio')
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_autorizaciones_estudio_estado";',
        )
    },
}
