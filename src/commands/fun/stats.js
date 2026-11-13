const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stats',
    async execute(message, args, client, tools) {
        const { calculateStats, formatTime, getBalance } = tools; // ✅ Added getBalance

        const targetArg = args[0] ? args[0].replace(/[<@!>]/g, '') : message.author.id;
        const targetUser = await client.users.fetch(targetArg).catch(() => null);

        if (!targetUser) return message.channel.send("❌ User not found.");

        const stats = calculateStats(targetUser.id);
        const wallet = getBalance(targetUser.id); // ✅ Get real balance

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 Focus Stats — ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`💰 **Wallet Balance:** ${wallet.toFixed(2)} coins`) // ✅ Show Wallet
            .addFields(
                { name: "🕒 Today", value: `⏱️ ${formatTime(stats.today)}`, inline: true },
                { name: "📅 7 Days", value: `⏱️ ${formatTime(stats.week)}`, inline: true },
                { name: "🏆 Total", value: `⏱️ ${formatTime(stats.total)}`, inline: true }
            )
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};
