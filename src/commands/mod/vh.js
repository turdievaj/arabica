const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

function formatCEST(dateLike) {
  const d = new Date(dateLike);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', // CEST/CET region
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
    name: 'vh',
    aliases: ['voice_history'],
    async execute(message, args, client, tools) {
	const { voiceHistory } = tools;
        const targetId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;

        let targetUser;
        try {
            targetUser = await client.users.fetch(targetId);
        } catch {
            return message.channel.send("Could not find that user.");
        }

        const data = voiceHistory.get(targetId);
        const sessions = data?.sessions || [];
        const current = data?.current || null;

        if (!sessions.length && !current) {
            return message.channel.send(`No voice history found for <@${targetId}>.`);
        }

        const pageSize = 5;
        let page = 0;
        const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));

        const buildEmbed = () => {
            const start = page * pageSize;
            const pageItems = sessions.slice(start, start + pageSize);

            const lines = pageItems.map((s, idx) => {
                return [
                    `**${start + idx + 1}.** 🔊 **${s.channelName || 'Unknown VC'}**`,
                    `Joined: ${formatCEST(s.joinedAt)}`,
                    `Left: ${formatCEST(s.leftAt)}`,
                    `Duration: ${formatDuration(s.durationMs)}`
                ].join('\n');
            });

            const embed = new EmbedBuilder()
                .setTitle(`🎙️ Voice History — ${targetUser.tag}`)
                .setColor(0x2F3136)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(lines.length ? lines.join('\n\n') : 'No past sessions.')
                .setFooter({ text: `Page ${page + 1}/${totalPages}` })
                .setTimestamp();

            if (current) {
                embed.addFields({
                    name: '🟢 Currently in VC',
                    value: `🔊 **${current.channelName}**\nJoined: ${formatCEST(current.joinedAt)}`
                });
            }

            return embed;
        };

        const prevBtn = new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary);
        const nextBtn = new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

        const sent = await message.channel.send({ embeds: [buildEmbed()], components: [row] });

        const collector = sent.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return;

            if (i.customId === 'prev') page = Math.max(0, page - 1);
            if (i.customId === 'next') page = Math.min(totalPages - 1, page + 1);

            await i.update({ embeds: [buildEmbed()], components: [row] });
        });
    }
};
