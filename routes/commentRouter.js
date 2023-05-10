var express = require('express');
var router = express.Router();
const authJwt = require('../middlewares/authJwt');
const commentController = require('../controllers/CommentController')

router.post('/', [authJwt.verifyToken], commentController.createComment); 
router.get('/:presentationId', [authJwt.verifyToken], commentController.getPresentationComments);
router.get('/:slideId', [authJwt.verifyToken], commentController.getSlideComments);
router.get('/target/:limit', [authJwt.verifyToken], commentController.getTaggedComments);

module.exports = router;