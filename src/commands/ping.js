const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and bot latency!'),
  async execute(interaction) {
    // Send a reply and measure the time difference
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply(`👀 Pong!\nBot Latency: **${latency}ms**`);
  },
};
