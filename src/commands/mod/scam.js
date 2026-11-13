const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'scam',
    async execute(message, args, client, tools = {}) {
        const { hasStaffRole, noPermissionResponses, scamMutedUsers } = tools;
        console.log('[scam] tools keys:', Object.keys(tools));
        console.log('[scam] scamMutedUsers is:', scamMutedUsers ? 'OK' : 'UNDEFINED');

        try { await message.delete().catch(() => {}); } catch {}

        if (!hasStaffRole(message.member)) {
            const randomResponse = noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)];
            return message.channel.send(randomResponse).catch(() => {});
        }

        if (!args[0]) {
            return message.channel.send('Please provide a user ID or mention! Usage: `a!scam [@user/userID] [optional duration in hours]`');
        }

        try {
            const targetUserId = args[0].match(/^<@!?(\d+)>$/)?.[1] || args[0];
            let targetMember;
            try {
                targetMember = await message.guild.members.fetch(targetUserId);
            } catch {
                return message.channel.send('Could not find that user in this server!');
            }

            const botMember = message.guild.members.me;
            if (!botMember.permissions.has(['ManageRoles', 'ManageMessages'])) {
                return message.channel.send('I need Manage Roles and Manage Messages permissions!');
            }
            if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
                return message.channel.send("I can't moderate this user due to role hierarchy!");
            }
            if (targetMember.id === message.guild.ownerId || targetMember.id === message.author.id) {
                return message.channel.send("Cannot moderate this user!");
            }

            const duration = !isNaN(args[1]) ? Math.min(parseInt(args[1]), 24) : 24;
            const reason = args.slice(isNaN(args[1]) ? 1 : 2).join(' ') || 'Scam Muted';

            let muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
            if (!muteRole) {
                muteRole = await message.guild.roles.create({
                    name: 'Muted',
                    color: '#808080',
                    reason: 'Auto-created for muting members',
                    permissions: []
                });
                await Promise.all(message.guild.channels.cache.map(channel =>
                    channel.permissionOverwrites.create(muteRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Speak: false,
                        Stream: false
                    }).catch(() => {})
                ));
            }

            const key = `${message.guild.id}-${targetMember.id}`;
            const previousRoles = targetMember.roles.cache
                .filter(r => r.id !== message.guild.id && r.id !== muteRole.id)
                .map(r => r.id);
            scamMutedUsers.set(key, previousRoles);

            const rolesToRemove = targetMember.roles.cache
                .filter(r => r.id !== message.guild.id && r.id !== muteRole.id);
            if (rolesToRemove.size > 0) await targetMember.roles.remove(rolesToRemove);
            await targetMember.roles.add(muteRole);

            // ── Message deletion (all accessible text channels, up to 14 days) ──
            let totalDeleted = 0;
            const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

	    const channelsToCheck = [
	    ...message.guild.channels.cache.filter(channel =>
	        channel.isTextBased() &&
	        !channel.isDMBased() &&
	        !/log|ticket/i.test(channel.name)
		    ).values()
		];

            for (const channel of channelsToCheck) {
                const channelPermissions = channel.permissionsFor(botMember);

                if (!channelPermissions?.has('ManageMessages')) {
                    console.log(`[scam] Skipping #${channel.name}: missing Manage Messages permission.`);
                    continue;
                }

                try {
                    let lastId;
                    let keepFetching = true;

                    while (keepFetching) {
                        const fetchOptions = { limit: 100 };
                        if (lastId) fetchOptions.before = lastId;

                        const fetched = await channel.messages.fetch(fetchOptions);

                        if (!fetched.size) break;

                        const now = Date.now();

                        const matchingMessages = fetched.filter(msg =>
                            msg.author?.id === targetUserId
                        );

                        const recentMessages = matchingMessages.filter(msg =>
                            now - msg.createdTimestamp < FOURTEEN_DAYS_MS
                        );

                        const oldMessages = matchingMessages.filter(msg =>
                            now - msg.createdTimestamp >= FOURTEEN_DAYS_MS
                        );

                        console.log(
                            `[scam] #${channel.name}: checked ${fetched.size}, ` +
                            `found ${matchingMessages.size} from target, ` +
                            `${recentMessages.size} recent, ${oldMessages.size} older than 14 days.`
                        );

                        if (recentMessages.size >= 2) {
                            const deleted = await channel.bulkDelete(recentMessages, true);
                            totalDeleted += deleted.size;
                        } else if (recentMessages.size === 1) {
                            const oneMessage = recentMessages.first();
                            await oneMessage.delete();
                            totalDeleted++;
                        }

                        for (const oldMessage of oldMessages.values()) {
                            await oldMessage.delete();
                            totalDeleted++;
                        }

                        lastId = fetched.last()?.id;

                        const oldestMessage = fetched.last();
                        if (
                            !oldestMessage ||
                            Date.now() - oldestMessage.createdTimestamp >= FOURTEEN_DAYS_MS
                        ) {
                            keepFetching = false;
                        }

                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (err) {
                    console.error(
                        `[scam] Could not process #${channel.name} (${channel.id}):`,
                        err
                    );
                }
            }
            // ─────────────────────────────────────────────────────────────────────

            const logEmbed = new EmbedBuilder()
                .setTitle('🛡️ Scam Muted')
                .setColor(0xFF0000)
                .setDescription(
                    `**Target:** ${targetMember.user.tag} (${targetMember.id})\n` +
                    `**Action:** ${duration}-hour mute\n` +
                    `**Reason:** ${reason}\n` +
                    `**Messages Deleted:** ${totalDeleted}`
                )
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await message.channel.send({ embeds: [logEmbed] });

            try {
                await targetMember.send({
                    content: `You have been muted in **${message.guild.name}** for ${duration} hours.\nReason: ${reason}\n\nPlease do not share scam links.`
                });
            } catch {}

            const modLogChannel = message.guild.channels.cache.find(
                ch => ch.name === 'mod-log' || ch.name === 'mod-logs'
            );
            if (modLogChannel?.permissionsFor(botMember)?.has('SendMessages')) {
                await modLogChannel.send({ embeds: [logEmbed] });
            }

            // ── Auto-unmute after duration ────────────────────────────────────
            setTimeout(async () => {
                try {
                    const refreshed = await message.guild.members.fetch(targetMember.id);
                    if (refreshed?.roles.cache.has(muteRole.id)) {
                        await refreshed.roles.remove(muteRole);

                        const savedRoles = scamMutedUsers.get(key);
                        if (savedRoles?.length) {
                            await refreshed.roles.add(savedRoles).catch(() => {});
                        }
                        scamMutedUsers.delete(key);

                        const unmuteEmbed = new EmbedBuilder()
                            .setTitle('🔓 User Auto-Unmuted')
                            .setColor(0x00FF00)
                            .setDescription(
                                `**User:** ${targetMember.user.tag} (${targetMember.id})\n` +
                                `**Action:** Automatic unmute after ${duration} hours\n` +
                                `**Roles Restored:** ${savedRoles?.length ?? 0}`
                            )
                            .setTimestamp();

                        if (modLogChannel?.permissionsFor(botMember)?.has('SendMessages')) {
                            await modLogChannel.send({ embeds: [unmuteEmbed] });
                        }
                    }
                } catch (err) {
                    if (err.code === 10007) {
                        console.log('[scam] Auto-unmute skipped: user no longer in server.');
                        scamMutedUsers.delete(key);
                    } else {
                        console.error('[scam] Auto-unmute error:', err);
                    }
                }
            }, duration * 60 * 60 * 1000);
            // ─────────────────────────────────────────────────────────────────

        } catch (error) {
            console.error('Scam command error:', error);
            return message.channel.send('An error occurred while executing the command.');
        }
    }
};
