const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'ttt',
  aliases: ['tictactoe', 'tic_tac_toe'],
  async execute(message) {
    const opponent = message.mentions.users.first() || null;
    const vsBot = !opponent;

    if (opponent && opponent.bot) {
      return message.reply("❌ You can't play against bots. Use `a!ttt` to play vs me.");
    }

    const players = vsBot ? [message.author.id, 'BOT'] : [message.author.id, opponent.id];
    let current = 0; // 0 = X, 1 = O

    const board = Array(9).fill(null);

    const emojis = { x: '❌', o: '⭕', empty: '⬛' };
    const EMPTY_LABEL = '·'; // ✅ must be non-empty

    function renderBoard() {
      let str = "";
      for (let i = 0; i < 9; i++) {
        str += board[i] === null ? emojis.empty : (board[i] === 0 ? emojis.x : emojis.o);
        if ((i + 1) % 3 === 0) str += "\n";
      }
      return str;
    }

    function createButtons(disabled = false) {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;

          const cell = board[idx];
          const label = cell === null ? EMPTY_LABEL : (cell === 0 ? 'X' : 'O');
          const style =
            cell === null ? ButtonStyle.Secondary :
            cell === 0 ? ButtonStyle.Danger :
            ButtonStyle.Primary;

          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`ttt_${idx}`)
              .setLabel(label)
              .setStyle(style)
              .setDisabled(disabled || cell !== null)
          );
        }
        rows.push(row);
      }
      return rows;
    }

    function checkWin(p) {
      const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      return wins.some(combo => combo.every(i => board[i] === p));
    }

    function botMove() {
      const empty = board.map((v, i) => (v === null ? i : null)).filter(v => v !== null);

      // win
      for (const i of empty) {
        board[i] = 1;
        const w = checkWin(1);
        board[i] = null;
        if (w) return i;
      }

      // block
      for (const i of empty) {
        board[i] = 0;
        const w = checkWin(0);
        board[i] = null;
        if (w) return i;
      }

      // center
      if (empty.includes(4)) return 4;

      // random
      return empty[Math.floor(Math.random() * empty.length)];
    }

    const status = () => {
      if (vsBot) return current === 0 ? "Your turn (❌)" : "Bot thinking... (⭕)";
      return `<@${players[current]}>'s turn (${current === 0 ? "❌" : "⭕"})`;
    };

    const gameMessage = await message.channel.send({
      content: `🎮 **Tic Tac Toe**\n${status()}\n\n${renderBoard()}`,
      components: createButtons()
    });

    const collector = gameMessage.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (interaction) => {
      if (vsBot) {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: "❌ Not your game!", ephemeral: true });
        }
        if (current !== 0) {
          return interaction.reply({ content: "⏳ Wait for bot.", ephemeral: true });
        }
      } else {
        if (interaction.user.id !== players[current]) {
          return interaction.reply({ content: "❌ Not your turn!", ephemeral: true });
        }
      }

      const index = parseInt(interaction.customId.split('_')[1], 10);

      if (board[index] !== null) {
        return interaction.reply({ content: "❌ That spot is already taken.", ephemeral: true });
      }

      board[index] = current;

      if (checkWin(current)) {
        collector.stop();
        return interaction.update({
          content: `🏆 ${vsBot ? (current === 0 ? "You win!" : "Bot wins!") : `<@${players[current]}> wins!`}\n\n${renderBoard()}`,
          components: createButtons(true)
        });
      }

      if (board.every(cell => cell !== null)) {
        collector.stop();
        return interaction.update({
          content: `🤝 It's a draw!\n\n${renderBoard()}`,
          components: createButtons(true)
        });
      }

      current = 1 - current;

      await interaction.update({
        content: `🎮 **Tic Tac Toe**\n${status()}\n\n${renderBoard()}`,
        components: createButtons()
      });

      // Bot turn
      if (vsBot && current === 1) {
        await gameMessage.edit({ components: createButtons(true) }).catch(() => {});

        const move = botMove();
        board[move] = 1;

        if (checkWin(1)) {
          collector.stop();
          return gameMessage.edit({
            content: `🤖 Bot wins!\n\n${renderBoard()}`,
            components: createButtons(true)
          });
        }

        if (board.every(cell => cell !== null)) {
          collector.stop();
          return gameMessage.edit({
            content: `🤝 It's a draw!\n\n${renderBoard()}`,
            components: createButtons(true)
          });
        }

        current = 0;
        await gameMessage.edit({
          content: `🎮 **Tic Tac Toe**\n${status()}\n\n${renderBoard()}`,
          components: createButtons()
        }).catch(() => {});
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        gameMessage.edit({ content: "⏰ Game timed out.", components: createButtons(true) }).catch(() => {});
      } else {
        gameMessage.edit({ components: createButtons(true) }).catch(() => {});
      }
    });
  }
};
