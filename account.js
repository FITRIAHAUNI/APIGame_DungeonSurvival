const express = require('express');
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For token generation
const logger = require('./logger');
const client = require('./database');

const AccountRouter = express.Router();
const db = client.db('ds_db');

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with a secure key

// Register a new user
AccountRouter.post('/account/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        logger.warn('Registration failed: Missing username or password');
        return res.status(400).send('Username and password are required.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection('users').insertOne({ username, password: hashedPassword });
        logger.info('User registered successfully', { username });
        res.status(201).send('User registered successfully');
    } catch (error) {
        logger.error('Error during user registration', { error: error.message });
        res.status(500).send('An error occurred during registration.');
    }
});

// Login a user
AccountRouter.post('/account/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        logger.warn('Login failed: Missing username or password');
        return res.status(400).send('Username and password are required.');
    }

    try {
        const user = await db.collection('users').findOne({ username });

        if (!user) {
            logger.warn('Login failed: User not found', { username });
            return res.status(404).send('User not found.');
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            logger.warn('Login failed: Incorrect password', { username });
            return res.status(401).send('Incorrect password.');
        }

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        logger.info('User logged in successfully', { username });
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        logger.error('Error during user login', { error: error.message });
        res.status(500).send('An error occurred during login.');
    }
});

// Change password
AccountRouter.patch('/account/changepassword', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
        logger.warn('Password change failed: Missing required fields');
        return res.status(400).send('Username, old password, and new password are required.');
    }

    try {
        const user = await db.collection('users').findOne({ username });

        if (!user) {
            logger.warn('Password change failed: User not found', { username });
            return res.status(404).send('User not found.');
        }

        const match = await bcrypt.compare(oldPassword, user.password);

        if (!match) {
            logger.warn('Password change failed: Incorrect old password', { username });
            return res.status(401).send('Incorrect old password.');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.collection('users').updateOne(
            { username },
            { $set: { password: hashedPassword } }
        );

        logger.info('Password changed successfully', { username });
        res.status(200).send('Password changed successfully.');
    } catch (error) {
        logger.error('Error during password change', { error: error.message });
        res.status(500).send('An error occurred during password change.');
    }
});

// Delete user account
AccountRouter.delete('/account/delete/:username', async (req, res) => {
    const { username } = req.params;

    if (!username) {
        logger.warn('Account deletion failed: Missing username');
        return res.status(400).send('Username is required.');
    }

    try {
        const result = await db.collection('users').deleteOne({ username });

        if (result.deletedCount === 0) {
            logger.warn('Account deletion failed: User not found', { username });
            return res.status(404).send('User not found.');
        }

        logger.info('User account deleted successfully', { username });
        res.status(200).send('Account deleted successfully.');
    } catch (error) {
        logger.error('Error during account deletion', { error: error.message });
        res.status(500).send('An error occurred during account deletion.');
    }
});

module.exports = AccountRouter;