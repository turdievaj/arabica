const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../user_stats.json');
const MOTIVATION = [
  "Every study session is a step closer to your dreams!",
  "Consistency beats intensity. Keep showing up!",
  "Your future self will thank you for today.",
  "Progress, not perfection. Keep moving forward!",
  "You are capable of amazing things!"
];

function getMotivation() {
  return MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)];
}

function getStats(userId) {
  if (!fs.existsSync(DATA_FILE)) return { weekly: 0, monthly: 0, allTime: 0, money: 0 };
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const now = new Date();
  const week = `${now.getFullYear()}-W${Math.ceil((now.getDate() - 1 - now.getDay()) / 7) + 1}`;
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const user = data[userId];
  if (!user) return { weekly: 0, monthly: 0, allTime: 0, money: 0 };
  return {
    weekly: user.weekly?.[week] || 0,
    monthly: user.monthly?.[month] || 0,
    allTime: user.allTime || 0,
    money: user.money || 0
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show your study stats and progress!'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const stats = getStats(userId);

    const embed = new EmbedBuilder()
      .setTitle('📊 Your Study Progress')
      .setColor('#00bfff')
      .addFields(
        { name: 'Weekly Hours', value: `${stats.weekly.toFixed(2)} h`, inline: true },
        { name: 'Monthly Hours', value: `${stats.monthly.toFixed(2)} h`, inline: true },
        { name: 'All Time Hours', value: `${stats.allTime.toFixed(2)} h`, inline: true },
        { name: 'Money Collected', value: `$${stats.money}`, inline: true }
      )
      .setFooter({ text: getMotivation() });

    await interaction.reply({ embeds: [embed] });
  }
};
