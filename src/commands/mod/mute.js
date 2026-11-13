const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'mute',
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, scamMutedUsers, addLog, sendModLog } = tools;
        try { await message.delete().catch(() => {}); } catch {}

        if (!hasStaffRole(message.member))
            return message.channel.send(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);

        const targetArg = args[0] ? args[0].replace(/[<@!>]/g, '') : null;
        const target = await message.guild.members.fetch(targetArg).catch(() => null);

        if (!target)
            return message.channel.send("Usage: `a!mute @user/ID [time] [reason]`\nExample: `a!mute @user 30m spamming`")
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        const botMember = message.guild.members.me;

        // Bot hierarchy check
        if (target.roles.highest.position >= botMember.roles.highest.position)
            return message.channel.send("❌ I can't mute this user due to role hierarchy!");

        // Cannot mute the server owner or yourself
        if (target.id === message.guild.ownerId || target.id === message.author.id)
            return message.channel.send("❌ Cannot mute this user!");

        // ✅ NEW: Executor hierarchy check
        // Prevents mods from muting other mods or admins.
        // Admins (higher role position) can still mute mods (lower role position).
        if (target.roles.highest.position >= message.member.roles.highest.position)
            return message.channel.send("❌ You cannot mute someone with an equal or higher role than yours!");

        let durationMs = null;
        let durationStr = "Permanent";
        let reasonIdx = 1;

        if (args[1]) {
            const timeMatch = args[1].match(/^(\d+)([smhd])$/);
            if (timeMatch) {
                const val = parseInt(timeMatch[1]);
                const unit = timeMatch[2];
                durationMs = unit === 'd' ? val * 86400000 :
                             unit === 'h' ? val * 3600000 :
                             unit === 'm' ? val * 60000 : val * 1000;
                durationStr = args[1];
                reasonIdx = 2;
            } else if (!isNaN(args[1])) {
                durationMs = parseInt(args[1]) * 3600000;
                durationStr = `${args[1]}h`;
                reasonIdx = 2;
            }
        }

        const reason = args.slice(reasonIdx).join(' ') || "No reason provided.";
        let muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
        if (!muteRole) return message.channel.send("❌ Muted role not found.");

        const key = `${message.guild.id}-${target.id}`;

        // Exclude managed roles from saved roles (can't restore them anyway)
        const previousRoles = target.roles.cache
            .filter(r => r.id !== message.guild.id && r.id !== muteRole.id && !r.managed)
            .map(r => r.id);
        scamMutedUsers.set(key, previousRoles);

        try {
            // Keep managed roles (e.g. Nitro Booster) when setting mute role
            const managedRoles = target.roles.cache.filter(r => r.managed);
            const newRoles = [muteRole, ...managedRoles.values()];
            await target.roles.set(newRoles);

            addLog(target.id, 'mute', message.author.tag, reason, durationStr);

            const muteEmbed = new EmbedBuilder()
                .setTitle('🔇 User Muted')
                .setColor(0xFF0000)
                .setDescription(`**Target:** ${target.user.tag} (${target.id})`)
                .addFields(
                    { name: '📋 Reason', value: reason },
                    { name: '⏱️ Duration', value: durationStr },
                    { name: '🛡️ Moderator', value: message.author.tag }
                )
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await message.channel.send({ embeds: [muteEmbed] });
            await sendModLog(message.guild, muteEmbed);

            const muteDmEmbed = new EmbedBuilder()
                .setTitle(`🔇 Muted — ${message.guild.name}`)
                .setColor(0xFF0000)
                .addFields(
                    { name: '📋 Reason', value: reason },
                    { name: '⏱️ Duration', value: durationStr }
                )
                .setTimestamp();

            await target.send({ embeds: [muteDmEmbed] }).catch(() => {});

            if (durationMs) {
                setTimeout(async () => {
                    const refreshed = await message.guild.members.fetch(target.id).catch(() => null);
                    if (refreshed && refreshed.roles.cache.has(muteRole.id)) {
                        const savedRoles = scamMutedUsers.get(key) || [];
                        // Preserve managed roles on auto-unmute too
                        const managedOnUnmute = refreshed.roles.cache.filter(r => r.managed).map(r => r.id);
                        await refreshed.roles.set([...savedRoles, ...managedOnUnmute]).catch(() => {});
                        scamMutedUsers.delete(key);
                        await refreshed.send(`🔊 You have been unmuted in **${message.guild.name}**.`).catch(() => {});
                    }
                }, durationMs);
            }

        } catch (err) {
            console.error(err);
            return message.channel.send("❌ Failed to mute user.");
        }
    }
};
