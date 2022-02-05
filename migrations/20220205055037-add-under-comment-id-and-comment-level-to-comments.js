'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Comments', 'reply_comment_id', {
      type: Sequelize.INTEGER
    })
    await queryInterface.addColumn('Comments', 'layer', {
      type: Sequelize.INTEGER
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Comments', 'reply_comment_id')
    await queryInterface.removeColumn('Comments', 'layer')
  }
}
