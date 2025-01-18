const express = require('express');
const InventoryRouter = express.Router();
const logger = require('./logger');
module.exports = InventoryRouter;
const client = require('./database');
const db = client.db('ds_db');
let { compareToken } = require('./token.js');

const getPlayerById = async (playerId) => {
    if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
        logger.error('Invalid player ID format');
        throw new Error("Invalid ID format");
    }
    const player = await db.collection('stats').findOne({ playerId });

    if (!player) {
        logger.warn(Player with ID ${playerId} not found);
        throw new Error("Player not found");
    }
    return player;
};

// GET the players
InventoryRouter.get('/players/inventory', compareToken, async (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        logger.warn('Player ID not provided in request body');
        res.status(400).send('Please enter your playerId');
        return;
    }
    try {
        await getPlayerById(playerId);
        const pipeline = [
            { '$match': { 'playerId': playerId } },
            { '$project': { 'inventory': 1 } }
        ];
        const playerInventory = await db.collection('stats').aggregate(pipeline).toArray();
        logger.info(Inventory fetched for player ID: ${playerId});
        res.status(200).json(playerInventory);
    } catch (error) {
        logger.error(Error fetching inventory for player ID ${playerId}: ${error.message});
        res.status(400).send(error.message);
    }
});

// POST an item to a player's inventory
InventoryRouter.post('/buyinventory', compareToken, async (req, res) => {
    const { playerId, itembuy } = req.body;
    if (!playerId || !itembuy) {
        logger.warn('Missing required fields for buyinventory');
        return res.status(400).send('Missing required fields: playerId and itembuy are required.');
    }
    try {
        await getPlayerById(playerId);
        const player = await db.collection('stats').findOne({ playerId });
        const itemfind = await db.collection('potion').findOne({ item: itembuy });

        if (!itemfind) {
            logger.warn(Item not found: ${itembuy});
            return res.status(404).send('Item not found');
        }

        if (!player.coin) {
            logger.warn(Player ID ${playerId} has no coins);
            return res.status(404).send('You have no coins');
        }

        const coin = player.coin - itemfind.coin;

        if (coin >= 0) {
            await db.collection('stats').updateOne(
                { playerId },
                {
                    $push: {
                        inventory: {
                            item: itemfind.item,
                            health_pts: itemfind.health_pts,
                            attack_action: itemfind.attack_action,
                            evade_action: itemfind.evade_action
                        }
                    },
                    $set: { coin }
                }
            );
            logger.info(Item ${itembuy} purchased by player ID ${playerId}, remaining coins: ${coin});
            const playerbuy = await db.collection('stats').findOne({ playerId });
            res.status(200).json({ playerbuy, message: 'Item added to inventory' });
        } else {
            logger.warn(Player ID ${playerId} has insufficient coins to buy ${itembuy});
            return res.status(404).send('You have insufficient coins');
        }
    } catch (error) {
        logger.error(Error in buyinventory for player ID ${playerId}: ${error.message});
        res.status(500).send('An error occurred');
    }
});

// PATCH to use a potion
InventoryRouter.patch('/usePotion', compareToken, async (req, res) => {
    const { playerId, item } = req.body;
    if (!playerId || !item) {
        logger.warn('Missing required fields for usePotion');
        return res.status(400).send('Missing required fields: playerId and item are required.');
    }
    try {
        const player = await getPlayerById(playerId);
        const potion = player.inventory.find(p => p.item === item);

        if (!potion) {
            logger.warn(Potion ${item} not found in inventory for player ID ${playerId});
            return res.status(404).send('Potion not found');
        }

        const newAttackAction = Math.min(player.attack_action + potion.attack_action, 10);
        const newHealthPts = Math.min(player.health_pts + potion.health_pts, 10);
        const evadePts = Math.min(player.evade_action + potion.evade_action, 5);

        if (player.attack_action <= 10 && player.health_pts <= 10 && player.evade_action <= 10) {
            await db.collection("stats").updateOne(
                { playerId },
                {
                    $set: {
                        attack_action: newAttackAction,
                        health_pts: newHealthPts,
                        evade_action: evadePts
                    },
                    $pull: { inventory: { item } } // Remove the used potion from inventory
                }
            );
            logger.info(Potion ${item} used by player ID ${playerId});
            const result = await db.collection('stats').findOne({ playerId });
            res.status(200).json(result);
        } else {
            logger.warn(Player ID ${playerId} has full stats; potion ${item} not used);
            res.status(400).send("The attack and health is full");
        }
    } catch (error) {
        logger.error(Error using potion for player ID ${playerId}: ${error.message});
        res.status(500).send('An error occurred');
    }
});

// DELETE an item from a player's inventory
InventoryRouter.delete('/delete/inventory', compareToken, async (req, res) => {
    const { playerId, item } = req.body;
    if (!playerId || !item) {
        logger.warn('Missing required fields for delete inventory');
        return res.status(400).send('Missing required fields: playerId and item are required.');
    }
    try {
        const player = await getPlayerById(playerId);
        const result = await db.collection('stats').updateOne(
            { playerId },
            { $pull: { inventory: { item } } }
        );

        if (result.modifiedCount === 0) {
            logger.warn(Item ${item} not found in inventory for player ID ${playerId});
            return res.status(404).send('Item not found');
        }
        logger.info(Item ${item} removed from inventory for player ID ${playerId});
        res.send('Item removed from inventory');
    } catch (error) {
        logger.error(Error deleting item from inventory for player ID ${playerId}: ${error.message});
        res.status(500).send('An error occurred');
    }
});

// GET the items in the shop
InventoryRouter.get('/shop', async (req, res) => {
    const { playerId } = req.body;

    // Validate playerId input
    if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
        logger.warn('Invalid playerId format in /shop request');
        return res.status(400).send('Invalid playerId format');
    }

    try {
        // Check if player exists
        const player = await db.collection('stats').findOne({ playerId });
        if (!player) {
            logger.warn(Player not found with ID: ${playerId});
            return res.status(404).send('Player not found');
        }

        // Fetch items from the shop
        const items = await db.collection('potion').find().toArray();
        logger.info('Shop items fetched successfully');
        res.status(200).send(items);
    } catch (error) {
        logger.error(Error fetching shop items: ${error.message});
        res.status(500).send('An error occurred while fetching shop items');
    }
});