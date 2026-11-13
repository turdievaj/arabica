const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  async execute(message, args) {
    const target =
      message.mentions.members.first() ||
      (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null) ||
      message.member;

    if (!target) return message.reply('❌ User not found.');

    const user = target.user;
    const member = target;

    // Timestamps
    const createdTs = Math.floor(user.createdTimestamp / 1000);
    const joinedTs  = Math.floor(member.joinedTimestamp / 1000);

    // Roles (exclude @everyone, sort by position desc)
    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .join(', ') || 'None';

    // Key permissions
    const KEY_PERMS = [
      ['Administrator',       PermissionsBitField.Flags.Administrator],
      ['Manage Server',       PermissionsBitField.Flags.ManageGuild],
      ['Manage Roles',        PermissionsBitField.Flags.ManageRoles],
      ['Manage Channels',     PermissionsBitField.Flags.ManageChannels],
      ['Manage Messages',     PermissionsBitField.Flags.ManageMessages],
      ['Kick Members',        PermissionsBitField.Flags.KickMembers],
      ['Ban Members',         PermissionsBitField.Flags.BanMembers],
      ['Mention Everyone',    PermissionsBitField.Flags.MentionEveryone],
      ['Mute Members',        PermissionsBitField.Flags.MuteMembers],
      ['Moderate Members',    PermissionsBitField.Flags.ModerateMembers],
    ];

    const perms = KEY_PERMS
      .filter(([, flag]) => member.permissions.has(flag))
      .map(([name]) => `\`${name}\``)
      .join(', ') || 'None';

    // Badges / flags
    const flags = user.flags?.toArray() || [];
    const BADGE_MAP = {
      Staff:                  '👨‍💼 Discord Staff',
      Partner:                '🤝 Partner',
      Hypesquad:              '🏠 HypeSquad Events',
      HypeSquadOnlineHouse1:  '🏠 Bravery',
      HypeSquadOnlineHouse2:  '🏠 Brilliance',
      HypeSquadOnlineHouse3:  '🏠 Balance',
      BugHunterLevel1:        '🐛 Bug Hunter',
      BugHunterLevel2:        '🐛 Bug Hunter Gold',
      VerifiedBotDeveloper:   '🤖 Verified Bot Dev',
      ActiveDeveloper:        '🛠️ Active Developer',
      PremiumEarlySupporter:  '💎 Early Supporter',
    };
    const badges = flags.map(f => BADGE_MAP[f]).filter(Boolean).join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor === '#000000' ? '#5865F2' : member.displayHexColor)
      .setTitle(`${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🪪 User ID',        value: user.id,                                                    inline: true  },
        { name: '🤖 Bot?',           value: user.bot ? 'Yes' : 'No',                                    inline: true  },
        { name: '📛 Nickname',       value: member.nickname || 'None',                                  inline: true  },
        { name: '📅 Account Created', value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`,                 inline: false },
        { name: '📥 Joined Server',  value: `<t:${joinedTs}:D> (<t:${joinedTs}:R>)`,                   inline: false },
        { name: `🎭 Roles [${member.roles.cache.size - 1}]`, value: roles.slice(0, 1024),               inline: false },
        { name: '🔑 Key Permissions', value: perms,                                                     inline: false },
        { name: '🏅 Badges',         value: badges,                                                     inline: false },
      )
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
