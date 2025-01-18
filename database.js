const { MongoClient, ServerApiVersion } = require('mongodb');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

const uri = "mongodb+srv://ds_dev:ds_devgroupb@clusterds.imsywsc.mongodb.net/?retryWrites=true&w=majority&appName=ClusterDS";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Log MongoDB connection attempts
client.on('serverOpening', () => {
    logger.info('Attempting to connect to MongoDB server.');
});

client.on('serverClosed', () => {
    logger.warn('MongoDB server connection closed.');
});

client.on('topologyOpening', () => {
    logger.info('MongoDB topology initialized.');
});

client.on('topologyClosed', () => {
    logger.error('MongoDB topology closed. Ensure the server is reachable.');
});

// Export the client for use across the app
module.exports = client;