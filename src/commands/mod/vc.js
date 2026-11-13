const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'vc',
    async execute(message, args, client) {
        const targetId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;

        let member;
        try {
            member = await message.guild.members.fetch(targetId);
        } catch {
            return message.channel.send("Could not find that user.");
        }

        const vc = member.voice.channel;

        if (!vc) {
            return message.channel.send(`❌ <@${targetId}> is not in a voice channel.`);
        }

        const link = `https://discord.com/channels/${message.guild.id}/${vc.id}`;

        const embed = new EmbedBuilder()
            .setTitle(`🔊 ${member.user.tag} is in VC`)
            .setDescription(`**Channel:** ${vc.name}\n[➡️ Join Voice Channel](${link})`)
            .setColor(0x2F3136)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
