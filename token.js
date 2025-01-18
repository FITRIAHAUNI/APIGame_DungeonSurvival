const jwt = require('jsonwebtoken');
const logger = require('./logger');

module.exports = { compareToken };

function compareToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.warn('Authorization token missing in request');
        return res.sendStatus(401).send('Authorization token required');
    }

    try {
        const decoded = jwt.verify(token, 'chiikawaaaaaaa');
        const token_name = decoded.player;

        if (req.body.playerId === token_name) {
            logger.info(Token validated successfully for playerId: ${token_name});
            next();
        } else {
            logger.warn(Unauthorized access attempt for playerId: ${req.body.playerId});
            res.status(403).send('Unauthorized');
        }
    } catch (error) {
        logger.error(Token validation failed: ${error.message});
        return res.status(400).send(Token validation error: ${error.message});
    }
}