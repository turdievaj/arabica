const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'warn',
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, addLog, sendModLog } = tools;
        try { await message.delete(); } catch {}
        if (!hasStaffRole(message.member)) return message.channel.send(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.channel.send("Please provide a valid User ID or Mention. Usage: `a!warn @user [reason]`");
        const reason = args.slice(1).join(' ') || "No reason provided.";

        addLog(target.id, 'warn', message.author.tag, reason);

        const warnDmEmbed = new EmbedBuilder()
            .setTitle(`⚠️ Warning — ${message.guild.name}`)
            .setColor(0xFFA500)
            .addFields(
                { name: '📋 Reason', value: reason },
            )
            .setTimestamp();

        await target.send({ embeds: [warnDmEmbed] }).catch(() => {});

        const warnConfirmEmbed = new EmbedBuilder()
            .setTitle('⚠️ User Warned')
            .setColor(0xFFA500)
            .setDescription(`**Target:** ${target.user.tag} (${target.id})`)
            .addFields(
                { name: '📋 Reason', value: reason },
            )
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await message.channel.send({ embeds: [warnConfirmEmbed] });
        await sendModLog(message.guild, warnConfirmEmbed);
    }
};
