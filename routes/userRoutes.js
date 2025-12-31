const express = require('express');
const { registerUser, loginUser, getMaster, getMe, getMyAppointments, cancelAppointment } = require('../controllers/userController.js');
const { authMiddleware } = require('../middleware/authMiddleware.js');
const router = express.Router();

router.get('/',getMaster);

router.post('/registration',registerUser);
router.post('/login',loginUser);
router.get('/me', authMiddleware, getMe);
router.get('/myAppointment',authMiddleware,getMyAppointments)
router.patch('/appointment/:id/cancel', authMiddleware, cancelAppointment);


module.exports = router;
