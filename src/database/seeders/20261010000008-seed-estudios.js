'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "estudios" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('estudios', [
            {
                id: 1,
                pacienteId: 1,
                tipo: 'Radiografia',
                fecha: '2026-09-10',
                descripcion: 'Radiografia de rodilla derecha',
                archivoURL: null,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                pacienteId: 2,
                tipo: 'Resonancia',
                fecha: '2026-09-20',
                descripcion: 'Resonancia magnetica de hombro izquierdo',
                archivoURL: null,
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "estudios" RESTART IDENTITY CASCADE;',
        )
    },
}
