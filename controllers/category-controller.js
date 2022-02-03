const { Category, Restaurant } = require('../models')
const categoryController = {
  getCategories: (req, res, next) => {
    return Promise.all([
      Category.findAll({ raw: true }),
      req.params.id ? Category.findByPk(req.params.id, { raw: true }) : null
    ])
      .then(([categories, category]) => {
        res.render('admin/categories', { categories, category })
      })
      .catch(err => next(err))
  },
  postCategory: (req, res, next) => {
    const { name } = req.body
    if (!name) throw new Error('Category name is required!')
    return Category.create({ name })
      .then(() => res.redirect('/admin/categories'))
      .catch(err => next(err))
  },
  putCategory: (req, res, next) => {
    const { name } = req.body
    if (!name) throw new Error('Category name is required!')
    return Category.findByPk(req.params.id)
      .then(category => {
        if (!category) throw new Error("Category doesn't exist!")
        return category.update({ name })
      })
      .then(() => res.redirect('/admin/categories'))
      .catch(err => next(err))
  },
  deleteCategory: (req, res, next) => {
    return Promise.all([
      Category.findOne({ where: { name: '(未分類)' } }),
      Category.findByPk(req.params.id)
    ])
      .then(([notClassified, category]) => {
        if (!notClassified) throw new Error('(未分類)尚未建立')
        if (Number(req.params.id) === notClassified.id) throw new Error('(未分類)不能被刪除')
        if (!category) throw new Error("Category didn't exist!")
        return Restaurant.update(
          { categoryId: notClassified.id },
          { where: { categoryId: req.params.id } }
        )
      })
      .then(() => {
        return Category.findByPk(req.params.id)
      })
      .then(category => {
        return category.destroy()
      })
      .then(() => res.redirect('/admin/categories'))
      .catch(err => next(err))
  }
}
module.exports = categoryController
