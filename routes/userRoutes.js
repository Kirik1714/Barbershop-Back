const express = require('express');
const { registerUser, loginUser, getMaster } = require('../controllers/userController.js');
const router = express.Router();

router.get('/',getMaster);

router.post('/registration',registerUser);
router.post('/login',loginUser);

module.exports = router;
