'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      Comment.belongsTo(models.Restaurant, { foreignKey: 'restaurantId' })
      Comment.belongsTo(models.User, { foreignKey: 'userId' })
      Comment.belongsToMany(models.User, {
        through: models.LikeComment,
        foreignKey: 'commentId',
        as: 'LikedUsers'
      })
    }
  };
  Comment.init({
    text: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    restaurantId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Comment',
    tableName: 'Comments',
    underscored: true
  })
  return Comment
}
