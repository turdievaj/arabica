const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ai',
    aliases: ['ask'],
    async execute(message, args, client, tools) {
        const { handleAIResponse, containsProhibitedTopic } = tools;

        if (!args.length) return message.reply('Usage: `a!ai <your question>`');

        const question = args.join(' ');

        if (containsProhibitedTopic(question)) {
            return message.reply({ 
                embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('⚠️ Content Not Allowed').setDescription('I cannot process this type of content.').setTimestamp()] 
            });
        }

        try {
            await message.channel.sendTyping();
            const response = await handleAIResponse(message, question, message.channel.id);
            if (!response) return message.reply('I could not generate a valid response.');

            const maxCharsPerPage = 1000;
            const pages = [];
            let buffer = '';

            for (const line of response.split('\n')) {
                if ((buffer + line + '\n').length > maxCharsPerPage) {
                    if (buffer.trim()) pages.push(buffer.trim());
                    buffer = line + '\n';
                } else {
                    buffer += line + '\n';
                }
            }
            if (buffer.trim()) pages.push(buffer.trim());

            const buildAIPage = (pageIndex) => new EmbedBuilder()
                .setColor(0x0099FF)
                .setAuthor({ name: 'Arabica AI', iconURL: client.user.displayAvatarURL() })
                .addFields(
                    { name: '❓ Question', value: question.length > 1024 ? question.slice(0, 1021) + '...' : question },
                    { name: '💭 Response', value: pages[pageIndex] }
                )
                .setFooter({
                    text: pages.length > 1 ? `Page ${pageIndex + 1}/${pages.length} • Asked by ${message.author.tag}` : `Asked by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();

            let currentPage = 0;
            const replyMsg = await message.reply({ embeds: [buildAIPage(currentPage)] });

            if (pages.length > 1) {
                await replyMsg.react('◀️');
                await replyMsg.react('▶️');

                const collector = replyMsg.createReactionCollector({
                    filter: (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === message.author.id,
                    time: 300000
                });

                collector.on('collect', async (reaction, user) => {
                    if (reaction.emoji.name === '◀️') currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
                    else currentPage = currentPage < pages.length - 1 ? currentPage + 1 : 0;
                    await replyMsg.edit({ embeds: [buildAIPage(currentPage)] });
                    await reaction.users.remove(user.id).catch(() => {});
                });
            }
        } catch (err) {
            console.error('AI Error in a!ai:', err);
            return message.reply('Sorry, I ran into an error while generating a response.');
        }
    }
};
