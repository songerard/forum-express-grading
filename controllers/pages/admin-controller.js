const adminServices = require('../../services/admin-services')

const adminController = {
  getRestaurants: (req, res, next) => {
    adminServices.getRestaurants(req, (err, data) => err ? next(err) : res.render('admin/restaurants', data))
  },
  createRestaurant: (req, res, next) => {
    adminServices.createRestaurant(req, (err, data) => err ? next(err) : res.render('admin/create-restaurant', data))
  },
  postRestaurant: (req, res, next) => {
    adminServices.postRestaurant(req, (err, data) => {
      if (err) return next(err)

      req.flash('success_messages', 'restaurant was successfully created')
      res.redirect('/admin/restaurants', data)
    })
  },
  getRestaurant: (req, res, next) => {
    adminServices.getRestaurant(req, (err, data) => err ? next(err) : res.render('admin/restaurant', data))
  },
  editRestaurant: (req, res, next) => {
    adminServices.editRestaurant(req, (err, data) => err ? next(err) : res.render('admin/edit-restaurant', data))
  },
  putRestaurant: (req, res, next) => {
    adminServices.putRestaurant(req, (err, data) => {
      if (err) return next(err)

      req.flash('success_messages', 'restaurant was successfully to update')
      res.redirect('/admin/restaurants')
    })
  },
  deleteRestaurant: (req, res, next) => {
    adminServices.deleteRestaurant(req, (err, data) => err ? next(err) : res.redirect('/admin/restaurants', data))
  },
  getUsers: (req, res, next) => {
    adminServices.getUsers(req, (err, data) => err ? next(err) : res.render('admin/users', data))
  },
  patchUser: (req, res, next) => {
    adminServices.patchUser(req, (err, data) => {
      if (err) return next(err)

      req.flash('success_messages', '使用者權限變更成功')
      const redirectPath = '/admin/users?page=' + req.query.page + '&isAdmin=' + req.query.isAdmin + '&limit=' + req.query.limit
      res.redirect(redirectPath)
    })
  }
}
module.exports = adminController
