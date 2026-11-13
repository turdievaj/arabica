module.exports = {
    name: 'remove',
    aliases: ['delcase'],
    async execute(message, args, client, tools) {
        const { hasStaffRole, NO_PERMISSION_MESSAGE, punishmentLogs } = tools;

        if (!hasStaffRole(message.member)) return message.channel.send(NO_PERMISSION_MESSAGE);

        const caseId = parseInt(args[0]);
        if (isNaN(caseId)) return message.channel.send("❌ Please provide a valid Case ID. Usage: `a!remove 5`");

        let found = false;
        for (const [userId, logs] of punishmentLogs.entries()) {
            for (const type of ["warns", "mutes", "bans", "notes"]) {
                const index = logs[type].findIndex(c => c.caseId === caseId);
                if (index !== -1) {
                    logs[type].splice(index, 1);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (found) return message.channel.send(`✅ Case **#${caseId}** has been removed.`);
        else return message.channel.send(`❌ Case **#** not found.`);
    }
};
