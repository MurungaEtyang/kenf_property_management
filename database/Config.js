const mysql = require('mysql2');
require('dotenv').config();

const Config = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    debug: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
})
Config.connect((err) => {
    if (err) throw err;
    console.log('Database is connected!');
})

export default Config;