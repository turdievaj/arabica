const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'List all available commands',
    async execute(message, args, client, tools) {
        const { PREFIX } = tools;

        // 📊 UTILITY & FUN COMMANDS
        const utilityCommands = [
            `ping — Check bot latency`,
            `uptime — Show bot uptime & stats`,
            `memory — Show memory usage`,
            `ai <question> — Ask the AI assistant`,
            `quran <keyword> — Search the Quran`,
            `topic — Get a random conversation topic`,
            `atopic — Get an Arabic conversation topic`,
            `fun — Shows all fun and game commands`,
            `add @user [amount] — Add coins to user's balance`,
            `take @user [amount] — Remove coins from user's balance`,
            `userinfo @user — Show user info (alias: ui)`
        ];

        // 🛠️ CONFIG COMMANDS
        const configCommands = [
            `setlanguage <lang> — Set channel dialect`,
            `focus — Start a Pomodoro session`,
            `clearai — Reset AI history`,
            `stats — View your focus stats`,
            `afk [message] — Set AFK status`,
            `mod — View moderation commands list`
        ];

        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Arabica Bot Commands')
            .setDescription(`My current prefix is: \`${PREFIX}\` \nUse these commands to interact with me!`)
            .addFields(
                {
                    name: '📊 Utility & Fun',
                    value: utilityCommands.map(cmd => `• \`${PREFIX}${cmd}\``).join('\n') || 'No commands.',
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: configCommands.map(cmd => `• \`${PREFIX}${cmd}\``).join('\n') || 'No commands.',
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
