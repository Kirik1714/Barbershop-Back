const prisma = require("../config/prisma");

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
// Конвертация HH:MM → минуты
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// минуты → HH:MM
function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// округление вверх до ближайшего шага (15/30 минут)
function roundUpToStep(mins, step) {
  return Math.ceil(mins / step) * step;
}

const SLOT_STEP = 30; // шаг слотов (30 минут)

// ----------------------------------------------------

const getServiceAvailability = async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const masterId = parseInt(req.query.masterId);
    const date = req.query.date;

    if (!serviceId || !masterId || !date) {
      return res.status(400).json({ error: "Не указан serviceId, masterId или date" });
    }

    // 1) Находим услугу
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });
    if (!service) return res.status(404).json({ error: "Услуга не найдена" });

    // 2) Находим мастера и его расписание
    const day = new Date(date).getDay();

    const master = await prisma.user.findUnique({
      where: { id: masterId },
      include: {
        schedule: { where: { dayOfWeek: day } },
        daysOff: { where: { date: new Date(date) } }
      }
    });

    // Если мастер не работает в этот день или выходной → нет слотов
    if (!master || master.schedule.length === 0 || master.daysOff.length > 0) {
      return res.json({ service, master, slots: [] });
    }

    const schedule = master.schedule[0];
    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime);

    // 3) Получаем апоинтменты мастера за этот день
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);

    const appointments = await prisma.appointment.findMany({
      where: {
        masterId: masterId,
        date: { gte: startOfDay, lte: endOfDay }
      },
      include: { service: true }
    });

    // 4) Строим массив занятых интервалов
    const busy = appointments.map(a => {
      const start = timeToMinutes(a.time);
      const end = start + a.service.durationMinutes;
      return { start, end };
    });

    // Добавляем границы рабочего дня (для поиска дыр)
    busy.push({ start: 0, end: scheduleStart });
    busy.push({ start: scheduleEnd, end: 1440 });

    busy.sort((a, b) => a.start - b.start);

    // 5) Генерируем свободные промежутки
    const freeIntervals = [];
    for (let i = 0; i < busy.length - 1; i++) {
      const freeStart = busy[i].end;
      const freeEnd = busy[i+1].start;

      // свободный интервал внутри рабочего дня
      if (freeEnd > freeStart) {
        freeIntervals.push({ start: freeStart, end: freeEnd });
      }
    }

    // 6) Генерация красивых слотов с шагом SLOT_STEP
    const slots = [];

    freeIntervals.forEach(interval => {
      let current = roundUpToStep(interval.start, SLOT_STEP);

      while (current + service.durationMinutes <= interval.end) {
        slots.push(minutesToTime(current));
        current += SLOT_STEP;
      }
    });

    return res.json({
      service,
      master: { id: master.id, name: master.name },
      slots
    });

  } catch (err) {
    console.error("Ошибка получения слотов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = { getAllServices, getServiceAvailability };
