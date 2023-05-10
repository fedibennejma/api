/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-03 11:55:08
 * @modify date 2021-06-08 10:44:27
 * @desc [description]
 */

const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const blogCtrl = require('../controllers/Blog');
const articleCtrl = require('../controllers/Article');
const tagCtrl = require('../controllers/Tag');


// blog controllers
router.get('/', blogCtrl.getAllBlog);
router.post('/',[authJwt.verifyToken,authJwt.isAdmin], blogCtrl.createBlog);
router.put('/:id',[authJwt.verifyToken,authJwt.isAdmin], blogCtrl.updateBlog);
router.put('/delete/:id',[authJwt.verifyToken,authJwt.isAdmin], blogCtrl.deleteBlog);

// article controllers
router.get('/article/', articleCtrl.getAllArticle);
router.get('/article/pagination/:skip/:limit/:category', articleCtrl.getArticlePagination);
router.get('/article/top-articles', articleCtrl.getTopArticles);
router.post('/article/',[authJwt.verifyToken,authJwt.isAdmin], articleCtrl.createArticle);
router.get('/article/:slug', articleCtrl.getArticle);
router.put('/article/:id',[authJwt.verifyToken,authJwt.isAdmin], articleCtrl.updateArticle);
router.put('/article/delete/:id',[authJwt.verifyToken,authJwt.isAdmin], articleCtrl.deleteArticle);

// tag controller
router.get('/tag/', tagCtrl.getAllTag);
router.post('/tag/', tagCtrl.createTag);


module.exports = router;


