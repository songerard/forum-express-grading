const commentServices = require('../../services/comment-services')

const commentController = {
  postComment: (req, res, next) => {
    commentServices.postComment(req, (err, data) => err ? next(err) : res.redirect(`/restaurants/${data.comment.restaurantId}`))
  },
  deleteComment: (req, res, next) => {
    commentServices.deleteComment(req, (err, data) => err ? next(err) : res.redirect(`/restaurants/${data.comment.restaurantId}`))
  },
  replyComment: (req, res, next) => {
    commentServices.deleteComment(req, (err, data) => err ? next(err) : res.redirect(`/restaurants/${data.reply.restaurantId}`))
  }
}
module.exports = commentController
