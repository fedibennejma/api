var express = require('express');
var router = express.Router();
const authJwt = require('../middlewares/authJwt');
const mediaController = require('../controllers/MediaController')

router.post('/', [authJwt.verifyToken], mediaController.createMedia); 
router.get('/models3D', [authJwt.verifyToken], mediaController.fetch3DModels); 

module.exports = router;