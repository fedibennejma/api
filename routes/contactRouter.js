const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const contactController = require('../controllers/ContactController');



router.post('/', contactController.createContact);




module.exports = router;


