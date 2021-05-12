const Router = require('express');

const routes = new Router();

routes.get('/', (req, res) => {
    res.render('pages/index')
})

module.exports = routes