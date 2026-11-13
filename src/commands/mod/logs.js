const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'logs',
    async execute(message, args, client, tools) {
        const { hasStaffRole, punishmentLogs } = tools;
        if (!hasStaffRole(message.member)) return;
        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) return message.channel.send("Provide a User ID or Mention. Usage: `a!logs @user`");

        let targetUser;
        try {
            targetUser = await client.users.fetch(targetId);
        } catch {
            return message.channel.send("Could not find that user.");
        }

        const data = punishmentLogs.get(targetId) || { warns: [], mutes: [], bans: [], notes: [] };
        if (!data.notes) data.notes = [];

        const format = (arr) => arr.length
        ? arr.map((l) => `**Case # ${l.caseId ?? "?"}** ${l.timestamp}\n   🛡️ Mod: ${l.moderator}\n   📋 Reason: ${l.reason}${l.duration ? `\n   ⏱️ Duration: ${l.duration}` : ''}`).join('\n\n')
            : 'None';

        const logsEmbed = new EmbedBuilder()
            .setTitle(`📋 Mod Logs — ${targetUser.tag}`)
            .setColor(0x2F3136)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: `⚠️ Warnings (${data.warns.length})`, value: format(data.warns).slice(0, 1024) },
                { name: `🔇 Mutes (${data.mutes.length})`, value: format(data.mutes).slice(0, 1024) },
                { name: `🔨 Bans (${data.bans.length})`, value: format(data.bans).slice(0, 1024) },
                { name: `📝 Notes (${data.notes.length})`, value: format(data.notes).slice(0, 1024) }
            )
            .setFooter({ text: `Total: ${data.warns.length + data.mutes.length + data.bans.length + data.notes.length} punishment(s)` })
            .setTimestamp();

        await message.channel.send({ embeds: [logsEmbed] });
    }
};
