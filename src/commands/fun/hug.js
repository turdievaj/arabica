const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'hug',
  async execute(message, args, client, tools) {
    const { getBalance, addBalance } = tools;

    const COST = 5;

    // ✅ 1. Try to get user from mention OR ID
    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      return message.reply("❌ Usage: `a!hug @user` or `a!hug <userid>`");
    }

    // ✅ 2. Fetch the user object
    const target = await client.users.fetch(targetId).catch(() => null);

    if (!target) {
      return message.reply("❌ I couldn't find that user. Make sure the ID is correct!");
    }

    // ❌ No self hug
    if (target.id === message.author.id) {
      return message.reply("❌ You can't hug yourself 😭");
    }

    const balance = Number(getBalance(message.author.id) || 0);

    if (balance < COST) {
      return message.reply(
        `❌ You need **${COST} coins** to hug.\n💰 Your balance: **${balance.toFixed(2)}**`
      );
    }

    // ✅ Deduct coins
    addBalance(message.author.id, -COST);

    const gifs = [
      "https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif",
      "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif",
      "https://media.giphy.com/media/wnsgren9NtITS/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDFyZzZ2ZHJrNzltYmlqdmFsdzFib2lyM3Y0OWY4dXlnMnNoN3MzdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/EvYHHSntaIl5m/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDFyZzZ2ZHJrNzltYmlqdmFsdzFib2lyM3Y0OWY4dXlnMnNoN3MzdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5OqXb948EBkyUcnwHt/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bWtzMnYwc3kyYjB1NWphYmVrM2dmanAxajVzNGpsMjZmZm5sYzBjeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d9eL06htb5Vks/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emxjYnlqanhrM24ycDZvZGNuNGpjdHd5eG42dTF1N25oNHU1cDAwYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Gf54zTxt2QKru/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emxjYnlqanhrM24ycDZvZGNuNGpjdHd5eG42dTF1N25oNHU1cDAwYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SB5fjrUhAeLte/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OTJoYTdhc2w4bzdiOHB6N3g5bnJrYWowMTMzMG8wdHNkc3c5Nmg5aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/llmZp6fCVb4ju/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YWZ4bmtvMDhqemk5bDY0cWFlaXR6MWRpNDM0MGlrM212cTQ2Z2FiayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1FkCqpyObTuo0/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YWZ4bmtvMDhqemk5bDY0cWFlaXR6MWRpNDM0MGlrM212cTQ2Z2FiayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L1icatkT4ECAg/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aXhkOThvcXk3eHJheDBxMDIxOGE3NHVydXljOWt4dTRleHBicGFhcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8tpiC1JAYVMFq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aXhkOThvcXk3eHJheDBxMDIxOGE3NHVydXljOWt4dTRleHBicGFhcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9Y1LEFKsbbP4hrLgV3/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emdmZ2Z4ZWE5eHhkYndkYWhsODNlODNxNGZxeXJrNm14ZGN3eGlhYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Hp4lpOT1Ns60o/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eWxzOWpsZDhtbng2dGo0MzJtbGtxaWxjNGZuOHcyYmVvaWppdXJwZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/W4yw2uz4YjBbJ6F8Pf/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aThsc3NiM2lrNWQwZXBrMzgwaWZsbTZ3azk5cHJ3OWg1MmJvdWgwciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VhRU9RvKZWKujYXhlJ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OWYwazFlbDZ2ZDduc3FsenhtOXc2NGgxaTdqbXJmOGVkcXcwZnk3NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/anMt435pA9IThaNffU/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OWYwazFlbDZ2ZDduc3FsenhtOXc2NGgxaTdqbXJmOGVkcXcwZnk3NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8KKRIP5ZHUo2k/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dWEyM3FzdGQ4MnNhbHVlN3JqazJicTl4NWcxdm5xaTU0ZHlnOWhoOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QwQZsSRZPs515Zg0WO/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dWEyM3FzdGQ4MnNhbHVlN3JqazJicTl4NWcxdm5xaTU0ZHlnOWhoOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3V0Akmv7LTfIHK6c/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dWEyM3FzdGQ4MnNhbHVlN3JqazJicTl4NWcxdm5xaTU0ZHlnOWhoOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6Zth3OnNv6qDGQ9y/giphy.gif",
      "https://media.giphy.com/media/HaC1WdpkL3W00/giphy.gif",
      "https://media.giphy.com/media/3ZnBrkqoaI2hq/giphy.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const newBalance = balance - COST;

    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .addFields(
        { name: "💸 Used", value: `${COST} coins`, inline: true },
      )
      .setImage(gif)
      .setTimestamp();

    // ✅ Send with content outside the embed
    return message.channel.send({
      content: `🤗 ${message.author} gave a hug to ${target}!`,
      embeds: [embed]
    });
  }
};
