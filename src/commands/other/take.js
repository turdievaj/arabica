// /src/commands/other/take.js
module.exports = {
  name: 'take',
  aliases: ['tk', 'subtract'],
  description: 'Remove coins from a user. Usage: a!take @user 100',
  async execute(message, args, client, tools) {
    const ALLOWED_USER = '781007535267119138';

    // Permission check
    if (message.author.id !== ALLOWED_USER) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    // Tools check
    if (!tools || typeof tools.getBalance !== 'function' || typeof tools.addBalance !== 'function') {
      return message.reply('❌ Server error: Balance tools not loaded.');
    }

    // Determine target user (mention preferred, otherwise treat args[0] as ID)
    const mentioned = message.mentions.users.first();
    let targetUser = mentioned || null;

    if (!targetUser) {
      const idArg = args[0];
      if (!idArg) return message.reply('❌ Please mention a user or provide a user ID and amount. Example: `a!take @user 50`');
      targetUser = await client.users.fetch(idArg).catch(() => null);
      if (!targetUser) return message.reply('❌ Could not find a user with that ID.');
    }

    // Determine amount. If mention used, amount is args[1], otherwise args[1] as well.
    const amountArg = mentioned ? args[1] : args[1];
    const amount = parseFloat(amountArg);
    if (!amountArg || isNaN(amount) || amount <= 0) {
      return message.reply('❌ Please provide a valid positive amount. Example: `a!take @user 50`');
    }

    // Get current balance safely
    const currentRaw = tools.getBalance(targetUser.id);
    const current = Number(currentRaw) || 0;

    if (amount > current) {
      return message.reply(`❌ <@${targetUser.id}> only has **${current.toFixed(2)} coins**. You cannot take more than they own.`);
    }

    // Execute the removal
    const newBal = tools.addBalance(targetUser.id, -amount);

    return message.reply(`✅ Removed **${amount.toFixed(2)} coins** from <@${targetUser.id}>. New balance: **${Number(newBal).toFixed(2)}**`);
  }
};
