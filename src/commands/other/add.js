module.exports = {
  name: 'add',
  aliases: ['give'],
  description: 'Add or remove coins. Usage: a!add @user 100  OR a!take @user 50',
  async execute(message, args, client, tools) {
    const ALLOWED_USER = '781007535267119138';
    if (message.author.id !== ALLOWED_USER) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    if (!tools || typeof tools.getBalance !== 'function' || typeof tools.addBalance !== 'function') {
      return message.reply('❌ Server configuration error: balance tools not available.');
    }

    // Find target: prefer mention, otherwise first arg as ID
    const mentioned = message.mentions.users.first();
    let targetUser = mentioned || null;

    // Determine amount: take the last arg as amount
    const rawAmount = args[args.length - 1];
    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ Please provide a valid positive amount. Example: `a!add @user 100`');
    }

    // If no mention, expect an ID in args[0]
    if (!targetUser) {
      const idArg = args[0];
      if (!idArg) return message.reply('❌ Please mention a user or provide a user ID.');
      targetUser = await message.client.users.fetch(idArg).catch(() => null);
      if (!targetUser) return message.reply('❌ Could not find that user ID.');
    }

    const isAdd = message.content.trim().toLowerCase().startsWith((message.client.prefix || 'a!') + 'add');

    if (isAdd) {
      const newBal = tools.addBalance(targetUser.id, amount);
      return message.reply(`✅ Added **${amount}** coins to <@${targetUser.id}>. New balance: **${newBal}**`);
    } else {
      // take
      const cur = tools.getBalance(targetUser.id);
      if (amount > cur) return message.reply(`❌ <@${targetUser.id}> only has **${cur}** coins.`);
      const newBal = tools.addBalance(targetUser.id, -amount);
      return message.reply(`✅ Removed **${amount}** coins from <@${targetUser.id}>. New balance: **${newBal}**`);
    }
  }
};
