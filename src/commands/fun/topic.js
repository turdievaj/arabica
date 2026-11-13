const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'topic',
    aliases: ['t'],
	async execute(message, args, client, tools) {
        const { TOPICS_EN } = tools;

        const topic = TOPICS_EN[Math.floor(Math.random() * TOPICS_EN.length)];

        const embed = new EmbedBuilder()
            .setTitle("💬 Discussion Topic")
            .setDescription(topic)
            .setColor(0x5865F2)
            .setFooter({ text: "English Topic" })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};
