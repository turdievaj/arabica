const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'bonk',
  aliases: ['bop'],
  async execute(message, args, client, tools) {
    const { getBalance, addBalance } = tools || {};

    if (!getBalance || !addBalance) {
      return message.reply('❌ Server configuration error: balance tools not available.');
    }

    const COST = 5;

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      return message.reply("❌ Usage: `a!bonk @user` or `a!bonk <userid>`");
    }

    const target = await client.users.fetch(targetId).catch(() => null);
    if (!target) return message.reply("❌ I couldn't find that user. Make sure the ID is correct!");

    if (target.id === message.author.id) {
      return message.reply("❌ You can't bonk yourself 😭");
    }

    const balance = Number(getBalance(message.author.id) || 0);
    if (balance < COST) {
      return message.reply(`❌ You need **${COST} coins** to bonk.\n💰 Your balance: **${balance.toFixed(2)}**`);
    }

    addBalance(message.author.id, -COST);

    const gifs = [
      'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
      'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
      'https://media.giphy.com/media/3o7aD6DZS2vT0mY3s4/giphy.gif',
      'https://media.giphy.com/media/3o6Zt2qk6kX3BdK0qI/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczAydndsOTNnMnVwYnk4bTB3MzhqNHJ5empnNTNzamIwYjFxdW1uaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qs4ll1FSxKnNHeSmom/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczAydndsOTNnMnVwYnk4bTB3MzhqNHJ5empnNTNzamIwYjFxdW1uaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/HmgnQQjEMbMz0oLpqn/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczAydndsOTNnMnVwYnk4bTB3MzhqNHJ5empnNTNzamIwYjFxdW1uaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6To7mnTymkfXlDEZjn/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczAydndsOTNnMnVwYnk4bTB3MzhqNHJ5empnNTNzamIwYjFxdW1uaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/R5LFtvAahcZ6WNBZzD/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MW9qdTZlMjc4bmhzaHgzbmRscWpvNHpmdWZvNG96aWd5ZDF3enhxayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MmW6jzRDCMACKEDkrw/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZnltNXplYnR4ZjEwcDU5cGdxZG4xM2tnNGR5d3R5MHYyN3Ywd3V1dCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5odBqURQ8pIT41NyXn/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3azBhdjN2YnU0dnlubW5iM240NHY3MDhrdGRvMDVrYWZtNmE5ZDJhcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ha19NaRrwDx6uaqB91/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDJweXJ3ZTRsbWRscHB3ZXdlcDM2MGJ4MTN6cjg5dGIyc215MTh1YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/30lxTuJueXE7C/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDJweXJ3ZTRsbWRscHB3ZXdlcDM2MGJ4MTN6cjg5dGIyc215MTh1YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7xV8FFg0ztGsseOTEd/giphy.gif'
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const newBalance = Number(getBalance(message.author.id) ?? 0);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .addFields(
        { name: '💸 Used', value: `${COST} coins`, inline: true },
      )
      .setImage(gif)
      .setTimestamp();

    return message.channel.send({
      content: `🔨 ${message.author} bonked ${target}!`,
      embeds: [embed]
    });
  }
};
