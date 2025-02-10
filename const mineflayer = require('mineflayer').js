const mineflayer = require('mineflayer');
const axios = require('axios');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const config = require('./config');

const bot = mineflayer.createBot({
    host: config.minecraft.host,
    port: config.minecraft.port,
    username: config.minecraft.username,
    password: config.minecraft.password,
    version: '1.21.4' // Menentukan versi Minecraft
});

bot.loadPlugin(pathfinder);

bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    const args = message.split(' ');
    const command = args[0];

    if (command === 'follow') {
        const target = bot.players[username]?.entity;
        if (target) {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            bot.pathfinder.setMovements(defaultMove);
            bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
            bot.chat(`Following ${username}`);
        } else {
            bot.chat(`I can't see you, ${username}`);
        }
    } else if (command === 'mine') {
        const blockType = args[1];
        const block = bot.findBlock({
            matching: block => block.name === blockType,
            maxDistance: 32
        });
        if (block) {
            bot.dig(block, (err) => {
                if (err) {
                    bot.chat(`Error mining ${blockType}: ${err.message}`);
                } else {
                    bot.chat(`Successfully mined ${blockType}`);
                }
            });
        } else {
            bot.chat(`I can't find any ${blockType} nearby`);
        }
    } else if (command === 'give') {
        const itemType = args[1];
        const item = bot.inventory.items().find(item => item.name === itemType);
        if (item) {
            bot.tossStack(item, (err) => {
                if (err) {
                    bot.chat(`Error giving ${itemType}: ${err.message}`);
                } else {
                    bot.chat(`Gave ${itemType} to ${username}`);
                }
            });
        } else {
            bot.chat(`I don't have any ${itemType}`);
        }
    } else {
        console.log(`Received message from ${username}: ${message}`);
        try {
            const response = await axios.post('https://api.deepseek.ai/v1/analyze', {
                apiKey: config.deepseek.apiKey,
                message: message
            });

            const reply = response.data.reply;
            bot.chat(reply);
        } catch (error) {
            console.error('Error communicating with DeepSeek AI:', error);
        }
    }
});

bot.on('health', () => {
    if (bot.food < 20) {
        const food = bot.inventory.items().find(item => item.name.includes('food'));
        if (food) {
            bot.equip(food, 'hand', (err) => {
                if (err) {
                    console.error('Error equipping food:', err);
                } else {
                    bot.consume((err) => {
                        if (err) {
                            console.error('Error consuming food:', err);
                        }
                    });
                }
            });
        }
    }
});

bot.on('error', (err) => {
    console.error('Bot encountered an error:', err);
});

bot.on('end', () => {
    console.log('Bot disconnected from server');
});
