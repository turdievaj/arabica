module.exports = {
    name: 'ping',
    async execute(message, args, client) {
        return message.reply(`👀 Pong! **${Math.round(client.ws.ping)}ms**`);
    }
};
