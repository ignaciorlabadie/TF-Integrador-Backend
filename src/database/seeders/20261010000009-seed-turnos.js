'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "turnos" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('turnos', [
            {
                id: 1,
                pacienteId: 1,
                profesionalId: 1,
                agendaId: 1,
                fecha: '2026-10-19',
                hora: '09:00:00',
                estado: 'PENDIENTE',
                motivo: 'Consulta de kinesiologia',
                observaciones: null,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                pacienteId: 2,
                profesionalId: 2,
                agendaId: 3,
                fecha: '2026-10-20',
                hora: '14:00:00',
                estado: 'CONFIRMADO',
                motivo: 'Control de traumatologia',
                observaciones: 'El paciente trae estudios previos',
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "turnos" RESTART IDENTITY CASCADE;',
        )
    },
}
