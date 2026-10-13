'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "pacientes" RESTART IDENTITY CASCADE;',
        )

        const now = new Date()

        await queryInterface.bulkInsert('pacientes', [
            {
                id: 1,
                usuarioId: 4,
                nombre: 'Juan',
                apellido: 'Perez',
                dni: '30111222',
                telefono: '1122334455',
                fechaNacimiento: '1990-05-14',
                direccion: 'Av. Siempreviva 742',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                usuarioId: 5,
                nombre: 'Maria',
                apellido: 'Gomez',
                dni: '28999888',
                telefono: '1166778899',
                fechaNacimiento: '1985-11-02',
                direccion: 'Calle Falsa 123',
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "pacientes" RESTART IDENTITY CASCADE;',
        )
    },
}
