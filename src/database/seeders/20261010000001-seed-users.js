'use strict'

const bcrypt = require('bcryptjs')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;',
        )

        const password = bcrypt.hashSync('Password123', 10)
        const now = new Date()

        await queryInterface.bulkInsert('users', [
            {
                id: 1,
                email: 'admin@tfi.local.com',
                password,
                rol: 'ADMIN',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                email: 'profesional1@tfi.local.com',
                password,
                rol: 'PROFESIONAL',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 3,
                email: 'profesional2@tfi.local.com',
                password,
                rol: 'PROFESIONAL',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 4,
                email: 'paciente1@tfi.local.com',
                password,
                rol: 'PACIENTE',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 5,
                email: 'paciente2@tfi.local.com',
                password,
                rol: 'PACIENTE',
                activo: true,
                createdAt: now,
                updatedAt: now,
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;',
        )
    },
}
