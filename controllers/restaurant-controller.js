const { Restaurant, Category, Comment, User, LikeComment } = require('../models')
const { getOffset, getPagination } = require('../helpers/pagination-helper')
const restaurantController = {
  getRestaurants: (req, res, next) => {
    const DEFAULT_LIMIT = 9
    const categoryId = Number(req.query.categoryId) || ''
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || DEFAULT_LIMIT
    const offset = getOffset(limit, page)
    return Promise.all([
      Restaurant.findAndCountAll({
        include: Category,
        where: { ...categoryId ? { categoryId } : {} },
        limit,
        offset,
        nest: true,
        raw: true
      }),
      Category.findAll({ raw: true })
    ])
      .then(([restaurants, categories]) => {
        const favoritedRestaurantsId = req.user && req.user.FavoritedRestaurants.map(fr => fr.id)
        const likedRestaurantsId = req.user && req.user.LikedRestaurants.map(liked => liked.id)
        const data = restaurants.rows.map(r => ({
          ...r,
          description: r.description.substring(0, 50),
          isFavorited: favoritedRestaurantsId.includes(r.id),
          isLiked: likedRestaurantsId.includes(r.id)
        }))

        return res.render('restaurants', {
          restaurants: data,
          categories,
          categoryId,
          pagination: getPagination(limit, page, restaurants.count)
        })
      })
      .catch(err => next(err))
  },
  getRestaurant: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment, include: User },
        { model: User, as: 'FavoritedUsers' },
        { model: User, as: 'LikedUsers' }
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        return Promise.all([
          restaurant.increment('viewCounts'),
          User.findByPk(req.user.id, {
            include: [
              { model: Comment, as: 'LikedComments' }
            ]
          }),
          LikeComment.findAll({
            raw: true
          })
        ])
      })
      .then(([restaurant, user, likeComments]) => {
        const isFavorited = restaurant.FavoritedUsers.some(f => f.id === req.user.id)
        const isLiked = restaurant.LikedUsers.some(liked => liked.id === req.user.id)

        // assign commentIsLiked key into each comment by comparing with user's likedComment list
        const userObj = user.toJSON()
        const restaurantObj = restaurant.toJSON()
        const commentsWithLike = restaurantObj.Comments.map(c => ({
          ...c,
          commentIsLiked: userObj.LikedComments.some(u => u.id === c.id),
          commentLikeCounts: likeComments.filter(like => like.commentId === c.id).length
        })).sort((a, b) => b.commentLikeCounts - a.commentLikeCounts || b.createdAt - a.createdAt)

        // push comments into their layer array
        const layer1 = []
        const layer2 = []
        const layer3 = []
        const layer4 = []
        const layer5 = []

        commentsWithLike.forEach(c => {
          switch (c.layer) {
            case 1:
              layer1.push(c)
              break
            case 2:
              layer2.push(c)
              break
            case 3:
              layer3.push(c)
              break
            case 4:
              layer4.push(c)
              break
            case 5:
              layer5.push(c)
          }
        })

        // rearrange the sequence of comments and followed by their replies
        const rearrangedComments = []
        for (const L1 of layer1) {
          rearrangedComments.push(L1)

          for (const L2 of layer2) {
            if (L2.replyCommentId === L1.id) {
              rearrangedComments.push(L2)

              for (const L3 of layer3) {
                if (L3.replyCommentId === L2.id) {
                  rearrangedComments.push(L3)

                  for (const L4 of layer4) {
                    if (L4.replyCommentId === L3.id) {
                      rearrangedComments.push(L4)

                      for (const L5 of layer5) {
                        if (L5.replyCommentId === L4.id) {
                          rearrangedComments.push(L5)
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        restaurantObj.Comments = rearrangedComments

        res.render('restaurant', {
          restaurant: restaurantObj,
          isFavorited,
          isLiked
        })
      })
      .catch(err => next(err))
  },
  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment },
        { model: User, as: 'FavoritedUsers' }
      ]
    })
      .then(r => {
        if (!r) throw new Error("Restaurant didn't exist!")
        const restaurant = r.toJSON()
        const viewCounts = r.viewCounts
        res.render('dashboard', { restaurant, viewCounts })
      })
      .catch(err => next(err))
  },
  getFeeds: (req, res, next) => {
    return Promise.all([
      Restaurant.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [Category],
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [User, Restaurant],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => {
        res.render('feeds', {
          restaurants,
          comments
        })
      })
      .catch(err => next(err))
  },
  getTopRestaurants: (req, res, next) => {
    return Restaurant.findAll({
      include: [
        { model: User, as: 'FavoritedUsers' },
        { model: Category }
      ]
    })
      .then(restaurants => {
        const userFavoritedRestaurantsId = req.user ? req.user.FavoritedRestaurants : []
        const result = restaurants
          .map(r => ({
            ...r.toJSON(),
            favoritedCount: r.FavoritedUsers.length,
            isFavorited: userFavoritedRestaurantsId.some(f => f.id === r.id)
            // isLiked: req.user.LikedRestaurants.some(liked => liked.id === r.id)
          }))
          .sort((a, b) => b.favoritedCount - a.favoritedCount)
          .slice(0, 10)
        res.render('top-restaurants', { restaurants: result })
      })
      .catch(err => next(err))
  }
}
module.exports = restaurantController
