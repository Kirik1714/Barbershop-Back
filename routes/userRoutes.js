const express = require('express');
const { registerUser, loginUser, getMaster, getMe, getMyAppointments } = require('../controllers/userController.js');
const { authMiddleware } = require('../middleware/authMiddleware.js');
const router = express.Router();

router.get('/',getMaster);

router.post('/registration',registerUser);
router.post('/login',loginUser);
router.get('/me', authMiddleware, getMe);
router.get('/myAppointment',authMiddleware,getMyAppointments)


module.exports = router;
