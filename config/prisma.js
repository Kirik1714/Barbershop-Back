const { PrismaClient } = require('@prisma/client'); // <-- ПРАВИЛЬНЫЙ ИМПОРТ

// Создаем экземпляр клиента Prisma
const prisma = new PrismaClient();

// Экспортируем для использования в контроллерах
module.exports = prisma;