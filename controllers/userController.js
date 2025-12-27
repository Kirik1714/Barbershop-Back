const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
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

const getMaster = async(req,res)=>{
  try {
    const masters =await prisma.user.findMany({
      where:{role:'MASTER'}
    });
    return res.json({data:masters})
  } catch (error) {
      console.error('Ошибка при получении мастеров:', error);
    
        res.status(500).json({ error: 'Не удалось получить мастеров' });
  }
}
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
    res.status(500).json({ message: "Ошибка при получении данных пользователя" });
  }
};
module.exports = {
  registerUser,
  loginUser,
  getMaster,
  getMe,
};
