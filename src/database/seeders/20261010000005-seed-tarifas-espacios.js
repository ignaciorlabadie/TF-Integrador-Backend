'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "tarifas_espacios" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('tarifas_espacios', [
            {
                id: 1,
                espacioId: 1,
                precioPorHora: 5000.0,
                fechaDesde: '2026-01-01',
                fechaHasta: null,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                espacioId: 2,
                precioPorHora: 4500.0,
                fechaDesde: '2026-01-01',
                fechaHasta: null,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 3,
                espacioId: 3,
                precioPorHora: 6000.0,
                fechaDesde: '2026-01-01',
                fechaHasta: null,
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "tarifas_espacios" RESTART IDENTITY CASCADE;',
        )
    },
}
