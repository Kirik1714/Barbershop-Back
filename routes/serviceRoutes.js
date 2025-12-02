const express = require('express');
const router = express.Router();
const { 
    getAllServices,
    getServiceAvailability 
} = require('../controllers/serviceController.js'); 


// Этот маршрут будет доступен по пути: /services/
router.get('/', getAllServices);

router.get(`/:id/availability`,getServiceAvailability)

module.exports = router;