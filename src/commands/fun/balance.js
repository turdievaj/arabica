const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'balance',
  aliases: ['bal', 'coins'],
  async execute(message, args, client, tools) {
    const { getBalance } = tools;

    const target = message.mentions.users.first() || message.author;
    const balance = Number(getBalance(target.id) || 0);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('💰 Balance')
      .setDescription(`**${target.username}** has **${balance.toFixed(2)} coins**`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
