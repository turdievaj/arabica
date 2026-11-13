const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'fun',
  aliases: ['games', 'funcommands'],
  async execute(message) {
    // Use single source-of-truth prefix (set in index.js as client.prefix or via env)
    const prefix = message.client?.prefix || process.env.PREFIX || 'a!';

    // ✅ List commands as plain names (no prefix included)
    const funCommands = [
      { name: 'hug', usage: '[@user]', description: 'Hug someone, costs 5 🪙' },
      { name: 'pat', usage: '[@user]', description: 'Pat someone, costs 5 🪙' },
      { name: 'tickle', usage: '[@user]', description: 'Tickle someone, costs 5 🪙' },
      { name: 'slap', usage: '[@user]', description: 'Slap someone, costs 5 🪙' },
      { name: 'yeet', usage: '[@user]', description: 'Yeet someone, costs 5 🪙' },
      { name: 'bonk', usage: '[@user]', description: 'Bonk someone, costs 5 🪙' },
      { name: 'kick', usage: '[@user]', description: 'Kick someone, costs 5 🪙' },
      { name: 'c4', usage: '[@user]', description: 'Play Connect 4 vs a player or bot' },
      { name: 'ttt', usage: '[@user]', description: 'Play Tic Tac Toe vs a player or bot' },
    ];

    const embed = new EmbedBuilder()
      .setTitle('🎮 Fun & Games')
      .setDescription('Here are all the fun commands you can use!')
      .setColor(0x5865F2)
      .setFooter({
        text: `Requested by ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    for (const cmd of funCommands) {
      const usage = cmd.usage ? ` ${cmd.usage}` : '';
      embed.addFields({
        name: `**${prefix}${cmd.name}${usage}**`,
        value: cmd.description,
        inline: false
      });
    }

    await message.channel.send({ embeds: [embed] });
  }
};
