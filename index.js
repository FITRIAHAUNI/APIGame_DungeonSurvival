// Import required modules
const express = require('express');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Import routes
let client = require('./database');
const almanacRoute = require('./almanac');
const inventoryRoute = require('./inventory');
const nextActionRoute = require('./next_action');
const registrationRoute = require('./registration');

// Middleware to log requests
app.use((req, res, next) => {
    logger.info({
        message: 'Incoming request',
        method: req.method,
        url: req.url,
        body: req.body
    });
    next();
});

// Use imported routes
app.use(almanacRoute);
app.use(inventoryRoute);
app.use(nextActionRoute);
app.use(registrationRoute);

// Fallback route for unavailable endpoints
let no_endpoint_message = `The endpoint you entered is not available
Here are some endpoints available

account related:
POST - /account/register
POST - /account/forgetuserID
POST - /account/login
GET - /account/(your id)
PATCH - /account/changepassword
DELETE - /account/delete/(your id)

[endpoints below needs token in token bearer. Login to get your token]
[If you are unauthorized, try getting a new token]

inventory and potion related:
GET - /players/inventory
POST - /buyinventory
PATCH - /usePotion
DELETE - /delete/inventory
GET - /shop

gameplay related:
POST - /action
GET - /action
PATCH - /action
DELETE - /action
GET - /stats
GET - /wiki
GET - /leaderboard`;

app.use((req, res) => {
    logger.warn({
        message: 'Invalid endpoint accessed',
        url: req.url
    });
    res.send(no_endpoint_message);
});

// Start the server
app.listen(port, () => {
    logger.info(Example app listening on port ${port});
    console.log(Example app listening on port ${port});
});

// Connect to MongoDB
async function run() {
    try {
        // Connect the client to the server
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        logger.info("Pinged your deployment. You successfully connected to MongoDB!");
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        logger.error({
            message: 'Error connecting to MongoDB',
            error: error.message
        });
        console.error('Error connecting to MongoDB:', error);
    } finally {
        // Uncomment the following line to close the client connection when done
        // await client.close();
    }
}
run().catch((error) => {
    logger.error({
        message: 'Unexpected error in MongoDB connection',
        error: error.message
    });
    console.error(error);
});