'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "asignaciones_espacios" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('asignaciones_espacios', [
            {
                id: 1,
                espacioId: 1,
                profesionalId: 1,
                tipo: 'FIJA',
                diaSemana: 'LUNES',
                fecha: null,
                horaInicio: '09:00:00',
                horaFin: '13:00:00',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                espacioId: 2,
                profesionalId: 2,
                tipo: 'FIJA',
                diaSemana: 'MARTES',
                fecha: null,
                horaInicio: '14:00:00',
                horaFin: '18:00:00',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 3,
                espacioId: 3,
                profesionalId: 1,
                tipo: 'ESPECIFICA',
                diaSemana: null,
                fecha: '2026-10-15',
                horaInicio: '18:00:00',
                horaFin: '19:00:00',
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "asignaciones_espacios" RESTART IDENTITY CASCADE;',
        )
    },
}
