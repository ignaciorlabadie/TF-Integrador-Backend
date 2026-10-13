'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "autorizaciones_estudio" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('autorizaciones_estudio', [
            {
                id: 1,
                estudioId: 1,
                profesionalId: 1,
                fechaAutorizacion: '2026-09-11',
                fechaVencimiento: '2026-12-11',
                estado: 'DISPONIBLE',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                estudioId: 2,
                profesionalId: 2,
                fechaAutorizacion: '2026-09-21',
                fechaVencimiento: '2026-10-01',
                estado: 'VENCIDO',
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "autorizaciones_estudio" RESTART IDENTITY CASCADE;',
        )
    },
}
