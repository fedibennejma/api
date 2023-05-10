const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const statsController = require('../controllers/StatsController');



router.get('/:type/:date', [authJwt.verifyToken, authJwt.isAdmin], statsController.getStatByDate);
router.get('/user-stats', [authJwt.verifyToken, authJwt.isAdmin], statsController.getBestUsersStats);
router.get('/count/user/:date', [authJwt.verifyToken, authJwt.isAdmin], statsController.getNbrUsersStats);



module.exports = router;