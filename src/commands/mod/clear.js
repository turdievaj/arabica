const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'clear',
    aliases: ['purge'],
    async execute(message, args, client, tools) {
        const { FOURTEEN_DAYS } = tools;
        const invoker = message.member;

        if (!invoker.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
            !invoker.permissions.has(PermissionsBitField.Flags.Administrator) &&
            message.author.id !== message.guild.ownerId) {
            return message.reply('🔒 You do not have permission to clear messages.');
        }

        const me = message.guild.members.me;
        if (!me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('⚠️ I need the Manage Messages permission to delete messages.');
        }

        if (!args.length) {
            return message.reply('Usage: `a!purge <number> [@user] [#channel]`');
        }

        const count = parseInt(args[0], 10);
        if (isNaN(count) || count < 1 || count > 100) {
            return message.reply('Please provide a number between 1 and 100.');
        }

        let userId = null;
        let targetChannel = message.channel;

        for (const arg of args.slice(1)) {
            const userMatch = arg.match(/^<@!?(\d+)>$/);
            const channelMatch = arg.match(/^<#(\d+)>$/);

            if (userMatch) {
                userId = userMatch[1];
            } else if (channelMatch) {
                const fetchedChannel = await message.guild.channels.fetch(channelMatch[1]).catch(() => null);
                if (fetchedChannel && fetchedChannel.isTextBased()) targetChannel = fetchedChannel;
            } else if (/^\d{17,19}$/.test(arg)) {
                const fetchedMember = await message.guild.members.fetch(arg).catch(() => null);
                if (fetchedMember) {
                    userId = arg;
                } else {
                    const fetchedChannel = await message.guild.channels.fetch(arg).catch(() => null);
                    if (fetchedChannel && fetchedChannel.isTextBased()) targetChannel = fetchedChannel;
                }
            }
        }

        try {
            const fetchedMessages = await targetChannel.messages.fetch({ limit: 100 });

            let candidates = [...fetchedMessages.values()];
            if (userId) {
                candidates = candidates.filter(m => m.author.id === userId);
            }

            const toProcess = candidates
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .slice(0, count);

            if (!toProcess.length) {
                return message.reply('No matching messages found.');
            }

            const now = Date.now();
            const recent = [];
            const old = [];

            for (const msg of toProcess) {
                if (now - msg.createdTimestamp < FOURTEEN_DAYS) {
                    recent.push(msg);
                } else {
                    old.push(msg);
                }
            }

            let deletedCount = 0;

            if (recent.length === 1) {
                await recent[0].delete().catch(() => null);
                deletedCount += 1;
            } else if (recent.length > 1) {
                const deleted = await targetChannel.bulkDelete(recent, true).catch(() => null);
                deletedCount += deleted ? deleted.size : 0;
            }

            for (const msg of old) {
                await msg.delete().catch(() => null);
                deletedCount++;
            }

            const summary = userId
                ? `✅ Deleted ${deletedCount} message(s) from <@${userId}> in ${targetChannel}.`
                : `✅ Deleted ${deletedCount} message(s) in ${targetChannel}.`;

            const ack = await message.channel.send(summary);
            setTimeout(() => ack.delete().catch(() => {}), 5000);
        } catch (err) {
            console.error(err);
            return message.reply("❌ Failed to clear messages.");
        }
    }
};
