const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'snipe',
    async execute(message, args, client, tools) {
        const { snipes, hasStaffRole, NO_PERMISSION_MESSAGE } = tools;

        // 1. Check Permissions
        if (!hasStaffRole(message.member)) {
            return message.reply({ content: NO_PERMISSION_MESSAGE });
        }

        let userId = null;
        let limit = 5;

        // 2. Parse Arguments (User and Limit)
        if (args.length > 0) {
            const userArg = args[0];
            const mentionMatch = userArg.match(/<@!?(\d+)>/);
            if (mentionMatch) {
                userId = mentionMatch[1];
            } else if (/^\d+$/.test(userArg)) {
                userId = userArg;
            } else {
                const member = message.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === userArg.toLowerCase() ||
                    m.displayName.toLowerCase() === userArg.toLowerCase()
                );
                if (member) userId = member.id;
            }
            if (args[1]) {
                const parsedLimit = parseInt(args[1]);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    limit = Math.min(parsedLimit, 10);
                }
            }
        }

        // 3. Get Deleted Messages
        let deletedMessages = [];

        if (userId) {
            const allChannelMessages = [];
            message.guild.channels.cache.filter(c => c.type === 0).forEach(channel => {
                const channelSnipes = snipes.get(channel.id) || [];
                const userSnipes = channelSnipes.filter(snipe => (snipe.author?.id || snipe.authorId) === userId);
                allChannelMessages.push(...userSnipes);
            });
            deletedMessages = allChannelMessages.sort((a, b) => b.deletedAt - a.deletedAt).slice(0, limit);
        } else {
            const channelSnipes = snipes.get(message.channel.id) || [];
            deletedMessages = channelSnipes.slice(0, limit);
        }

        if (!deletedMessages.length) {
            return message.reply({
                content: userId ? 'No deleted messages found for this user!' : 'No deleted messages found in this channel!',
                allowedMentions: { repliedUser: true }
            });
        }

        // 4. Build the Embed
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setAuthor({ name: `Command used by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setFooter({ text: `Staff Member: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        if (userId) {
            const user = await client.users.fetch(userId).catch(() => null);
            const username = user?.tag || userId;
            embed.setTitle(`📜 Sniped Messages from ${username}`);
            embed.setDescription(`Showing last ${deletedMessages.length} deleted message(s) across all channels\n\u200b`);
        } else {
            embed.setTitle('📜 Sniped Messages');
            embed.setDescription(`Showing last ${deletedMessages.length} deleted message(s) in this channel\n\u200b`);
        }

        deletedMessages.forEach((msg, index) => {
            const messageContent = msg.content || '[no text content]';
            const authorTag = msg.authorTag || msg.author?.tag || 'Unknown User';
            const channelId = msg.channelId || 'unknown';
            const channelName = channelId !== 'unknown' ? `<#${channelId}>` : 'unknown channel';
            const attachments = msg.attachments || [];
            const attachmentText = attachments.length > 0
                ? '\n' + attachments.filter(att => att?.proxyURL).map(att => `📎 [Attachment](${att.proxyURL})`).join('\n')
                : '';

            if (index > 0) embed.addFields({ name: '\u200b', value: '\u200b' });
            embed.addFields({
                name: `${authorTag} was caught in ${channelName}`,
                value: `${messageContent}${attachmentText}\n*Erased at: ${new Date(msg.deletedAt).toLocaleString()}*\n`
            });

            if (index === 0 && attachments.length > 0 && attachments[0]?.proxyURL) {
                embed.setImage(attachments[0].proxyURL);
            }
        });

        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: true } });
    }
};
