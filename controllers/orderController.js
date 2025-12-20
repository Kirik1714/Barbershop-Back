const prisma = require("../config/prisma");


const makeAnAppointment = async (req, res) => {
  const clientUserId = req.user.userId;
  const { items } = req.body; // Получаем массив Order[]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const createdAppointments = [];

      for (const item of items) {
     
        await tx.cartReservation.deleteMany({
          where: {
            masterId: parseInt(item.masterId),
            date: new Date(item.date),
            time: item.time,
            reservedByUserId: clientUserId,
          },
        });

        // 2. Создаем постоянную запись в Appointment
        const appointment = await tx.appointment.create({
          data: {
            userId: clientUserId,
            masterId: parseInt(item.masterId),
            serviceId: parseInt(item.id), // Твой интерфейс: id -> serviceId
            date: new Date(item.date),
            time: item.time,
            price: parseFloat(item.servicePrice), // Твой интерфейс: servicePrice -> price
            status: "confirmed",
          },
        });
        
        createdAppointments.push(appointment);
      }

      return createdAppointments;
    });

    res.status(201).json({
      message: "Order finalized successfully",
      count: result.length,
      appointments: result,
    });
  } catch (error) {
    console.error("Order completion error:", error);
    res.status(500).json({ message: "Failed to process the order." });
  }
};

module.exports = {
  makeAnAppointment,
};
