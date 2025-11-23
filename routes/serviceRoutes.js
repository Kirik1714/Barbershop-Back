const express = require('express');
const router = express.Router();
const { 
    getAllServices, 
} = require('../controllers/serviceController.js'); 


// Этот маршрут будет доступен по пути: /services/
router.get('/', getAllServices);

module.exports = router;