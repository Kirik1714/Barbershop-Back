const prisma = require("../config/prisma");

// Получение всех услуг
const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { title: "asc" } });
    res.json({ data: services });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Не удалось получить список услуг" });
  }
};

// "HH:MM" → минуты
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// минуты → "HH:MM"
function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Проверка пересечения интервалов
function isOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

// Получение доступных слотов
const getServiceAvailability = async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { masterId, date } = req.query;
    if (!masterId || !date) return res.status(400).json({ error: "Не указан masterId или date" });

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ error: "Услуга не найдена" });

    const master = await prisma.user.findUnique({
      where: { id: parseInt(masterId) },
      include: {
        schedule: { where: { dayOfWeek: new Date(date).getDay() } },
        daysOff: { where: { date: new Date(date) } },
      },
    });

    if (!master || master.schedule.length === 0 || master.daysOff.length > 0) {
      return res.json({ service, slots: [] });
    }

    const schedule = master.schedule[0];
    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime);

    // Апоинтменты мастера на этот день
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: { masterId: master.id, date: { gte: startOfDay, lte: endOfDay } },
      include: { service: true },
    });

    // Интервалы занятых апоинтментов
    const busyIntervals = appointments.map(a => {
      const start = timeToMinutes(a.time);
      const end = start + a.service.durationMinutes;
      return { start, end };
    });

    // Добавим фиктивные границы рабочего дня
    busyIntervals.push({ start: 0, end: scheduleStart });
    busyIntervals.push({ start: scheduleEnd, end: 24 * 60 });

    // Сортируем интервалы по началу
    busyIntervals.sort((a, b) => a.start - b.start);

    const slots = [];

    // Генерируем свободные интервалы между занятыми
    for (let i = 0; i < busyIntervals.length - 1; i++) {
      const freeStart = busyIntervals[i].end;
      const freeEnd = busyIntervals[i + 1].start;

      let current = freeStart;
      while (current + service.durationMinutes <= freeEnd) {
        slots.push(minutesToTime(current));
        current += 1; // шаг 1 минута
      }
    }

    res.json({ service, master: { id: master.id, name: master.name }, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при получении доступного времени" });
  }
};

module.exports = { getAllServices, getServiceAvailability };
