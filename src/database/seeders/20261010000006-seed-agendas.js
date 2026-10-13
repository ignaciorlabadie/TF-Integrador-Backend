'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "agendas" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('agendas', [
            {
                id: 1,
                profesionalId: 1,
                diaSemana: 'LUNES',
                horaInicio: '09:00:00',
                horaFin: '13:00:00',
                duracionTurno: 30,
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                profesionalId: 1,
                diaSemana: 'MIERCOLES',
                horaInicio: '09:00:00',
                horaFin: '13:00:00',
                duracionTurno: 30,
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 3,
                profesionalId: 2,
                diaSemana: 'MARTES',
                horaInicio: '14:00:00',
                horaFin: '18:00:00',
                duracionTurno: 30,
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "agendas" RESTART IDENTITY CASCADE;',
        )
    },
}
