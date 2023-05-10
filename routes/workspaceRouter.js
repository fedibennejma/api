/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 16:51:50
 * @modify date 2021-03-24 12:58:45
 * @desc [description]
 */

const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const workspaceCtrl = require('../controllers/Workspace');

// workspace controllers
router.get('/workspace-user/:id', [authJwt.verifyToken], workspaceCtrl.getOneWorkspaceByUserRight);
router.get('/workspaces', [authJwt.verifyToken], workspaceCtrl.getAllWorkspaceByUserRight);
router.get('/', workspaceCtrl.getAllWorkspace);
router.get('/:id', workspaceCtrl.getWorkspace);
router.get('/:id/rights', workspaceCtrl.getWorkspaceRights);
router.put('/:id', [authJwt.verifyToken], workspaceCtrl.updateWorkspace);
router.post('/affect-users', [authJwt.verifyToken], workspaceCtrl.affectNewRightToWorkspace);
router.post('/delete-users', [authJwt.verifyToken], workspaceCtrl.deleteRightFromWorkspace);
router.put('/delete/:id', [authJwt.verifyToken], workspaceCtrl.deleteWorkspace);


module.exports = router;