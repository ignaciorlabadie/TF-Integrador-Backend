'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "espacios" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('espacios', [
            {
                id: 1,
                nombre: 'Consultorio 1',
                tipo: 'CONSULTORIO',
                ubicacion: 'ADELANTE',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                nombre: 'Consultorio 2',
                tipo: 'CONSULTORIO',
                ubicacion: 'ATRAS',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 3,
                nombre: 'Gimnasio 1',
                tipo: 'GIMNASIO',
                ubicacion: 'ADELANTE',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "espacios" RESTART IDENTITY CASCADE;',
        )
    },
}
