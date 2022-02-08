const { Restaurant, Category } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')
const { getOffset, getPagination } = require('../helpers/pagination-helper')

const adminServices = {
  getRestaurants: (req, cb) => {
    const DEFAULT_LIMIT = 20
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
        raw: true,
        nest: true
      }),
      Category.findAll({ raw: true })
    ])
      .then(([restaurants, categories]) => {
        return cb(null, {
          restaurants: restaurants.rows,
          categories,
          categoryId,
          pagination: getPagination(limit, page, restaurants.count)
        })
      })
      .then(restaurants => cb(null, { restaurants }))
      .catch(err => cb(err))
  },
  deleteRestaurant: (req, cb) => {
    return Restaurant.findByPk(req.params.id)
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        return restaurant.destroy()
      })
      .then(deletedRestaurant => cb(null, { restaurant: deletedRestaurant }))
      .catch(err => cb(err))
  }
}
module.exports = adminServices
