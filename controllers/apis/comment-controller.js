const commentServices = require('../../services/comment-services')

const commentController = {
  postComment: (req, res, next) => {
    commentServices.postComment(req, (err, data) => err ? next(err) : res.json(data))
  },
  deleteComment: (req, res, next) => {
    commentServices.deleteComment(req, (err, data) => err ? next(err) : res.json(data))
  },
  replyComment: (req, res, next) => {
    commentServices.replyComment(req, (err, data) => err ? next(err) : res.json(data))
  }
}
module.exports = commentController
