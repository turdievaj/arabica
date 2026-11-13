const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'yeet',
  aliases: ['throw'],
  async execute(message, args, client, tools) {
    const { getBalance, addBalance } = tools || {};

    if (!getBalance || !addBalance) {
      return message.reply('❌ Server configuration error: balance tools not available.');
    }

    const COST = 5;

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      return message.reply("❌ Usage: `a!yeet @user` or `a!yeet <userid>`");
    }

    const target = await client.users.fetch(targetId).catch(() => null);
    if (!target) return message.reply("❌ I couldn't find that user. Make sure the ID is correct!");

    if (target.id === message.author.id) {
      return message.reply("❌ You can't yeet yourself 😭");
    }

    const balance = Number(getBalance(message.author.id) || 0);
    if (balance < COST) {
      return message.reply(`❌ You need **${COST} coins** to yeet.\n💰 Your balance: **${balance.toFixed(2)}**`);
    }

    addBalance(message.author.id, -COST);

    const gifs = [
      'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
      'https://media.giphy.com/media/l2JhLzQmNw8qXv6ew/giphy.gif',
      'https://media.giphy.com/media/3oEdv2w0gE4w1Q3kWw/giphy.gif',
      'https://media.giphy.com/media/xT9DPI6D6nQw2gkq7a/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcng0NGhycjBxY2M4em9keGp3Z2p1bzJ6aG55NW1pYmE0NzJlYzh5MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/87W25wCsdhAkhwsSrX/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcng0NGhycjBxY2M4em9keGp3Z2p1bzJ6aG55NW1pYmE0NzJlYzh5MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VRnt1pl7eseuqia7f6/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcng0NGhycjBxY2M4em9keGp3Z2p1bzJ6aG55NW1pYmE0NzJlYzh5MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gkONMypx1LOzcQq2D8/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2FqNHY0ZnVkcXYzM2thbG5wcTllcjd0MjU2aW02a3VrcTdsMDVmbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hORyIE9QB4mepRYYBn/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2FqNHY0ZnVkcXYzM2thbG5wcTllcjd0MjU2aW02a3VrcTdsMDVmbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/GppTiyige7r5XPxejM/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZXU1amltbHlybXMxMjFtcjlscG50M3dldW1leTkxcTY4cGRhYTNwYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oF2L4AsF50LMROHjhl/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZmpraWczN2huZWlwajI5Ym81bHd1MG43MzdlamxoNnFibnRzM3o4YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/HqjgBAWKl6mf5jvKnt/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3am91Zm5vdWNmNm9zcDExamJnYWszOG9uejZseTdtaTh4MWhmNGw1NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3DPemiBYifyEN3Iajq/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWpsdHU4eWhxaW5samVhZTFoNnlpb2FmanZ3cTdrcGpvdmw1MG13MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QVP7DawXZitKYg3AX5/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWpsdHU4eWhxaW5samVhZTFoNnlpb2FmanZ3cTdrcGpvdmw1MG13MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HFkA6omUyjVYqw8/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NXZucWlzbGpkbjJnOGQ4NXF5MTZlZmR3aWoyeDFhaHB1NmltYWJvNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AAkD76aDnGwEg/giphy.gif'
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const newBalance = Number(getBalance(message.author.id) ?? 0);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .addFields(
        { name: '💸 Used', value: `${COST} coins`, inline: true },
      )
      .setImage(gif)
      .setTimestamp();

    return message.channel.send({
      content: `🚀 ${message.author} yeeted ${target}!`,
      embeds: [embed]
    });
  }
};
