const bcrypt = require('bcryptjs')
const { User, Restaurant, Category, Comment, Favorite, Like, Followship, LikeComment } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')

const userServices = {
  signUp: (req, cb) => {
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')

    return User.findAll({
      $or: [
        { where: { name: req.body.name } },
        { where: { email: req.body.email } }
      ]
    })
      .then(users => {
        if (users.some(u => u.email === req.body.email)) throw new Error('Email already exists!')
        if (users.some(u => u.name === req.body.name)) throw new Error('Name already exists!')

        const { file } = req
        return Promise.all([
          bcrypt.hash(req.body.password, 10),
          imgurFileHandler(file)
        ])
      })
      .then(([hash, filePath]) => {
        return User.create({
          name: req.body.name,
          email: req.body.email,
          password: hash,
          image: filePath || process.env.IMAGE_PLACEHOLDER_URL
        })
      })
      .then(newUser => {
        return cb(null, { user: newUser })
      })
      .catch(err => cb(err))
  },
  getUser: (req, cb) => {
    return User.findByPk(req.params.id, {
      include: [
        {
          model: Comment,
          include: { model: Restaurant, include: Category }
        },
        {
          model: Restaurant,
          as: 'FavoritedRestaurants',
          include: Category
        },
        { model: Restaurant, as: 'LikedRestaurants' },
        { model: User, as: 'Followers' },
        { model: User, as: 'Followings' }
      ]
    })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")

        const result = user.toJSON()
        // To reduce Comments to unique restaurant list:
        // set initial accumulator as an empty array, then for each comment,
        // if its restaurantId is found in accumulator then return empty array,
        // otherwise return this comment and concat in accumulator for next iteration
        // for the whole user.Comments
        result.Comments = result.Comments.reduce((accumulator, currentComment) =>
          accumulator.concat(accumulator.find(y => y.restaurantId === currentComment.restaurantId) ? [] : [currentComment]), [])

        return cb(null, {
          user: result,
          reqUser: req.user,
          isFollowed: req.user.Followings.some(f => f.id === user.id)
        })
      })
      .catch(err => cb(err))
  },
  editUser: (req, cb) => {
    return User.findByPk(req.params.id, { raw: true })
      .then(editedUser => {
        if (!editedUser) throw new Error("User didn't exist!")
        return cb(null, { user: editedUser })
      })
      .catch(err => cb(err))
  },
  putUser: (req, cb) => {
    const { name } = req.body
    if (!name) throw new Error('User name is required!')
    User.findOne({ where: { name } })
      .then(user => {
        if (user) throw new Error('Name already exists!')

        const { file } = req
        return Promise.all([
          User.findByPk(req.params.id),
          imgurFileHandler(file)
        ])
          .then(([user, filePath]) => {
            if (!user) throw new Error("User didn't exist!")
            return user.update({
              name,
              image: filePath || user.image
            })
          })
          .then(updatedUser => cb(null, { user: updatedUser }))
      })
      .catch(err => cb(err))
  },
  addFavorite: (req, cb) => {
    const restaurantId = Number(req.params.restaurantId)
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (favorite) throw new Error('You have favorited this restaurant!')

        return Favorite.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(addedFavorite => cb(null, { favorite: addedFavorite }))
      .catch(err => cb(err))
  },
  removeFavorite: (req, cb) => {
    return Favorite.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(favorite => {
        if (!favorite) throw new Error("You haven't favorited this restaurant")

        return favorite.destroy()
      })
      .then(removedFavorite => cb(null, { favorite: removedFavorite }))
      .catch(err => cb(err))
  },
  addLike: (req, cb) => {
    const restaurantId = Number(req.params.restaurantId)
    return Restaurant.findByPk(restaurantId)
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")

        return Like.findOrCreate({
          where: {
            userId: req.user.id,
            restaurantId
          }
        })
      })
      .then(([like, created]) => {
        if (!created) throw new Error("You have liked this restaurant!'")
        return cb(null, { like: like.toJSON() })
      })
      .catch(err => cb(err))
  },
  removeLike: (req, cb) => {
    return Like.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(like => {
        if (!like) throw new Error("You haven't liked this restaurant")

        return like.destroy()
      })
      .then(removedLike => cb(null, { like: removedLike }))
      .catch(err => cb(err))
  },
  getTopUsers: (req, cb) => {
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        const result = users
          .map(user => ({
            ...user.toJSON(),
            followerCount: user.Followers.length,
            isFollowed: req.user.Followings.some(f => f.id === user.id)
          }))
          .sort((a, b) => b.followerCount - a.followerCount)
        return cb(null, { users: result, reqUser: req.user })
      })
      .catch(err => cb(err))
  },
  addFollowing: (req, cb) => {
    const userId = Number(req.params.userId)
    Promise.all([
      User.findByPk(userId),
      Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })
    ])
      .then(([user, followship]) => {
        if (!user) throw new Error("User didn't exist!")
        if (followship) throw new Error('You are already following this user!')
        return Followship.create({
          followerId: req.user.id,
          followingId: userId
        })
      })
      .then(addedFollowship => cb(null, { followship: addedFollowship }))
      .catch(err => cb(err))
  },
  removeFollowing: (req, cb) => {
    Followship.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    })
      .then(followship => {
        if (!followship) throw new Error("You haven't followed this user!")
        return followship.destroy()
      })
      .then(removedFollowship => cb(null, { followship: removedFollowship }))
      .catch(err => cb(err))
  },
  likeComment: (req, cb) => {
    const userId = req.user.id
    const commentId = Number(req.params.commentId)
    return LikeComment.findOne({
      where: {
        userId,
        commentId
      },
      raw: true
    })
      .then(like => {
        if (like) throw new Error("You are already liked this comment!'")

        return LikeComment.create({
          userId,
          commentId
        })
      })
      .then(likeComment => cb(null, { likeComment }))
      .catch(err => cb(err))
  },
  unlikeComment: (req, cb) => {
    LikeComment.findOne({
      where: {
        userId: req.user.id,
        commentId: req.params.commentId
      }
    })
      .then(like => {
        if (!like) throw new Error("You haven't liked this comment!")
        return like.destroy()
      })
      .then(unlikedComment => cb(null, { likeComment: unlikedComment }))
      .catch(err => cb(err))
  }
}
module.exports = userServices
