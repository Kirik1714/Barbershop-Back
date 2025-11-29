const express = require('express');
const cors = require("cors");

const serviceRouter = require('./routes/serviceRoutes.js'); 
const usersRoutes = require('./routes/userRoutes.js')
const orderRoutes = require('./routes/orderRouter.js')
const {authMiddleware}=require('./middleware/authMiddleware.js')


const app = express();
const port = 3000;
app.use(cors());
require("dotenv").config();


app.use(express.json());

app.use('/uploads', express.static('uploads'));


app.use('/services', serviceRouter); 

app.use('/users',usersRoutes);

app.use('/orders',authMiddleware,orderRoutes)


app.listen(port,"0.0.0.0", () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
});