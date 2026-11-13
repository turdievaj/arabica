const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'sban',
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, sendModLog } = tools;

        try { await message.delete().catch(() => {}); } catch {}
        if (!hasStaffRole(message.member)) {
            return message.channel.send(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);
        }

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.channel.send("Usage: `a!sban @user [reason]`");

        const botMember = message.guild.members.me;
        if (target.roles.highest.position >= botMember.roles.highest.position) {
            return message.channel.send("I can't soft-ban this user due to role hierarchy!");
        }
        if (target.id === message.guild.ownerId || target.id === message.author.id) {
            return message.channel.send("Cannot soft-ban this user!");
        }

        const reason = args.slice(1).join(' ') || "No reason provided.";

        const sbanDmEmbed = new EmbedBuilder()
            .setTitle(`👢 Soft-Banned from ${message.guild.name}`)
            .setColor(0xFF6600)
            .setDescription("You have been kicked from the server. You may rejoin using an invite link.")
            .addFields({ name: '📋 Reason', value: reason })
            .setTimestamp();

        await target.send({ embeds: [sbanDmEmbed] }).catch(() => {});
        await target.kick(reason);

        const sbanConfirmEmbed = new EmbedBuilder()
            .setTitle('👢 User Soft-Banned')
            .setColor(0xFF6600)
            .setDescription(`**Target:** ${target.user.tag} (${target.id})`)
            .addFields(
                { name: '📋 Reason', value: reason },
                { name: '🛡️ Moderator', value: message.author.tag }
            )
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await message.channel.send({ embeds: [sbanConfirmEmbed] });
        await sendModLog(message.guild, sbanConfirmEmbed);
    }
};
