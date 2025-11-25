const express = require('express');

const { makeAnAppointment } = require('../controllers/orderController');

const router = express.Router();


router.post('/makeOrder', makeAnAppointment)


module.exports = router;