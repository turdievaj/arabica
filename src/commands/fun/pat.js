const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'pat',
  async execute(message, args, client, tools) {
    const { getBalance, addBalance } = tools || {};

    if (!getBalance || !addBalance) {
      return message.reply('❌ Server configuration error: balance tools not available.');
    }

    const COST = 5;

    // 1. Get target id from mention or raw id
    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      return message.reply("❌ Usage: `a!pat @user` or `a!pat <userid>`");
    }

    // 2. Fetch the user object
    const target = await client.users.fetch(targetId).catch(() => null);
    if (!target) {
      return message.reply("❌ I couldn't find that user. Make sure the ID is correct!");
    }

    // No self-pat (mirror hug behavior)
    if (target.id === message.author.id) {
      return message.reply("❌ You can't pat yourself 😭");
    }

    // 3. Check balance
    const balance = Number(getBalance(message.author.id) || 0);
    if (balance < COST) {
      return message.reply(
        `❌ You need **${COST} coins** to pat.\n💰 Your balance: **${balance.toFixed(2)}**`
      );
    }

    // Deduct coins
    addBalance(message.author.id, -COST);

    const gifs = [
      'https://media.giphy.com/media/109ltuoSQT212w/giphy.gif',
      'https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif',
      'https://media.giphy.com/media/L2z7dnOduqEow/giphy.gif',
      'https://media.giphy.com/media/osYdfUptPqV0s/giphy.gif',
      'https://media.giphy.com/media/ye7OTQgwmVuVy/giphy.gif',
      'https://media.giphy.com/media/4HP0ddZnNVvKU/giphy.gif',
      'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif',
      'https://media.giphy.com/media/ObO6p9n7fKq2s/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2E1bnRzNWlxNm16dWo5czBmeGZmenRid3R0ZGV2bmJwN3ZsdTY1ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/C93VmkaYCdRUGie1uG/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2E1bnRzNWlxNm16dWo5czBmeGZmenRid3R0ZGV2bmJwN3ZsdTY1ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gL6eoV6ScTOnk7WfbS/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z2F4bnltN3N5bGdnMDAxb3Awajk2NTlraTBsYWczc3d4bmtiYm12MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/z8Jbx1v6EJzS9sPgc6/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YXZzMnZzNXBkNWY2b2EyeTR3NjFlNGk0MzVsazR4emVmOWVibngweiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xfVgdi4cPXm9rskiTj/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTI0YWtlNm1uaDNyOWsyMnR2dzAwY3c2NzEzbm12NjNqM3o0eDJ3dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/u8Acwgvs5U9kzcj13d/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTI0YWtlNm1uaDNyOWsyMnR2dzAwY3c2NzEzbm12NjNqM3o0eDJ3dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6ML0cdwiWQVhq7SM0w/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTI0YWtlNm1uaDNyOWsyMnR2dzAwY3c2NzEzbm12NjNqM3o0eDJ3dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Ul16jlcdV1B04/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTI0YWtlNm1uaDNyOWsyMnR2dzAwY3c2NzEzbm12NjNqM3o0eDJ3dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/YoSRLcSdmdV29YPsF2/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Yjg1ZHI5NWZ6anc0Ym5xa2Z3bXd4d3VlY3psazk0YXlobGVmeGgwNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ctSPdwHjG8hjrrR973/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb21kZzV2Ymt5NHdjdTRtbWh2ZG5oZ2lwMjNrdXc2dzc2OWoycHRtciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TA6Fq1irTioFO/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb21kZzV2Ymt5NHdjdTRtbWh2ZG5oZ2lwMjNrdXc2dzc2OWoycHRtciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4UkX1kD5cl9M4/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NGtubnNtYm1mbDh2c21pNHRtMWYyMDN3czk0aG11dGN3bWpxdGRsYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3q2SKnzUMdELQkpi/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MXc4bmllYXEzbWIzOXRtbm5lNDFsdnNua2t4aWx3NW5tcXd4eHl4byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ZOJloo7AGj14RBOyeL/giphy.gif'
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const newBalance = Number(getBalance(message.author.id) ?? 0);

    const embed = new EmbedBuilder()
      .setColor(0xffc0cb)
      .addFields(
        { name: '💸 Used', value: `${COST} coins`, inline: true },
      )
      .setImage(gif)
      .setTimestamp();

    return message.channel.send({
      content: `🤍 ${message.author} gave a pat to ${target}!`,
      embeds: [embed]
    });
  }
};
