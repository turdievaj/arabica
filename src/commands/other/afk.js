module.exports = {
  name: 'afk',
  async execute(message, args) {
    if (!message.client.afkUsers) message.client.afkUsers = new Map();

    const afkMessage = args.join(' ') || 'AFK';

    message.client.afkUsers.set(message.author.id, {
      message: afkMessage,
      since: Date.now()
    });

    const confirmMsg = await message.reply(`💤 You are now AFK: **${afkMessage}**`);
    setTimeout(() => confirmMsg.delete().catch(() => {}), 30000);
  }
};
