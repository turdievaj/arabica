const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'mod',
    description: 'List all available commands',
    async execute(message, args, client, tools) {
        const { PREFIX } = tools;

        const moderationCommands = [
            `scam [user] [time] [reason] — Mute & delete`,
            `mute @user [time] [reason] — Mute user`,
            `unmute @user — Remove mute`,
            `ban @user [reason] — Permanent ban`,
            `unban <ID> [reason] — Unban user`,
            `warn @user [reason] — Give a warning`,
            `logs @user — View mod logs for a user`,
            `clear [amount] — Delete messages`,
            `snipe @user [limit #] — View deleted messages`,
            `remove [case #] — Removes an infraction`,
            `edit [case #] — Edits an infraction`,
            `vh or voice_history @user — Shows voice history`,
            `vc @user — Shows active VC of a user`,
            `dm @user — Bot sends DM to user (admins only)`,
            `userinfo @user — Show user info (alias: ui)`,
            `mvf @user — Assign/remove Verified Male role`,
        ];

        const utilityCommands = [
            `ping — Check bot latency`,
            `uptime — Show bot uptime & stats`,
            `memory — Show memory usage`,
            `userinfo @user — User info (alias: ui)`,
            `ai [message] — Chat with AI`,
            `clearai — Clear your AI conversation history`,
        ];

        const configCommands = [
            `reload <command> — Reload a command (owner only)`,
            `mod — Show this help menu`,
        ];

        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Arabica Bot Commands')
            .setDescription(`My current prefix is: \`${PREFIX}\`\nUse these commands to interact with me!`)
            .addFields(
                {
                    name: '🛡️ Moderation',
                    value: moderationCommands.map(cmd => `• \`${PREFIX}${cmd}\``).join('\n'),
                    inline: false
                },
                {
                    name: '📊 Utility & Fun',
                    value: utilityCommands.map(cmd => `• \`${PREFIX}${cmd}\``).join('\n'),
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: configCommands.map(cmd => `• \`${PREFIX}${cmd}\``).join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await message.reply({ embeds: [helpEmbed] });
    }
};
