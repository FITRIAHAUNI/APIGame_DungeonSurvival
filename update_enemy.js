const logger = require('./logger');
let client = require('./database.js');
let collection_almanac = client.db('ds_db').collection('almanac');
let collection_stats = client.db('ds_db').collection('stats');

module.exports = { update_enemy, randomise_enemy_skill };

async function randomise_enemy() {
    try {
        let enemy_list = await collection_almanac.find().toArray();

        // Making a random index to choose in almanac
        let randomEnemyIndex = Math.floor(Math.random() * enemy_list.length);

        // This is the enemy chosen at random
        let chosenEnemy = enemy_list[randomEnemyIndex];
        logger.info('Random enemy selected', { enemy: chosenEnemy.enemy });

        return chosenEnemy;
    } catch (error) {
        logger.error('Error randomizing enemy', { error: error.message });
        throw error;
    }
}

async function randomise_enemy_skill(enemy_name) {
    try {
        let enemy_current = await collection_almanac.findOne({ enemy: enemy_name });

        if (!enemy_current || !enemy_current.skill || enemy_current.skill.length === 0) {
            logger.warn(No skills found for enemy: ${enemy_name});
            throw new Error('Enemy has no skills available');
        }

        let randomEnemySkillIndex = Math.floor(Math.random() * enemy_current.skill.length);
        let enemy_new_skill = enemy_current.skill[randomEnemySkillIndex];

        logger.info('Random skill selected for enemy', { enemy: enemy_name, skill: enemy_new_skill });

        return enemy_new_skill;
    } catch (error) {
        logger.error('Error randomizing enemy skill', { error: error.message });
        throw error;
    }
}

async function update_enemy(playerId) {
    try {
        let current_enemy = await collection_stats.findOne({ playerId });

        if (!current_enemy) {
            logger.warn(Player not found: ${playerId});
            throw new Error('Player not found');
        }

        let enemy_name;
        let enemy_health;
        let is_alive;

        // Enemy is dead
        if (current_enemy.enemy_current_health <= 0) {
            is_alive = false;

            let how_much = await collection_almanac.findOne({ enemy: current_enemy.current_enemy });

            if (!how_much) {
                logger.warn(Enemy details not found in almanac: ${current_enemy.current_enemy});
                throw new Error('Enemy reward details not found');
            }

            await collection_stats.updateOne(
                { playerId },
                {
                    $inc: {
                        coin: how_much.coin,
                        current_score: how_much.score
                    }
                }
            );

            logger.info('Player rewarded for defeating enemy', { playerId, coin: how_much.coin, score: how_much.score });

            current_enemy = await randomise_enemy();
            enemy_name = current_enemy.enemy;
            enemy_health = current_enemy.base_health;
        } else { // Enemy is still alive
            is_alive = true;
            enemy_name = current_enemy.current_enemy;
            enemy_health = current_enemy.enemy_current_health;
        }

        let enemy_skill = await randomise_enemy_skill(enemy_name);

        await collection_stats.updateOne(
            { playerId },
            {
                $set: {
                    current_enemy: enemy_name,
                    enemy_current_health: enemy_health,
                    enemy_next_move: enemy_skill
                }
            }
        );

        logger.info('Enemy updated', { playerId, enemy: enemy_name, health: enemy_health, nextMove: enemy_skill });

        return is_alive;
    } catch (error) {
        logger.error('Error updating enemy', { playerId, error: error.message });
        throw error;
    }
}