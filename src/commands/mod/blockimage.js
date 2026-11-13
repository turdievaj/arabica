module.exports = {
    name: 'blockimage',
  aliases: ['bi'],
    async execute(message, args, client, tools = {}) {
        const {
            hasStaffRole,
            noPermissionResponses,
            hashAttachment,
            addScamImageHash
        } = tools;

        try {
            if (!hasStaffRole(message.member)) {
                const randomResponse =
                    noPermissionResponses[
                        Math.floor(Math.random() * noPermissionResponses.length)
                    ];

                return message.channel
                    .send(randomResponse)
                    .catch(() => {});
            }

            if (!message.attachments || message.attachments.size === 0) {
                return message.channel.send(
                    '❌ Attach the image to the same message as `a!blockimage`.'
                );
            }

            if (typeof hashAttachment !== 'function') {
                console.error('[blockimage] hashAttachment was not passed to the command.');
                return message.channel.send(
                    '❌ The image-hashing function is not connected in index.js.'
                );
            }

            if (typeof addScamImageHash !== 'function') {
                console.error('[blockimage] addScamImageHash was not passed to the command.');
                return message.channel.send(
                    '❌ The database function is not connected in index.js.'
                );
            }

            let savedCount = 0;

            for (const attachment of message.attachments.values()) {
                const hash = await hashAttachment(attachment.url);

                addScamImageHash(hash, message.author.id);

                console.log(
                    `[blockimage] Saved image hash ${hash} for ${attachment.name || 'attachment'}`
                );

                savedCount++;
            }

            return message.channel.send(
                `✅ Saved ${savedCount} image hash${savedCount === 1 ? '' : 'es'} to the permanent scam block list.`
            );
        } catch (error) {
            console.error('[blockimage] Error:', error);

            return message.channel.send(
                '❌ I could not save that image. Check the PM2 logs for the error.'
            ).catch(() => {});
        }
    }
};
