const express = require('express');
const router = express.Router();
const { 
    getAllServices,
    getServiceAvailability, 
    createSlotReservation,
    removeSlotReservation
} = require('../controllers/serviceController.js'); 
const { authMiddleware } = require('../middleware/authMiddleware.js');

// Этот маршрут будет доступен по пути: /services/
router.get('/', getAllServices);

router.get(`/:id/availability`,getServiceAvailability);

router.post('/reserve', authMiddleware, createSlotReservation);

router.post('/unreserve', authMiddleware, removeSlotReservation);


module.exports = router;