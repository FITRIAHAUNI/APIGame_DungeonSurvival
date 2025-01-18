const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create the logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Configure the logger
const logger = winston.createLogger({
    level: 'info', // Default log level
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamp
        winston.format.json() // Format logs as JSON
    ),
    transports: [
        // Log all levels to a file
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),

        // Log only errors to a separate file
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),

        // Console logging for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Add colors to the console logs
                winston.format.simple() // Simplified console logs
            )
        })
    ]
});

// Export the logger to use it across your application
module.exports = logger;