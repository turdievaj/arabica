const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'focus',
  aliases: ['study'],
  async execute(message, args, client, tools) {
    const { focusSessions, focusRole, levelRoles, saveFocus, endFocus } = tools;

    if (!focusRole) return message.reply("❌ Focus role is not configured.");
    if (!levelRoles || !Array.isArray(levelRoles)) return message.reply("❌ Level roles are not configured.");

    const key = `${message.guild.id}_${message.author.id}`;
    const hasFocus = message.member.roles.cache.has(focusRole.id);

    if (hasFocus) {
      // Stop focus early
      const session = focusSessions.get(key);
      if (session?.timeoutId) clearTimeout(session.timeoutId);
      await endFocus(message.guild.id, message.author.id, focusRole.id);
      return message.channel.send(`✅ ${message.author}, **Focus Mode** disabled. Your original roles have been restored.`);
    }

    // START FOCUS
    // Find the user's Level Role (check both names and ids)
    const userLevelRole = message.member.roles.cache.find(r =>
      levelRoles.includes(r.name) || levelRoles.includes(r.id)
    );

    if (!userLevelRole) {
      return message.channel.send("❌ You must have one of the level roles (Native, Beginner, etc.) to start focus mode!");
    }

    // Permission / hierarchy quick check
    const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need the Manage Roles permission to do this.");
    }
    const levelRoleObj = message.guild.roles.cache.get(userLevelRole.id);
    if (levelRoleObj && levelRoleObj.position >= botMember.roles.highest.position) {
      return message.reply("❌ I cannot remove the level role because it is higher or equal to my highest role. Move my role higher in the server role list.");
    }
    const focusRoleObj = message.guild.roles.cache.get(focusRole.id);
    if (focusRoleObj && focusRoleObj.position >= botMember.roles.highest.position) {
      return message.reply("❌ I cannot assign the Focus role because it is higher or equal to my highest role.");
    }

    // Snapshot all current roles (except @everyone)
    const currentRoleIds = message.member.roles.cache
      .filter(role => role.id !== message.guild.id)
      .map(role => role.id);

    // Parse duration
    const durationStr = args[0] || '1h';
    const m = durationStr.match(/^(\d+)(s|m|h|d)$/i);
    const n = m ? parseInt(m[1]) : 1;
    const unit = m ? m[2].toLowerCase() : 'h';
    const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
    const durationMs = n * mult;

    try {
      // Remove only the level role, add focus role
      await message.member.roles.remove(userLevelRole.id);
      await message.member.roles.add(focusRole.id);

      // Schedule auto-end
      const timeoutId = setTimeout(() => {
        endFocus(message.guild.id, message.author.id, focusRole.id).catch(err => console.error('endFocus timer error', err));
      }, durationMs);

      // Save in-memory session (we store the full snapshot so endFocus can restore everything)
      focusSessions.set(key, {
        guildId: message.guild.id,
        userId: message.author.id,
        roleIds: currentRoleIds,
        startTime: Date.now(),
        endTime: Date.now() + durationMs,
        timeoutId
      });

      if (typeof saveFocus === 'function') saveFocus();

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("📚 Focus Mode Enabled")
        .setDescription(`${message.author}, your **${userLevelRole.name}** role is hidden while you study.\n⏱️ **Duration:** ${durationStr}`)
        .setFooter({ text: "Type a!focus again to disable" });

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[focus command] error:', err);
      return message.reply("❌ Error swapping roles. Make sure my role is above the level/focus roles and I have Manage Roles permission.");
    }
  }
};
