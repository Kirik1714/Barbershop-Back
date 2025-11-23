const prisma = require('../config/prisma');

// --- 1. GET ALL SERVICES ---
const getAllServices = async (req, res) => {
    try {
        const services = await prisma.service.findMany({
           
            orderBy: { title: 'asc' } 
        });
        res.json({ data: services });
    } catch (error) {
        console.error('Ошибка при получении услуг:', error);
    
        res.status(500).json({ error: 'Не удалось получить список услуг' });
    }
};

module.exports = {
    getAllServices,
    
};
