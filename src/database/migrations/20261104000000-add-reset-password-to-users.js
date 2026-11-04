'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'resetPasswordTokenHash', {
            type: Sequelize.STRING(64),
            allowNull: true,
        })

        await queryInterface.addColumn('users', 'resetPasswordExpiresAt', {
            type: Sequelize.DATE,
            allowNull: true,
        })
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('users', 'resetPasswordTokenHash')
        await queryInterface.removeColumn('users', 'resetPasswordExpiresAt')
    },
}
