const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unmute',
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, scamMutedUsers, activeMutes, sendModLog } = tools;
        try { await message.delete(); } catch {}

        if (!hasStaffRole(message.member)) {
            return message.channel.send(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);
        }

        if (!args[0]) return message.channel.send('Usage: `a!unmute <@user/userID>`');

        const targetUserId = args[0].match(/^<@!?(\d+)>$/)?.[1] || args[0];
        let targetMember;
        try {
            targetMember = await message.guild.members.fetch(targetUserId);
        } catch {
            return message.channel.send('Could not find that user in this server!');
        }

        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');

        if (!muteRole) return message.channel.send('There is no Muted role in this server.');
        if (!targetMember.roles.cache.has(muteRole.id)) return message.channel.send('This user is not currently muted!');

        try {
            const key = `${message.guild.id}-${targetMember.id}`;
            const previousRoles = scamMutedUsers.get(key);
            let rolesRestored = false;
            let failedRoles = [];

            // Refresh bot member to get accurate highest role position
            const freshBotMember = await message.guild.members.fetchMe();
            const botHighestRolePos = freshBotMember.roles.highest.position;

            if (previousRoles && previousRoles.length > 0) {
                const rolesToRestore = previousRoles
                    .map(id => message.guild.roles.cache.get(id))
                    .filter(r => {
                        if (!r) return false;                          // role deleted
                        if (r.id === message.guild.id) return false;   // @everyone
                        if (r.managed) {                                // bot/booster/integration role
                            failedRoles.push(r.name);
                            return false;
                        }
                        if (r.position >= botHighestRolePos) {          // hierarchy issue
                            failedRoles.push(r.name);
                            return false;
                        }
                        return true;
                    })
                    .map(r => r.id);

                console.log('Roles attempted to restore:', rolesToRestore);
                console.log('Bot highest role position:', botHighestRolePos);

                try {
                    await targetMember.roles.set(rolesToRestore);
                    rolesRestored = true;
                    scamMutedUsers.delete(key);
                } catch (setErr) {
                    console.error('roles.set failed:', setErr);
                    // Fallback: at least remove the mute role so the user isn't stuck muted
                    await targetMember.roles.remove(muteRole).catch(() => {});
                    return message.channel.send('⚠️ Unmuted, but failed to fully restore roles due to a permissions/hierarchy issue. Check `pm2 logs` for details.');
               }
            } else {
                await targetMember.roles.remove(muteRole);
            }

            if (activeMutes.has(targetMember.id)) {
                clearTimeout(activeMutes.get(targetMember.id).timeoutId);
                activeMutes.delete(targetMember.id);
            }

            let description = `**User:** ${targetMember.user.tag} (${targetMember.id}) has been unmuted.`;
            if (rolesRestored) description += `\n✅ All previous roles have been restored.`;
            if (failedRoles.length > 0) description += `\n⚠️ Could not restore: **${failedRoles.join(', ')}** (role hierarchy or managed role).`;
            if (!rolesRestored && (!previousRoles || previousRoles.length === 0)) description += `\n⚠️ No saved roles found (bot may have restarted).`;

            const embed = new EmbedBuilder()
                .setTitle('🔓 User Unmuted')
                .setColor(0x00FF00)
                .setDescription(description)
                .setFooter({ text: `Unmuted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
            await sendModLog(message.guild, embed);
            await targetMember.send({ embeds: [new EmbedBuilder()
                .setTitle('🔓 You have been unmuted')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Server', value: message.guild.name },
                    { name: 'Unmuted by', value: message.author.tag }
                )
                .setTimestamp()]
            }).catch(() => {});

        } catch (err) {
            console.error('Unmute error:', err);
            return message.channel.send('Failed to unmute. Check `pm2 logs` for details.');
        }
    }
};
