module.exports = {
    name: 'setlanguage',
    aliases: ['sl'],
    async execute(message, args, client, tools) {
        const { hasStaffRole, noPermissionResponses, CHANNEL_LANGUAGE_SETTINGS } = tools;
        
        if (!hasStaffRole(message.member)) {
            return message.reply(noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)]);
        }
        
        const validLanguages = ['msa', 'egyptian', 'levantine', 'gulf', 'darija', 'arabic', 'bilingual', 'multilingual'];
        const language = args[0]?.toLowerCase();
        
        if (!validLanguages.includes(language)) {
            return message.reply(`Invalid language. Choose from: ${validLanguages.join(', ')}`);
        }
        
        CHANNEL_LANGUAGE_SETTINGS[message.channel.id] = { dialect: language, allowEnglish: language !== 'arabic' };
        return message.reply(`✅ This channel's language is now set to: **${language}**`);
    }
};
