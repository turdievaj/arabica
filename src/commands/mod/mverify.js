module.exports = {
  name: 'mvf',
  aliases: ['mverify'],
  description: 'Toggle the Verified Male role on a user (Moderator or TrialMod only).',
  usage: 'a!mvf <@user|userID>',

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   * @param {object} tools
   */
  async execute(message, args, client, tools) {
    // 1) Permission check
    const allowedRoles = ['Moderator','TrialMod'];
    if (!message.member.roles.cache.some(r=>allowedRoles.includes(r.name))) {
      return message.reply('❌ You need the Moderator or TrialMod role.');
    }

    // 2) Parse target user
    if (!args[0]) {
      return message.reply(`❌ Usage: \`${this.usage}\``);
    }
    const target =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);
    if (!target) {
      return message.reply('❌ Could not find that user.');
    }

    // 3) Lookup the Verified Male role
    const role = message.guild.roles.cache.find(r=>r.name==='Verified Male');
    if (!role) {
      return message.reply('❌ Role "Verified Male" not found.');
    }

    // 4) Toggle the role
    try {
      if (target.roles.cache.has(role.id)) {
        await target.roles.remove(role.id);
        return message.channel.send(`🔻 Removed **${role.name}** from ${target.user.tag}.`);
      } else {
        await target.roles.add(role.id);
        return message.channel.send(`🔺 Added **${role.name}** to ${target.user.tag}.`);
      }
    } catch (err) {
      console.error('mvf error:', err);
      return message.reply('❌ I couldn’t change roles—check my hierarchy/permissions.');
    }
  }
};
