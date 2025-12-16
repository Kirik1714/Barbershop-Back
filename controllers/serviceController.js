const prisma = require("../config/prisma");
const RESERVATION_DURATION_MS = 30 * 60 * 1000;
// Получение всех услуг
const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { title: "asc" },
    });
    res.json({ data: services });
  } catch (error) {
    console.error("Ошибка при получении услуг:", error);
    res.status(500).json({ error: "Не удалось получить список услуг" });
  }
};
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// минуты → HH:MM
function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(
    mins % 60
  ).padStart(2, "0")}`;
}

// округление вверх до ближайшего шага (15/30 минут)
function roundUpToStep(mins, step) {
  return Math.ceil(mins / step) * step;
}
// ----------------------------------------------------

const getServiceAvailability = async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const masterId = parseInt(req.query.masterId);
    const dateQuery = req.query.date;

    if (!serviceId || !masterId || !dateQuery) {
      return res
        .status(400)
        .json({ error: "Не указан serviceId, masterId или date" });
    } // Устанавливаем границы дня для запросов

    const startOfDay = new Date(dateQuery);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateQuery);
    endOfDay.setHours(23, 59, 59, 999); // Текущий день недели для расписания
    const day = startOfDay.getDay(); // 1) Находим услугу и ее продолжительность

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return res.status(404).json({ error: "Услуга не найдена" });

    // 💡 ОПРЕДЕЛЯЕМ ДИНАМИЧЕСКИЙ ШАГ: равен продолжительности услуги
    const DYNAMIC_STEP = service.durationMinutes; // 2) Находим мастера и его расписание/отгулы

    const master = await prisma.user.findUnique({
      where: { id: masterId },
      include: {
        schedule: { where: { dayOfWeek: day } },
        daysOff: { where: { date: startOfDay } },
      },
    });

    if (!master || master.schedule.length === 0 || master.daysOff.length > 0) {
      return res.json({ service, master, slots: [] });
    }

    const schedule = master.schedule[0];
    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime); // 3) Получаем все занятые интервалы (Appointment + CartReservation) // 3.1) ПОДТВЕРЖДЕННЫЕ ЗАПИСИ (Appointments)

    const appointments = await prisma.appointment.findMany({
      where: {
        masterId: masterId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { service: true },
    }); // 3.2) АКТИВНЫЕ РЕЗЕРВЫ (CartReservation)
    const activeReservations = await prisma.cartReservation.findMany({
      where: {
        masterId: masterId,
        date: { gte: startOfDay, lte: endOfDay }, // 💡 КЛЮЧЕВОЕ УСЛОВИЕ: Срок резерва еще не истек
        expiresAt: { gt: new Date() },
      },
      include: { service: true },
    }); // 4) Строим массив занятых интервалов (BUSY)

    const busy = []; // 4.1) Интервалы из подтвержденных записей

    appointments.forEach((a) => {
      const start = timeToMinutes(a.time);
      const end = start + a.service.durationMinutes;
      busy.push({ start, end });
    }); // 4.2) Интервалы из активных резервов

    activeReservations.forEach((r) => {
      const start = timeToMinutes(r.time);
      const end = start + r.service.durationMinutes;
      busy.push({ start, end });
    }); // Добавляем границы рабочего дня

    busy.push({ start: 0, end: scheduleStart });
    busy.push({ start: scheduleEnd, end: 1440 }); // Сортируем по времени начала

    busy.sort((a, b) => a.start - b.start); // 5) Генерируем свободные промежутки (Free Intervals)

    const freeIntervals = [];
    for (let i = 0; i < busy.length - 1; i++) {
      const freeStart = busy[i].end;
      const freeEnd = busy[i + 1].start; // 💡 ДОБАВЛЯЕМ ВАЖНУЮ ПРОВЕРКУ: свободный интервал должен быть

      // достаточно большим, чтобы вместить ДАННУЮ услугу.
      if (freeEnd - freeStart >= DYNAMIC_STEP) {
        freeIntervals.push({ start: freeStart, end: freeEnd });
      }
    } // 6) Генерация красивых слотов с динамическим шагом

    const slots = [];

    freeIntervals.forEach((interval) => {
      // Начинаем с округленного времени
      // 💡 ОКРУГЛЯЕМ ДО КРАТНОГО ПРОДОЛЖИТЕЛЬНОСТИ УСЛУГИ
      let current = roundUpToStep(interval.start, DYNAMIC_STEP); // Проверяем, помещается ли услуга в оставшийся интервал

      while (current + service.durationMinutes <= interval.end) {
        slots.push(minutesToTime(current)); // 💡 СДВИГАЕМ НА ПРОДОЛЖИТЕЛЬНОСТЬ УСЛУГИ
        current += DYNAMIC_STEP;
      }
    });

    return res.json({
      service,
      master: { id: master.id, name: master.name },
      slots,
    });
  } catch (err) {
    console.error("Ошибка получения слотов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const createSlotReservation = async (req, res) => {
  const clientUserId = req.user.userId;

  try {
    const { masterId, serviceId, date, time } = req.body;

    if (!masterId || !serviceId || !date || !time) {
      return res.status(400).json({
        message:
          "Missing required fields: masterId, serviceId, date, and time.",
      });
    }

    const expirationTime = new Date(Date.now() + RESERVATION_DURATION_MS);

    // 1. Пробуем создать запись в CartReservation
    const reservation = await prisma.cartReservation.create({
      data: {
        masterId: parseInt(masterId),
        serviceId: parseInt(serviceId),
        date: new Date(date),
        time: time,
        reservedByUserId: clientUserId,
        expiresAt: expirationTime,
      },
    });

    res.status(201).json({
      message: "Slot successfully reserved.",
      reservation,
      // Передаем expiresAt обратно на фронтенд для информации
      expiresAt: expirationTime.toISOString(),
    });
  } catch (error) {
    if (error.code === "P2002") {
      // Этот код означает, что masterId, date, и time уже существуют в CartReservation
      return res
        .status(409)
        .json({ message: "This slot is already reserved by another user." });
    }

    console.error("Error creating reservation:", error);
    res.status(500).json({ message: "Failed to reserve slot." });
  }
};

const removeSlotReservation = async (req, res) => {
  const clientUserId = req.user.userId;
  try {
    const { masterId, date, time } = req.body;

    if (!masterId || !date || !time) {
      return res.status(400).json({
        message: "Missing required fields: masterId, date, and time.",
      });
    }

    const deleteResult = await prisma.cartReservation.deleteMany({
      where: {
        masterId: parseInt(masterId),
        date: new Date(date),
        time: time,
        reservedByUserId: clientUserId,
      },
    });

    if (deleteResult.count === 0) {
      return res
        .status(404)
        .json({ message: "Active reservation not found for this user/slot." });
    }

    res.status(200).json({
      message: "Slot reservation removed successfully.",
      count: deleteResult.count,
    });
  } catch (error) {
    console.error("Error removing reservation:", error);
    res.status(500).json({ message: "Failed to unreserve slot." });
  }
};
module.exports = {
  getAllServices,
  getServiceAvailability,
  createSlotReservation,
  removeSlotReservation,
};
