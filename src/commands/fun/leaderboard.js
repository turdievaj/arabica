const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  async execute(message, args, client, tools) {
    const focusStats = tools.focusStats || {};
    const voiceStats = tools.voiceStats || {};

    const allUserIds = new Set([
      ...Object.keys(focusStats),
      ...Object.keys(voiceStats)
    ]);

    let leaderboardData = Array.from(allUserIds).map(userId => {
      const studySessions = Array.isArray(focusStats[userId]) ? focusStats[userId] : [];
      const studySeconds = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const voiceSeconds = typeof voiceStats[userId] === 'number' ? voiceStats[userId] : 0;

      return {
        userId,
        studyHrs: parseFloat((studySeconds / 3600).toFixed(1)),
        voiceHrs: parseFloat((voiceSeconds / 3600).toFixed(1))
      };
    });

    leaderboardData.sort((a, b) => b.studyHrs - a.studyHrs);

    if (leaderboardData.length === 0) return message.reply("📋 No stats recorded yet!");

    const itemsPerPage = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(leaderboardData.length / itemsPerPage);
    const guild = message.guild;

    // generateEmbed is async because we fetch members/users
    const generateEmbed = async (page) => {
      const start = page * itemsPerPage;
      const currentItems = leaderboardData.slice(start, start + itemsPerPage);

      // Fetch member/user info in parallel
      const rows = await Promise.all(currentItems.map(async (entry, idx) => {
        const userId = entry.userId;
        // Try fetch as GuildMember first
        let member = null;
        try {
          member = await guild.members.fetch(userId).catch(() => null);
        } catch (e) {
          member = null;
        }

        // If not a guild member, try global user fetch
        let user = null;
        if (!member) {
          try {
            user = await client.users.fetch(userId).catch(() => null);
          } catch (e) {
            user = null;
          }
        }

        const rank = start + idx + 1;
        const displayName = member ? member.displayName : (user ? user.tag : 'User Left Server');
        // Mention if still in guild (clickable), otherwise show tag or fallback
        const mentionOrTag = member ? `<@${userId}>` : (user ? user.tag : `<@${userId}>`);
        return `**${rank}.** ${displayName} - ${mentionOrTag}\n└ **${entry.studyHrs}** study hrs | **${entry.voiceHrs}** voice hrs`;
      }));

      const description = rows.join('\n\n') || 'No data on this page.';

      return new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('🏆 Arabica Study Leaderboard')
        .setDescription(description)
        .setFooter({ text: `Page ${page + 1} of ${totalPages}` });
    };

    const getRow = (page) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1)
    );

    // send initial page
    const initialEmbed = await generateEmbed(0);
    const lbMsg = await message.channel.send({ embeds: [initialEmbed], components: [getRow(0)] });

    const collector = lbMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 120_000
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'prev' && currentPage > 0) currentPage--;
      else if (i.customId === 'next' && currentPage < totalPages - 1) currentPage++;

      const embed = await generateEmbed(currentPage);
      await i.update({ embeds: [embed], components: [getRow(currentPage)] });
    });

    collector.on('end', () => {
      lbMsg.edit({ components: [] }).catch(() => {});
    });
  }
};
