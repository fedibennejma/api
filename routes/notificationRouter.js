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
 const notificationController = require('../controllers/NotificationController');

 
 
 router.get('/',[authJwt.verifyToken], notificationController.getNotification);
 router.get('/length',[authJwt.verifyToken], notificationController.getNotificationsLength);
 router.put('/',[authJwt.verifyToken], notificationController.openNotifications);

 
 
 module.exports = router;
 
 
 