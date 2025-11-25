const prisma = require("../config/prisma");


const makeAnAppointment = async (req, res) => {
  const clientUserId = req.user.userId;
  try {
    const { masterId, serviceId, date, time } = req.body;
    if (!masterId || !serviceId || !date || !time) {
      return res.status(400).json({
        message:
          "Missing required fields: masterId, serviceId, date, and time are required.",
      });
    }
    const newAppointment = await prisma.appointment.create({
      data: {
        userId: clientUserId, 
        masterId: parseInt(masterId),
        serviceId: parseInt(serviceId),
       
        date: new Date(date),
        time: new Date(time),
        status: "pending", 
      },
    });
    res.status(201).json({
      message: "Appointment successfully created.",
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);

    // Обработка ошибок Prisma (например, если masterId или serviceId не существует)
    if (error.code === "P2003") {
      return res
        .status(404)
        .json({ message: "Master or Service ID not found." });
    }

    res.status(500).json({ message: "Failed to create appointment." });
  }
};

module.exports = {
  makeAnAppointment,
};
