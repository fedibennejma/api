var express = require('express');
var router = express.Router();
var SceneController = require('../controllers/SceneController');
const authJwt = require('../middlewares/authJwt');

router.post('/:presentationId'/*, [authJwt.verifyToken]*/, SceneController.addScene);
router.put('/:presentationId'/*, [authJwt.verifyToken]*/, SceneController.updateScene);
router.put('/:sceneId'/*, [authJwt.verifyToken]*/, SceneController.addElementsToScene);
router.post('/elements/:sceneId'/*, [authJwt.verifyToken]*/, (req, res) => {
    SceneController.updateSceneElements(req.body.elements, req.params.sceneId, res)
});

/**
 * Only adds a single element (used in graphs mainly)
 */
router.post('/element/:sceneId'/*, [authJwt.verifyToken]*/, SceneController.addSingleElementToScene);
router.put('/element/:sceneId'/*, [authJwt.verifyToken]*/, SceneController.updateSingleElementToScene);


router.post('/movements/:elementId'/*, [authJwt.verifyToken]*/, (req, res) => {
    SceneController.addMovementsToElement(req.body.movements, req.params.elementId)
});
router.post('/postprocess/:sceneId'/*, [authJwt.verifyToken]*/, SceneController.updateScenePostprocess);
router.get('/:sceneId/:presentationId', [authJwt.verifyToken], SceneController.getScene);
router.put('/source/:elementId', [authJwt.verifyToken], SceneController.updateElementSource);
router.put('/text/:elementId', [authJwt.verifyToken], SceneController.updateElementText);
router.put('/metallicoptions/:sceneId', [authJwt.verifyToken], SceneController.updateSceneMetallicOptions);


module.exports = router;
