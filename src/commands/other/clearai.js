module.exports = {
    name: 'clearai',
    async execute(message, args, client, tools) {
        const { conversationHistory } = tools;
        conversationHistory.delete(message.author.id);
        return message.reply("✨ Your conversation history has been cleared!");
    }
};
