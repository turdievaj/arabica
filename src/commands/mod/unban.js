const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unban',
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, sendModLog } = tools;

        try {
            await message.delete();
        } catch (e) {}

        if (!hasStaffRole(message.member)) {
            return message.channel.send(
                noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]
            );
        }

        const userId = args[0];
        if (!userId || !/^\d{17,19}$/.test(userId)) {
            return message.channel.send("❌ Usage: `a!unban <User_ID>`");
        }

        const botMember = message.guild.members.me;
        if (!botMember.permissions.has('BanMembers')) {
            return message.channel.send("❌ I do not have the **Ban Members** permission!");
        }

        try {
            const reason = args.slice(1).join(' ') || "No reason provided.";
            const user = await client.users.fetch(userId).catch(() => null);

            if (!user) {
                return message.channel.send("❌ Could not find user.");
            }

            // ✅ UNBAN FIRST
            await message.guild.members.unban(userId, `Unbanned by ${message.author.tag}: ${reason}`);

            // ✅ CREATE INVITE
            let invite = null;
            try {
                invite = await message.channel.createInvite({
                    maxAge: 86400,
                    maxUses: 1,
                    unique: true
                });
            } catch (e) {}

            // ✅ DM USER (safe)
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle("🔓 You have been unbanned!")
                    .setColor(0x00FF00)
                    .setDescription(`You can rejoin **${message.guild.name}**.`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Invite', value: invite ? invite.url : 'Ask a staff member.' }
                    )
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log(`❌ Could not DM ${user.tag}: ${err.message}`);
            }

            const embed = new EmbedBuilder()
                .setTitle('🔓 User Unbanned')
                .setColor(0x00FF00)
                .setDescription(`**${user.tag}** (${userId})`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Moderator', value: message.author.tag }
                )
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
            await sendModLog(message.guild, embed);

        } catch (err) {
            console.error("UNBAN ERROR:", err);

            if (err.code === 10026) {
                return message.channel.send("❌ This user is not banned.");
            }

            return message.channel.send(`❌ Error: ${err.message}`);
        }
    }
};
