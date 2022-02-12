const bcrypt = require('bcryptjs')
const { User } = require('../models')
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
  }
}
module.exports = userServices
