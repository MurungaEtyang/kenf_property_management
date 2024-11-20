require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');
const cors = require('cors');

const app = express();

const allowedOrigins = ['http://localhost:3000', 'http://example.com', 'https://anotherdomain.com'];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// Routes for the API
// Example: app.use('/api/users', usersRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'http://localhost';

app.listen(PORT, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
    console.log(`Swagger docs available at ${HOST}:${PORT}/api-docs`);
});