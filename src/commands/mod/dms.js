const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'dm',
    async execute(message, args, client, tools) {
        const { hasStaffRole, NO_PERMISSION_MESSAGE } = tools;
        
        if (!message.guild) return;
        if (!message.member || !hasStaffRole(message.member) || !message.member.permissions.has('Administrator')) {
            return message.reply(NO_PERMISSION_MESSAGE);
        }

        let userId = args[0];
        if (!userId) return message.reply('Usage: `a!dm <@user/userID> <message>`');

        const mentionMatch = userId.match(/^<@!?(\d+)>$/);
        if (mentionMatch) userId = mentionMatch[1];
        else if (!/^\d{17,19}$/.test(userId)) return message.reply('❌ Invalid user ID or mention!');

        const dmContent = args.slice(1).join(' ');
        if (!dmContent) return message.reply('Usage: `a!dm <@user/userID> <message>`');

        try {
            const user = await client.users.fetch(userId);
            const dmEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📬 Message from Server Staff')
                .setDescription(dmContent)
                .setFooter({ text: `From: ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });

            await message.reply({ embeds: [new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ DM Sent Successfully')
                .setDescription(`Message delivered to **${user.tag}** (${user.id})`)
                .addFields({ name: '📝 Message', value: dmContent.length > 1024 ? dmContent.slice(0, 1021) + '...' : dmContent })
                .setFooter({ text: `Sent by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp()]
            });
        } catch (err) {
            console.error('DM Error:', err);
            await message.reply({ embeds: [new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Failed to Send DM')
                .setDescription('Could not deliver the message.')
                .addFields({ name: '🔍 Possible Reasons', value: '• User not found\n• DMs disabled\n• User blocked the bot\n• Invalid user ID' })
                .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp()]
            });
        }
    }
};
