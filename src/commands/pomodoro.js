const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType
  } = require('discord.js');
  const fs = require('fs');
  const path = require('path');
  
  const FOCUS_GIFS = [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2sxdjZrMnluc3hkOTRxbzRpejVpN2RzeTBmMXRiN3hpbDF6N25neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JGMaGy5beukJ96I5Xw/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2sxdjZrMnluc3hkOTRxbzRpejVpN2RzeTBmMXRiN3hpbDF6N25neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L5iCpBsEJN3E59BbxU/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2sxdjZrMnluc3hkOTRxbzRpejVpN2RzeTBmMXRiN3hpbDF6N25neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LjR5mG2ANl8Ox3psiN/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2sxdjZrMnluc3hkOTRxbzRpejVpN2RzeTBmMXRiN3hpbDF6N25neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iDvCzaRjNV61J5jtc0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2sxdjZrMnluc3hkOTRxbzRpejVpN2RzeTBmMXRiN3hpbDF6N25neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0Bb7eZa02nGlJUGx1n/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmN1aHYwb2Mwa3NpNW1rNzlxd2l5NGlrYnFqc2JlcnljY2p0YXZzdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6XX4V0O8a0xdS/giphy.gif',
    'https://media.giphy.com/media/HPF6ivflFs7U4/giphy.gif?cid=ecf05e47uzy2h548hfi6ygzc4dh8lszjvzjog0jy6ca28hsn&ep=v1_gifs_search&rid=giphy.gif&ct=g'
  
  ];
  const BREAK_GIFS = [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTByZXRkNTkydGl6cDVsdzJqbDdncmp0ZXM2NXdmdm1tYjZjN2ZpYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lrUOV1Sqijm2GTeKko/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHNzN3JwaXU4NzA2MmpvNDA1bnVqNmNzNWJtNjh5bHE0ODhyZ2Y5ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UA9p3gsYOptsnqIr8A/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHNzN3JwaXU4NzA2MmpvNDA1bnVqNmNzNWJtNjh5bHE0ODhyZ2Y5ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AcpBzqMC5ShJXVroMf/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHNzN3JwaXU4NzA2MmpvNDA1bnVqNmNzNWJtNjh5bHE0ODhyZ2Y5ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7FWD0XDB7C8jZejmMp/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXgwaWp5MzhnZjU2cXJrejBvZmR0YnNma3I3ZzExcnM5MWxjcjQ4MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ZCHVC25Z6EJ48tnKoM/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXgwaWp5MzhnZjU2cXJrejBvZmR0YnNma3I3ZzExcnM5MWxjcjQ4MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/KD8Ldwzx90X9hi9QHW/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXgwaWp5MzhnZjU2cXJrejBvZmR0YnNma3I3ZzExcnM5MWxjcjQ4MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LXADybdRlPlqkjnyBr/giphy.gif'
  ];
  
  const MOTIVATION = [
    "Stay focused, you're doing great! 💪",
    "Keep going, every minute counts! ⏳",
    "Remember your goals! 🌟",
    "You're building your future right now! 🚀",
    "Small steps lead to big results! 🏆",
    "Breathe and believe in yourself! 🌱",
    "Almost there, keep pushing! 🔥",
    "Your effort will pay off! 💡"
  ];
  
  const DATA_FILE = path.join(__dirname, '../user_stats.json');
  
  function getMotivation() {
    return MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)];
  }
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  function updateStats(users) {
    let stats = {};
    if (fs.existsSync(DATA_FILE)) {
      try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        stats = content ? JSON.parse(content) : {};
      } catch (e) {
        stats = {};
      }
    }
    const now = new Date();
    const week = `${now.getFullYear()}-W${Math.ceil((now.getDate() - 1 - now.getDay()) / 7) + 1}`;
    const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
    for (const u of users.values()) {
      if (!stats[u.id]) stats[u.id] = { weekly: {}, monthly: {}, allTime: 0, money: 0 };
      stats[u.id].weekly[week] = (stats[u.id].weekly[week] || 0) + u.seconds / 3600;
      stats[u.id].monthly[month] = (stats[u.id].monthly[month] || 0) + u.seconds / 3600;
      stats[u.id].allTime += u.seconds / 3600;
      stats[u.id].money += Math.floor((u.seconds / 3600) * 60);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(stats, null, 2));
  }
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('pomodoro')
      .setDescription('Start a Pomodoro session with custom focus, break, and cycles!')
      .addIntegerOption(option =>
        option.setName('focus')
          .setDescription('Focus session length (minutes, 1–360)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(360))
      .addIntegerOption(option =>
        option.setName('break')
          .setDescription('Break session length (minutes, 1–360)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(360))
      .addIntegerOption(option =>
        option.setName('cycles')
          .setDescription('Number of cycles (1–10)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10)),
    async execute(interaction) {
      await interaction.deferReply();
  
      let focusMinutes = interaction.options.getInteger('focus');
      let breakMinutes = interaction.options.getInteger('break');
      let cycles = interaction.options.getInteger('cycles');
      let focusSeconds = focusMinutes * 60;
      let breakSeconds = breakMinutes * 60;
  
      // 1. Send join message and collect users for 30 seconds via button
      const joinEmbed = new EmbedBuilder()
        .setTitle('🚦 Pomodoro Session Starting!')
        .setDescription(`Click **Join Session** to participate!\nSession: **${focusMinutes} min focus**, **${breakMinutes} min break**, **${cycles} cycles**.\n_You have 30 seconds to join!_`)
        .setColor('#1900ff');
      const joinRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('join_pomodoro')
          .setLabel('Join Session')
          .setStyle(ButtonStyle.Primary) // BLUE
      );
  
      await interaction.editReply({ embeds: [joinEmbed], components: [joinRow] });
      const joinMsg = await interaction.fetchReply();
  
      // Collect users who click the button
      const users = new Map();
      users.set(interaction.user.id, { id: interaction.user.id, seconds: 0 }); // Always include owner
      const joinCollector = joinMsg.createMessageComponentCollector({ filter: i => i.customId === 'join_pomodoro', time: 30000 });
  
      joinCollector.on('collect', async i => {
        if (!users.has(i.user.id)) {
          users.set(i.user.id, { id: i.user.id, seconds: 0 });
          await i.reply({ content: 'You have joined the Pomodoro session!', flags: 64 });
        } else {
          await i.reply({ content: 'You have already joined!', flags: 64 });
        }
      });
  
      await wait(30000);
      joinCollector.stop();
  
      if (users.size === 0) {
        await interaction.followUp({ content: '❌ No one joined the Pomodoro session.' });
        return;
      }
  
      // Announce participants
      let mentions = Array.from(users.values()).map(u => `<@${u.id}>`).join(' ');
      await interaction.followUp({ content: `**🚦 Pomodoro session is starting!**\n**Participants:** ${mentions}` });
  
      // 2. Pick random GIFs for this session
      const focusGif = FOCUS_GIFS[Math.floor(Math.random() * FOCUS_GIFS.length)];
      const breakGif = BREAK_GIFS[Math.floor(Math.random() * BREAK_GIFS.length)];
  
      // 3. Add Stop, Leave, and Options buttons
      let sessionActive = true;
      let sessionSettings = { focusSeconds, breakSeconds, cycles };
      function getButtonRow() {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('stop_pomodoro')
            .setLabel('Stop Session')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('leave_pomodoro')
            .setLabel('Leave Session')
            .setStyle(ButtonStyle.Primary), // BLUE
          new ButtonBuilder()
            .setCustomId('options_pomodoro')
            .setLabel('Options')
            .setStyle(ButtonStyle.Primary) // BLUE
        );
      }
  
      // Modal handler for options
      interaction.client.on('interactionCreate', async modalInteraction => {
        if (
          modalInteraction.type === InteractionType.ModalSubmit &&
          modalInteraction.customId === 'pomodoro_options_modal' &&
          sessionActive
        ) {
          let newFocus = parseInt(modalInteraction.fields.getTextInputValue('focus'));
          let newBreak = parseInt(modalInteraction.fields.getTextInputValue('break'));
          let newCycles = parseInt(modalInteraction.fields.getTextInputValue('cycles'));
          if (
            isNaN(newFocus) || newFocus < 1 || newFocus > 360 ||
            isNaN(newBreak) || newBreak < 1 || newBreak > 360 ||
            isNaN(newCycles) || newCycles < 1 || newCycles > 10
          ) {
            await modalInteraction.reply({ content: 'Invalid input! Focus/break must be 1-360, cycles 1-10.', flags: 64 });
            return;
          }
          sessionSettings.focusSeconds = newFocus * 60;
          sessionSettings.breakSeconds = newBreak * 60;
          sessionSettings.cycles = newCycles;
          await modalInteraction.reply({ content: `Session settings updated: **${newFocus} min focus**, **${newBreak} min break**, **${newCycles} cycles**.` });
        }
      });
  
      // Pomodoro cycles
      for (let currentCycle = 1; currentCycle <= sessionSettings.cycles && sessionActive; currentCycle++) {
        mentions = Array.from(users.values()).map(u => `<@${u.id}>`).join(' ');
        // Focus session
        let secondsLeft = sessionSettings.focusSeconds;
        let embed = new EmbedBuilder()
          .setTitle(`🔔 Cycle ${currentCycle} / ${sessionSettings.cycles} — Work!`)
          .setColor('#1900ff')
          .setImage(focusGif)
          .setDescription(
            `**Focus Time!**\n${getMotivation()}\n\`\`\`fix\n${formatTime(secondsLeft)}\n\`\`\``
          );
        let timerMsg = await interaction.followUp({ content: mentions, embeds: [embed], components: [getButtonRow()] });
  
        // Collector for this timer message
        const focusCollector = (await timerMsg.fetch()).createMessageComponentCollector({
          filter: i => ['stop_pomodoro', 'leave_pomodoro', 'options_pomodoro'].includes(i.customId),
          time: sessionSettings.focusSeconds * 1000
        });
  
        focusCollector.on('collect', async i => {
          if (i.customId === 'stop_pomodoro') {
            sessionActive = false;
            focusCollector.stop();
            await i.reply({ content: `Session stopped by <@${i.user.id}> for everyone.\n${getMotivation()}\nGood work!` });
          } else if (i.customId === 'leave_pomodoro') {
            if (users.has(i.user.id)) {
              const user = users.get(i.user.id);
              const hours = user.seconds / 3600;
              const money = Math.floor(hours * 60);
              await i.reply({ content: `You left the session early, <@${i.user.id}>!\nTotal time: **${hours.toFixed(2)} hours**\nTotal earned: **$${money}**\n${getMotivation()}\nGood work!` });
              users.delete(i.user.id);
              if (users.size === 0) {
                sessionActive = false;
                focusCollector.stop();
              }
            } else {
              await i.reply({ content: 'You are not part of this session.', flags: 64 });
            }
          } else if (i.customId === 'options_pomodoro') {
            const modal = new ModalBuilder()
              .setCustomId('pomodoro_options_modal')
              .setTitle('Adjust Pomodoro Settings')
              .addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId('focus')
                    .setLabel('Focus time (minutes)')
                    .setStyle(TextInputStyle.Short)
                    .setValue((sessionSettings.focusSeconds / 60).toString())
                    .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId('break')
                    .setLabel('Break time (minutes)')
                    .setStyle(TextInputStyle.Short)
                    .setValue((sessionSettings.breakSeconds / 60).toString())
                    .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId('cycles')
                    .setLabel('Number of cycles')
                    .setStyle(TextInputStyle.Short)
                    .setValue(sessionSettings.cycles.toString())
                    .setRequired(true)
                )
              );
            await i.showModal(modal);
          }
        });
  
        while (secondsLeft > 0 && sessionActive); {
          await wait(10000);
          secondsLeft -= 10;
          if (secondsLeft < 0) secondsLeft = 0;
          users.forEach(u => u.seconds += 10);
          mentions = Array.from(users.values()).map(u => `<@${u.id}>`).join(' ');
          embed.setDescription(
            `**Focus Time!**\n${getMotivation()}\n\`\`\`fix\n${formatTime(secondsLeft)}\n\`\`\``
          );
          await timerMsg.edit({ content: mentions, embeds: [embed], components: [getButtonRow()] });
        }
        focusCollector.stop();
        if (!sessionActive) break;
  
        // Break session
        secondsLeft = sessionSettings.breakSeconds;
        let breakEmbed = new EmbedBuilder()
          .setTitle(`🧃 Cycle ${currentCycle} / ${sessionSettings.cycles} — Break!`)
          .setColor('#1900ff')
          .setImage(breakGif)
          .setDescription(
            `**Break Time!**\nDon't forget to stay hydrated and stretch!\n\`\`\`fix\n${formatTime(secondsLeft)}\n\`\`\``
          );
        let breakMsg = await interaction.followUp({ content: mentions, embeds: [breakEmbed], components: [getButtonRow()] });
  
        // Collector for this break message
        const breakCollector = (await breakMsg.fetch()).createMessageComponentCollector({
          filter: i => ['stop_pomodoro', 'leave_pomodoro', 'options_pomodoro'].includes(i.customId),
          time: sessionSettings.breakSeconds * 1000
        });
  
        breakCollector.on('collect', async i => {
          if (i.customId === 'stop_pomodoro') {
            sessionActive = false;
            breakCollector.stop();
            await i.reply({ content: `Session stopped by <@${i.user.id}> for everyone.\n${getMotivation()}\nGood work!` });
          } else if (i.customId === 'leave_pomodoro') {
            if (users.has(i.user.id)) {
              const user = users.get(i.user.id);
              const hours = user.seconds / 3600;
              const money = Math.floor(hours * 60);
              await i.reply({ content: `You left the session early, <@${i.user.id}>!\nTotal time: **${hours.toFixed(2)} hours**\nTotal earned: **$${money}**\n${getMotivation()}\nGood work!` });
              users.delete(i.user.id);
              if (users.size === 0) {
                sessionActive = false;
                breakCollector.stop();
              }
            } else {
              await i.reply({ content: 'You are not part of this session.', flags: 64 });
            }
          } else if (i.customId === 'options_pomodoro') {
            const modal = new ModalBuilder()
              .setCustomId('pomodoro_options_modal')
              .setTitle('Adjust Pomodoro Settings')
              .addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId('focus')
                    .setLabel('Focus time (minutes)')
                    .setStyle(TextInputStyle.Short)
                    .setValue((sessionSettings.focusSeconds / 60).toString())
                    .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId('break')
                    .setLabel('Break time (minutes)')
                    .setStyle(TextInputStyle.Short)
                    .setValue((sessionSettings.breakSeconds / 60).toString())
                    .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId('cycles')
                    .setLabel('Number of cycles')
                    .setStyle(TextInputStyle.Short)
                    .setValue(sessionSettings.cycles.toString())
                    .setRequired(true)
                )
              );
            await i.showModal(modal);
          }
        });
  
        while (secondsLeft > 0 && sessionActive) {
          await wait(10000);
          secondsLeft -= 10;
          if (secondsLeft < 0) secondsLeft = 0;
          users.forEach(u => u.seconds += 10);
          mentions = Array.from(users.values()).map(u => `<@${u.id}>`).join(' ');
          breakEmbed.setDescription(
            `**Break Time!**\nDon't forget to stay hydrated and stretch!\n\`\`\`fix\n${formatTime(secondsLeft)}\n\`\`\``
          );
          await breakMsg.edit({ content: mentions, embeds: [breakEmbed], components: [getButtonRow()] });
        }
        breakCollector.stop();
        if (!sessionActive) break;
      }
  
      if (!sessionActive) return;
  
      // Show stats for all users at the end
      let results = Array.from(users.values()).map(u => {
        const hours = u.seconds / 3600;
        const money = Math.floor(hours * 60);
        return `<@${u.id}>: **${hours.toFixed(2)} hours**, **$${money}**`;
      }).join('\n');
      await interaction.channel.send({ content: `🥭 **Session complete! Great job!**\n${getMotivation()}\n\n**Results:**\n${results}` });
  
      // Update stats for /info
      updateStats(users);
    }
  };
  