const { Comment, User, Restaurant } = require('../models')

const commentServices = {
  postComment: (req, cb) => {
    const { restaurantId, text } = req.body
    const userId = req.user.id
    if (!text) throw new Error('Comment text is required!')
    return Promise.all([
      User.findByPk(userId),
      Restaurant.findByPk(restaurantId)
    ])
      .then(([user, restaurant]) => {
        if (!user) throw new Error("User didn't exist!")
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        return Comment.create({
          text,
          restaurantId: Number(restaurantId),
          userId,
          replyCommentId: 0,
          layer: 1
        })
      })
      .then(comment => cb(null, { comment }))
      .catch(err => cb(err))
  },
  deleteComment: (req, cb) => {
    return Comment.findByPk(req.params.id)
      .then(comment => {
        if (!comment) throw new Error("Comment didn't exist!'")
        return comment.destroy()
      })
      .then(deletedComment => cb(null, { comment: deletedComment }))
      .catch(err => cb(err))
  },
  replyComment: (req, cb) => {
    const { restaurantId, text } = req.body
    const userId = req.user.id
    if (!text) throw new Error('Reply text is required!')
    return Promise.all([
      User.findByPk(userId),
      Restaurant.findByPk(restaurantId),
      Comment.findOne({ where: { id: req.params.id } })
    ])
      .then(([user, restaurant, comment]) => {
        if (!user) throw new Error("User didn't exist!")
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        const layer = comment.layer + 1
        return Comment.create({
          text,
          restaurantId: Number(restaurantId),
          userId,
          replyCommentId: Number(req.params.id),
          layer
        })
      })
      .then(reply => cb(null, { reply }))
      .catch(err => cb(err))
  }
}
module.exports = commentServices
