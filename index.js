const express = require('express');
const serviceRouter = require('./routes/serviceRoutes.js'); 

const app = express();
const port = 3000;

app.use(express.json());


app.get('/', (req, res) => {
    res.json({ message: 'Barber API запущен. Перейдите на /services для работы.' });
});


app.use('/services', serviceRouter); 


app.listen(port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
});