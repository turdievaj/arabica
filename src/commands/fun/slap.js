const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'slap',
  aliases: ['smack'],
  async execute(message, args, client, tools) {
    const { getBalance, addBalance } = tools || {};

    if (!getBalance || !addBalance) {
      return message.reply('❌ Server configuration error: balance tools not available.');
    }

    const COST = 5;

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      return message.reply("❌ Usage: `a!slap @user` or `a!slap <userid>`");
    }

    const target = await client.users.fetch(targetId).catch(() => null);
    if (!target) return message.reply("❌ I couldn't find that user. Make sure the ID is correct!");

    if (target.id === message.author.id) {
      return message.reply("❌ You can't slap yourself 😭");
    }

    const balance = Number(getBalance(message.author.id) || 0);
    if (balance < COST) {
      return message.reply(`❌ You need **${COST} coins** to slap.\n💰 Your balance: **${balance.toFixed(2)}**`);
    }

    addBalance(message.author.id, -COST);

    const gifs = [
      'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
      'https://media.giphy.com/media/jLeyZWgtwgr2U/giphy.gif',
      'https://media.giphy.com/media/3XlEk2RxPS1m8/giphy.gif',
      'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3l2MWtqNGNhbno5emV0YWs5eG0xMzEzOXpqdjFtdnRjemkwOG8xdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vxvNnIYFcYqEE/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3l2MWtqNGNhbno5emV0YWs5eG0xMzEzOXpqdjFtdnRjemkwOG8xdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/mEtSQlxqBtWWA/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3l2MWtqNGNhbno5emV0YWs5eG0xMzEzOXpqdjFtdnRjemkwOG8xdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9O1AmZt3f4Cup33atQ/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N29pbGEwOWtqZ3F5M3dhOHBvNmVxaDFhZjFram1icGFscWNvNHZ0dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tX9Myr2kUio7Q1JYSs/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N29pbGEwOWtqZ3F5M3dhOHBvNmVxaDFhZjFram1icGFscWNvNHZ0dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Gf3AUz3eBNbTW/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c2F4eGY5bGdzNGp5dXI4bzNyY2pwNXFjemxkaWhzamdnODlnMjV2NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RYOYNPbKoRORepL80E/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c2F4eGY5bGdzNGp5dXI4bzNyY2pwNXFjemxkaWhzamdnODlnMjV2NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3ohfFOrOAW9GaczHc4/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OGZqa2Fyd3kxMm0waG1kNjhnYWd6a2FycWt3ODhucHNidW42ZDNpeCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tJBK7zBAGuJKK0QjAA/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OGZqa2Fyd3kxMm0waG1kNjhnYWd6a2FycWt3ODhucHNidW42ZDNpeCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xbQVno51Apxok/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ajA1ZHRmaW05dDZ1ZmM4dGxneDFlYWFtZjVhMnNnc2ZyM2l2YjR1ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qNtqBSTTwXyuI/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ajA1ZHRmaW05dDZ1ZmM4dGxneDFlYWFtZjVhMnNnc2ZyM2l2YjR1ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/mJWDiMyXuWG8U/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ajByeWZueXB1M2JycWR6YnZoaGYxN3F1dzE0ZnR5cHRzZm04MTk3ZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MdvyuBd0fdGYWmAQ35/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dmFoa21hcWJuem5qcjBqc2RlMGZoM2FnNGFoMmF6NWthcXp0bjFnMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9O1AmZt3f4Cup33atQ/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YTM5dmhpa285NWd0N3hvbXdvY2NtdWQxNGNubG84d2Y2Mnk5cTc1MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uG3lKkAuh53wc/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YTM5dmhpa285NWd0N3hvbXdvY2NtdWQxNGNubG84d2Y2Mnk5cTc1MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/O3ao5CGUL7FK0/giphy.gif'
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const newBalance = Number(getBalance(message.author.id) ?? 0);

    const embed = new EmbedBuilder()
      .setColor(0xff5555)
      .addFields(
        { name: '💸 Used', value: `${COST} coins`, inline: true },
      )
      .setImage(gif)
      .setTimestamp();

    return message.channel.send({
      content: `👋 ${message.author} slapped ${target}!`,
      embeds: [embed]
    });
  }
};
