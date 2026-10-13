'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "profesionales" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('profesionales', [
            {
                id: 1,
                usuarioId: 2,
                nombre: 'Ana',
                apellido: 'Lopez',
                dni: '27111222',
                telefono: '1144556677',
                matricula: 'MP-1234',
                especialidad: 'Kinesiologia',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                usuarioId: 3,
                nombre: 'Carlos',
                apellido: 'Diaz',
                dni: '25999888',
                telefono: '1133221100',
                matricula: 'MP-5678',
                especialidad: 'Traumatologia',
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "profesionales" RESTART IDENTITY CASCADE;',
        )
    },
}
