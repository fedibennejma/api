 const express = require('express');
 const router = express.Router();
 const authJwt = require('../middlewares/authJwt');
 const historiesController = require('../controllers/HistoryController');

 
 
router.post('/connection',[authJwt.verifyToken, authJwt.isAdmin], historiesController.getHistoriesConnection);

 
 
 module.exports = router;
 
 
 