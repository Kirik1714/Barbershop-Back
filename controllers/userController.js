const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const {
  parse,
  format,
  startOfMonth,
  endOfMonth,
  addMinutes,
} = require("date-fns");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "USER",
      },
    });

    // Генерируем токен
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Убираем пароль из объекта перед отправкой
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: "User created",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "The user didn't create" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Убираем пароль из объекта перед отправкой
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userWithoutPassword, // Возвращаем объект пользователя
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
};

const getMaster = async (req, res) => {
  try {
    const masters = await prisma.user.findMany({
      where: { role: "MASTER" },
    });
    return res.json({ data: masters });
  } catch (error) {
    console.error("Ошибка при получении мастеров:", error);

    res.status(500).json({ error: "Не удалось получить мастеров" });
  }
};
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Убираем пароль перед отправкой
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Ошибка при получении данных пользователя" });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: userId,
      },
      include: {
        master: {
          select: {
            name: true,
            photoUrl: true,
          },
        },
        service: {
          select: {
            title: true, // Заменил name на title
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Ошибка при получении записей:", error);
    res.status(500).json({ message: "Не удалось загрузить ваши записи" });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params; // ID записи, которую хотим отменить
    const userId = req.user.userId; // ID пользователя из токена

    // 1. Сначала ищем запись, чтобы проверить, принадлежит ли она этому юзеру
    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
    });

    if (!appointment) {
      return res.status(404).json({ message: "Запись не найдена" });
    }

    // 2. Проверка безопасности: не даем отменить чужую запись
    if (appointment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "У вас нет прав для отмены этой записи" });
    }

    // 3. Обновляем статус
    const updatedAppointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: {
        status: "cancelled", // Меняем статус на "отменено"
      },
    });

    res.status(200).json({
      message: "Запись успешно отменена",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Ошибка при отмене записи:", error);
    res.status(500).json({ message: "Не удалось отменить запись" });
  }
};
const getMasterSchedule = async (req, res) => {
  try {
    const { masterId } = req.params;
    const { month } = req.query;

    if (!month || typeof month !== "string") {
      return res
        .status(400)
        .json({ error: "Параметр month (YYYY-MM) обязателен" });
    }

    // 1. Вычисляем точные границы месяца для БД
    const monthDate = parse(month, "yyyy-MM", new Date());
    const firstDay = startOfMonth(monthDate);
    const lastDay = endOfMonth(monthDate);

    // 2. Параллельно запрашиваем Записи и Брони в корзине (оптимизация скорости)
    const [appointments, reservations] = await Promise.all([
      // Подтвержденные или ожидающие записи
      prisma.appointment.findMany({
        where: {
          masterId: Number(masterId),
          date: { gte: firstDay, lte: lastDay },
          status: { not: "cancelled" }
        },
        include: {
          user: { select: { name: true } },
          service: { select: { title: true, durationMinutes: true } },
        },
      }),
      // Временные резервы из корзины
      prisma.cartReservation.findMany({
        where: {
          masterId: Number(masterId),
          date: { gte: firstDay, lte: lastDay },
          expiresAt: { gte: new Date() }, // Только те, что еще не истекли
        },
        include: {
          service: { select: { title: true, durationMinutes: true } },
        },
      }),
    ]);

    const groupedData = {};

    // Функция-помощник для форматирования в объект
    const addToGroup = (
      date,
      time,
      duration,
      title,
      summary,
      isReservation
    ) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const startStr = `${dateKey} ${time}:00`;

      const startParsed = parse(startStr, "yyyy-MM-dd HH:mm:ss", new Date());
      const endStr = format(
        addMinutes(startParsed, duration),
        "yyyy-MM-dd HH:mm:ss"
      );

      if (!groupedData[dateKey]) groupedData[dateKey] = [];

      groupedData[dateKey].push({
        start: startStr,
        end: endStr,
        title: title,
        summary: summary,
        // Резервы красим в нейтральный цвет, записи — в основной
        color: isReservation ? "#F2F2F2" : "#E6F2FF",
        isReservation, // флаг для фронтенда
      });
    };

    // Обрабатываем основные записи
    appointments.forEach((a) =>
      addToGroup(
        a.date,
        a.time,
        a.service.durationMinutes,
        a.user.name || "Клиент",
        a.service.title,
        false
      )
    );

    // Обрабатываем брони из корзины
    reservations.forEach((r) =>
      addToGroup(
        r.date,
        r.time,
        r.service.durationMinutes,
        "В корзине",
        r.service.title,
        true
      )
    );

    res.json(groupedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMaster,
  getMe,
  getMyAppointments,
  cancelAppointment,
  getMasterSchedule,
};
