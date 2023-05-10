/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 12:51:32
 * @modify date 2021-03-24 12:55:57
 * @desc [description]
 */
const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const teamCtrl = require('../controllers/Team');
const historyCtrl = require('../controllers/HistoryController');

// Team controllers
router.get('/history', [authJwt.verifyToken], historyCtrl.getHistories);
router.get('/', teamCtrl.getAllTeam);
router.get('/:id', teamCtrl.getTeam);
router.get('/workspace/:workspaceId/users',/* [authJwt.verifyToken],*/ teamCtrl.getTeamMembersFromWorkspace);
router.post('/users', [authJwt.verifyToken], teamCtrl.getTeamsByUser);
router.post('/', [authJwt.verifyToken], teamCtrl.createTeam);
router.put('/affect-users', [authJwt.verifyToken], teamCtrl.affectNewUserToTeam);
router.put('/delete-user', [authJwt.verifyToken], teamCtrl.deleteUserFromTeam);
router.put('/:id', [authJwt.verifyToken], teamCtrl.updateTeam);
router.put('/delete/:id', [authJwt.verifyToken], teamCtrl.deleteTeam);
router.post('/affect-workspace', [authJwt.verifyToken], teamCtrl.affectWorkspaceToTeam);
router.post('/accept-invitation', teamCtrl.acceptInvitation);





module.exports = router;


