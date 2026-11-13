module.exports = {
    name: 'edit',
    aliases: ['editcase'],
    async execute(message, args, client, tools) {
        const { hasStaffRole, NO_PERMISSION_MESSAGE, punishmentLogs } = tools;

        if (!hasStaffRole(message.member)) return message.channel.send(NO_PERMISSION_MESSAGE);

        const caseId = parseInt(args[0]);
        const newReason = args.slice(1).join(" ");

        if (isNaN(caseId) || !newReason)
            return message.channel.send("❌ Usage: `a!edit <caseId> <new reason>`");

        let found = false;
        for (const [userId, logs] of punishmentLogs.entries()) {
            for (const type of ["warns", "mutes", "bans", "notes"]) {
                const entry = logs[type].find(c => c.caseId === caseId);
                if (entry) {
                    entry.reason = newReason;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (found) return message.channel.send(`✅ Case **#${caseId}** has been updated.`);
        else return message.channel.send(`❌ Case **#${caseId}** not found.`);
    }
};
