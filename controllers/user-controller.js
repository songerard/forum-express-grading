const bcrypt = require('bcryptjs')
const { User, Restaurant, Category, Comment, Favorite, Like, Followship, LikeComment } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')

const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')

    User.findAll({
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
      .then(() => {
        req.flash('success_messages', '成功註冊帳號！')
        res.redirect('/signin')
      })
      .catch(err => next(err))
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: (req, res, next) => {
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
        // set initial accumulator is an empty array, then for each comment,
        // if its restaurantId is found in accumulator then return empty array,
        // otherwise return this comment and concat in accumulator for next iteration
        // for the whole user.Comments
        result.Comments = result.Comments.reduce((accumulator, currentComment) =>
          accumulator.concat(accumulator.find(y => y.restaurantId === currentComment.restaurantId) ? [] : [currentComment]), [])

        res.render('users/profile', {
          user: result,
          reqUser: req.user,
          isFollowed: req.user.Followings.some(f => f.id === user.id)
        })
      })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    return User.findByPk(req.params.id, { raw: true })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")
        res.render('users/edit', { user })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
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
          .then(() => {
            req.flash('success_messages', '使用者資料編輯成功')
            res.redirect(`/users/${req.params.id}`)
          })
      })
      .catch(err => next(err))
  },
  addFavorite: (req, res, next) => {
    const { restaurantId } = req.params
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
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFavorite: (req, res, next) => {
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
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  addLike: (req, res, next) => {
    const { restaurantId } = req.params
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
        res.redirect('back')
      })
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
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
      .then(() => res.redirect('back'))
      .catch(next)
  },
  getTopUsers: (req, res, next) => {
    // 撈出所有 User 與 followers 資料
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        // 整理 users 資料，把每個 user 項目都拿出來處理一次，並把新陣列儲存在 users 裡
        const result = users
          .map(user => ({
            // 整理格式
            ...user.toJSON(),
            // 計算追蹤者人數
            followerCount: user.Followers.length,
            // 判斷目前登入使用者是否已追蹤該 user 物件
            isFollowed: req.user.Followings.some(f => f.id === user.id)
          }))
          .sort((a, b) => b.followerCount - a.followerCount)
        res.render('top-users', { users: result, reqUser: req.user })
      })
      .catch(err => next(err))
  },
  addFollowing: (req, res, next) => {
    const { userId } = req.params
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
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFollowing: (req, res, next) => {
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
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  likeComment: (req, res, next) => {
    return LikeComment.findOne({
      where: {
        userId: req.user.id,
        commentId: req.params.commentId
      },
      raw: true
    })
      .then(like => {
        if (like) throw new Error("You are already liked this comment!'")

        return LikeComment.create({
          userId: req.user.id,
          commentId: req.params.commentId
        })
      })
      .then(() => res.redirect(`/restaurants/${req.params.restaurantId}`))
      .catch(err => next(err))
  },
  unlikeComment: (req, res, next) => {
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
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }
}
module.exports = userController
