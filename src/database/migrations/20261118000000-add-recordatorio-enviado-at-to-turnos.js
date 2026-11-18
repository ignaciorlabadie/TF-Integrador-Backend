'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('turnos', 'recordatorioEnviadoAt', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
        })

        await queryInterface.addIndex(
            'turnos',
            ['estado', 'recordatorioEnviadoAt', 'fecha'],
            {
                name: 'turnos_recordatorio_lookup_idx',
            },
        )
    },

    async down(queryInterface) {
        await queryInterface.removeIndex(
            'turnos',
            'turnos_recordatorio_lookup_idx',
        )
        await queryInterface.removeColumn('turnos', 'recordatorioEnviadoAt')
    },
}
