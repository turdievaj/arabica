const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timer')
        .setDescription('Start a simple group timer')
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('Timer length in minutes (1–360)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(360)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const minutes = interaction.options.getInteger('minutes');
            const endTime = Date.now() + (minutes * 60 * 1000);

            // 1. Send join message and collect users
            const joinEmbed = new EmbedBuilder()
                .setTitle('🫧 Timer Starting!')
                .setDescription(`Click **Join Timer** to participate!\nTimer: **${minutes} minutes**\n_You have 30 seconds to join!_`)
                .setColor('#1900ff')
                .setTimestamp();

            const joinButton = new ButtonBuilder()
                .setCustomId('join_timer')
                .setLabel('Join Timer')
                .setStyle(ButtonStyle.Primary);

            const joinRow = new ActionRowBuilder()
                .addComponents(joinButton);

            const response = await interaction.editReply({
                embeds: [joinEmbed],
                components: [joinRow]
            });

            // Collect users who click the button
            const users = new Set([interaction.user.id]); // Add command user automatically

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 // 30 seconds
            });

            collector.on('collect', async (i) => {
                if (users.has(i.user.id)) {
                    await i.reply({
                        content: 'You have already joined this timer!',
                        ephemeral: true
                    });
                    return;
                }

                users.add(i.user.id);
                await i.reply({
                    content: 'You have joined the timer!',
                    ephemeral: true
                });
            });

            // Wait for collection period to end
            await wait(30000);
            collector.stop();

            // Update embed to show timer has started
            const participants = Array.from(users).map(id => `<@${id}>`).join(', ') || 'No participants';

            const timerEmbed = new EmbedBuilder()
                .setTitle('🫧 Timer Running!')
                .setDescription(`Timer: **${minutes} minutes**\nEnds: <t:${Math.floor(endTime / 1000)}:R>\nParticipants: ${participants}`)
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.editReply({
                embeds: [timerEmbed],
                components: [] // Remove the join button
            });

            // Wait for timer to complete
            await wait(minutes * 60 * 1000);

            // Send completion message (with pings in content)
            const completionEmbed = new EmbedBuilder()
                .setTitle('🫧 Timer Complete!')
                .setDescription(`Time's up!`)
                .setColor('#ff0000')
                .setTimestamp();

            await interaction.channel.send({
                content: participants, // This will ping everyone
                embeds: [completionEmbed]
            });

        } catch (error) {
            console.error('Timer command error:', error);
            try {
                const errorMessage = 'There was an error running the timer command!';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    }
};
