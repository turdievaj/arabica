const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'tickle',
  aliases: ['tick'],
  async execute(message, args, client, tools) {
    const { getBalance, addBalance } = tools || {};

    if (!getBalance || !addBalance) {
      return message.reply('❌ Server configuration error: balance tools not available.');
    }

    const COST = 5;

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      return message.reply("❌ Usage: `a!tickle @user` or `a!tickle <userid>`");
    }

    const target = await client.users.fetch(targetId).catch(() => null);
    if (!target) return message.reply("❌ I couldn't find that user. Make sure the ID is correct!");

    if (target.id === message.author.id) {
      return message.reply("❌ You can't tickle yourself 😭");
    }

    const balance = Number(getBalance(message.author.id) || 0);
    if (balance < COST) {
      return message.reply(`❌ You need **${COST} coins** to tickle.\n💰 Your balance: **${balance.toFixed(2)}**`);
    }

    addBalance(message.author.id, -COST);

    const gifs = [
      'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif',
      'https://media.giphy.com/media/3o7aD0m0YJjX0Qf3qQ/giphy.gif',
      'https://media.giphy.com/media/10BcGXjbHOctnq/giphy.gif',
      'https://media.giphy.com/media/l0MYu5KopQ3Y3kL6A/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHF1eHI0Mm9sY3dlMXdpaG10eXF4Y2F2d2RzZjA5eXQ1MnM5cnRldyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/fQPSEmdUgDjwQOh7Gf/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHF1eHI0Mm9sY3dlMXdpaG10eXF4Y2F2d2RzZjA5eXQ1MnM5cnRldyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7sC5l8ZZKMzXG/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHF1eHI0Mm9sY3dlMXdpaG10eXF4Y2F2d2RzZjA5eXQ1MnM5cnRldyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8vqXA0A60eHOqKhBoR/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHF1eHI0Mm9sY3dlMXdpaG10eXF4Y2F2d2RzZjA5eXQ1MnM5cnRldyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vf5RXzqGIWrZu/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHF1eHI0Mm9sY3dlMXdpaG10eXF4Y2F2d2RzZjA5eXQ1MnM5cnRldyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7528JmqtT7cwzV1S/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWRidXF6MDNmdnhpeG40aGp3ZjFhdG1meGY4aHN0Nmo3dTZhcTMydiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UIIyMCABbnUAg/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWRidXF6MDNmdnhpeG40aGp3ZjFhdG1meGY4aHN0Nmo3dTZhcTMydiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/H2GX5Ik1ILy5q/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWRidXF6MDNmdnhpeG40aGp3ZjFhdG1meGY4aHN0Nmo3dTZhcTMydiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3cc3rSXOxJmEU39FXC/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWRidXF6MDNmdnhpeG40aGp3ZjFhdG1meGY4aHN0Nmo3dTZhcTMydiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jpytLS8rEWvA5ZdFFj/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2tnOXlxMDcwN2t4a25tcXF2bmR4M2Z3dGN5NTFhbXpyNnR5bjg5NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PPWgqvLN6wksIyQ3R9/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2tnOXlxMDcwN2t4a25tcXF2bmR4M2Z3dGN5NTFhbXpyNnR5bjg5NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/sqiUQMk0DGcMg/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2tnOXlxMDcwN2t4a25tcXF2bmR4M2Z3dGN5NTFhbXpyNnR5bjg5NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uok4MNoD0wVUWU54VZ/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dmJnbmR6N244M2Jrd3J4cXljZXN4endqMjlkNHloOW9lcng4aTl1OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6ZtrBkvQwPJVieM8/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NGl2cDBqN3U0Z3AwOGVyaWVleDVvZWQydGZsazFvcWZuZ25ybTVrNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6uHQRFznyuE7u/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aW1nZmVyZG15YnNmdzV2c2lmc3ZmeGpjZ3RscDZwNzVmajFnZnFmZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IaXMQ9QVYOyruiHg8v/giphy.gif'
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const newBalance = Number(getBalance(message.author.id) ?? 0);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .addFields(
        { name: '💸 Used', value: `${COST} coins`, inline: true },
      )
      .setImage(gif)
      .setTimestamp();

    return message.channel.send({
      content: `😄 ${message.author} tickled ${target}!`,
      embeds: [embed]
    });
  }
};
