const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'atopic',
    aliases: ['at'],
    async execute(message, args, client, tools) {
        const { TOPICS_AR } = tools;

        const topic = TOPICS_AR[Math.floor(Math.random() * TOPICS_AR.length)];

        const embed = new EmbedBuilder()
            .setTitle("💬 موضوع للنقاش")
            .setDescription(topic)
            .setColor(0x00A86B)
            .setFooter({ text: "Arabic Topic" })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};
