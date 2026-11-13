const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'ban',
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, addLog, sendModLog } = tools;
        
        try { await message.delete().catch(() => {}); } catch {}
        
        if (!hasStaffRole(message.member)) {
            return message.channel.send(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);
        }

        const targetArg = args[0];
        if (!targetArg) return message.channel.send("Usage: `a!ban @user/ID [reason]`");

        const userId = targetArg.replace(/[<@!>]/g, '');
        const botMember = message.guild.members.me;

        if (!botMember.permissions.has('BanMembers')) {
            return message.channel.send("❌ I do not have the **Ban Members** permission!");
        }

        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) return message.channel.send("❌ Invalid User ID.");

            const member = await message.guild.members.fetch(userId).catch(() => null);
            if (member) {
                if (member.roles.highest.position >= botMember.roles.highest.position) {
                    return message.channel.send("❌ I cannot ban this user due to role hierarchy!");
                }
                if (member.id === message.guild.ownerId) {
                    return message.channel.send("❌ I cannot ban the server owner!");
                }
            }

            const reason = args.slice(1).join(' ') || "No reason provided.";

            addLog(user.id, 'ban', message.author.tag, `[HARD-BAN] ${reason}`);

            const appealBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('appeal_ban')
                    .setLabel('📩 Appeal Ban')
                    .setStyle(ButtonStyle.Primary)
            );

            const banDmEmbed = new EmbedBuilder()
                .setTitle(`🔨 Banned from ${message.guild.name}`)
                .setColor(0x000000)
                .setDescription("You have been permanently banned. You may submit an appeal using the button below.")
                .addFields({ name: '📋 Reason', value: reason })
                .setTimestamp();

            await user.send({ embeds: [banDmEmbed], components: [appealBtn] }).catch(() => {});

            await message.guild.members.ban(userId, { 
                reason: `${message.author.tag}: ${reason}`, 
                deleteMessageSeconds: 604800 
            });

            const banConfirmEmbed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setColor(0x000000)
                .setDescription(`**Target:** ${user.tag} (${user.id})`)
                .addFields(
                    { name: '📋 Reason', value: reason },
                    { name: '🛡️ Moderator', value: message.author.tag }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await message.channel.send({ embeds: [banConfirmEmbed] });
            await sendModLog(message.guild, banConfirmEmbed);

        } catch (err) {
            console.error('BAN ERROR:', err);
            return message.channel.send(`❌ Failed to ban the user. Error: \`${err.message}\``);
        }
    }
};
