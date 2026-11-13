const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'wl',
    aliases: ['note'],
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, addLog, sendModLog } = tools;

        try { await message.delete().catch(() => {}); } catch {}

        if (!hasStaffRole(message.member)) {
            return message.channel.send(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);
        }

        const targetId = args[0] ? args[0].replace(/[<@!>]/g, '') : null;
        if (!targetId) {
            return message.channel.send("Usage: `a!wl @user <note>` or `a!note userID <note>`")
                .then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
        }

        const note = args.slice(1).join(' ').trim();
        if (!note) {
            return message.channel.send("❌ Please provide a note.\nExample: `a!wl @user suspicious DMs reported`")
                .then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
        }

        const targetUser = await client.users.fetch(targetId).catch(() => null);

        addLog(targetId, 'note', message.author.tag, note, null);

        const confirmEmbed = new EmbedBuilder()
            .setTitle('📝 Note Added (Watchlist)')
            .setColor(0x5865F2)
            .setDescription(`**Target:** ${targetUser ? `${targetUser.tag}` : 'Unknown User'} (${targetId})`)
            .addFields(
                { name: '🗒️ Note', value: note },
                { name: '🛡️ Moderator', value: message.author.tag }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [confirmEmbed] });
        await sendModLog(message.guild, confirmEmbed);
    }
};
