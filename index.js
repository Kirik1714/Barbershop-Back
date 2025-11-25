const express = require('express');
const serviceRouter = require('./routes/serviceRoutes.js'); 
const usersRoutes = require('./routes/userRoutes.js')
const orderRoutes = require('./routes/orderRouter.js')
const {authMiddleware}=require('./middleware/authMiddleware.js')


const app = express();
const port = 3000;

require("dotenv").config();


app.use(express.json());



app.use('/services', serviceRouter); 

app.use('/users',usersRoutes);

app.use('/orders',authMiddleware,orderRoutes)


app.listen(port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
});