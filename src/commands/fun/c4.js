const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'c4',
  aliases: ['connect4', 'connect_4'],
  async execute(message) {
    const opponent = message.mentions.users.first() || null;
    const vsBot = !opponent;

    if (opponent && opponent.bot) {
      return message.reply("❌ You can't play against bots. Use `a!c4` to play vs me.");
    }

    const DIFFICULTY = 'easy'; // 'easy' | 'normal' | 'hard'

    const players = vsBot ? [message.author.id, 'BOT'] : [message.author.id, opponent.id];
    let current = 0;

    const ROWS = 6;
    const COLS = 7;

    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    const emojis = {
      empty: "⚪",
      red: "🔴",
      yellow: "🟡"
    };

    function renderBoard() {
      return board.map(row =>
        row.map(cell => cell === null ? emojis.empty : cell === 0 ? emojis.red : emojis.yellow).join("")
      ).join("\n");
    }

    function availableRow(col) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === null) return r;
      }
      return -1;
    }

    function drop(col, player) {
      const r = availableRow(col);
      if (r === -1) return false;
      board[r][col] = player;
      return true;
    }

    function undo(col) {
      for (let r = 0; r < ROWS; r++) {
        if (board[r][col] !== null) {
          board[r][col] = null;
          return;
        }
      }
    }

    function checkWin(player) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (c + 3 < COLS &&
              board[r][c] === player &&
              board[r][c+1] === player &&
              board[r][c+2] === player &&
              board[r][c+3] === player) return true;

          if (r + 3 < ROWS &&
              board[r][c] === player &&
              board[r+1][c] === player &&
              board[r+2][c] === player &&
              board[r+3][c] === player) return true;

          if (r + 3 < ROWS && c + 3 < COLS &&
              board[r][c] === player &&
              board[r+1][c+1] === player &&
              board[r+2][c+2] === player &&
              board[r+3][c+3] === player) return true;

          if (r - 3 >= 0 && c + 3 < COLS &&
              board[r][c] === player &&
              board[r-1][c+1] === player &&
              board[r-2][c+2] === player &&
              board[r-3][c+3] === player) return true;
        }
      }
      return false;
    }

    function isDraw() {
      return board.every(row => row.every(cell => cell !== null));
    }

    // ✅ 7 buttons split into 2 rows (Discord max 5 per row)
    function createButtons(disabled = false) {
      const rows = [new ActionRowBuilder(), new ActionRowBuilder()];

      for (let i = 0; i < COLS; i++) {
        const full = availableRow(i) === -1;

        const btn = new ButtonBuilder()
          .setCustomId(`c4_${i}`)
          .setLabel(String(i + 1))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || full);

        if (i < 5) rows[0].addComponents(btn);
        else rows[1].addComponents(btn);
      }

      return rows.filter(r => r.components.length > 0);
    }

    function statusLine() {
      if (vsBot) {
        return current === 0
          ? `🎮 Connect 4 (vs Bot)\nYour turn (🔴) — Difficulty: ${DIFFICULTY}`
          : `🎮 Connect 4 (vs Bot)\nBot thinking... (🟡) — Difficulty: ${DIFFICULTY}`;
      }
      return `🎮 Connect 4\n<@${players[current]}> turn (${current === 0 ? "🔴" : "🟡"})`;
    }

    // 🤖 BOT AI (uses DIFFICULTY)
    function botMove() {
      const playable = [];
      for (let c = 0; c < COLS; c++) if (availableRow(c) !== -1) playable.push(c);

      const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const pref = [3, 2, 4, 1, 5, 0, 6];

      if (DIFFICULTY === 'easy') {
        if (Math.random() < 0.15) {
          for (const c of playable) { drop(c, 1); const w = checkWin(1); undo(c); if (w) return c; }
        }
        if (Math.random() < 0.35) {
          for (const c of playable) { drop(c, 0); const w = checkWin(0); undo(c); if (w) return c; }
        }
        return rand(playable);
      }

      if (DIFFICULTY === 'normal') {
        for (const c of playable) { drop(c, 1); const w = checkWin(1); undo(c); if (w) return c; }

        if (Math.random() < 0.8) {
          for (const c of playable) { drop(c, 0); const w = checkWin(0); undo(c); if (w) return c; }
        }

        const best = pref.filter(c => playable.includes(c));
        return (Math.random() < 0.7) ? best[0] : rand(playable);
      }

      // hard
      for (const c of playable) { drop(c, 1); const w = checkWin(1); undo(c); if (w) return c; }
      for (const c of playable) { drop(c, 0); const w = checkWin(0); undo(c); if (w) return c; }
      return pref.find(c => playable.includes(c)) || playable[0];
    }

    const gameMessage = await message.channel.send({
      content: `${statusLine()}\n\n${renderBoard()}`,
      components: createButtons()
    });

    const collector = gameMessage.createMessageComponentCollector({ time: 600000 });

    collector.on('collect', async interaction => {
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

      const col = parseInt(interaction.customId.split("_")[1], 10);

      if (!drop(col, current)) {
        return interaction.reply({ content: "❌ Column full!", ephemeral: true });
      }

      if (checkWin(current)) {
        collector.stop();
        return interaction.update({
          content: `${vsBot ? (current === 0 ? "🏆 You win!" : "🤖 Bot wins!") : `🏆 <@${players[current]}> wins!`}\n\n${renderBoard()}`,
          components: createButtons(true)
        });
      }

      if (isDraw()) {
        collector.stop();
        return interaction.update({
          content: `🤝 It's a draw!\n\n${renderBoard()}`,
          components: createButtons(true)
        });
      }

      current = current === 0 ? 1 : 0;

      await interaction.update({
        content: `${statusLine()}\n\n${renderBoard()}`,
        components: createButtons()
      });

      // bot turn
      if (vsBot && current === 1) {
        await gameMessage.edit({ components: createButtons(true) }).catch(() => {});

        const colBot = botMove();
        drop(colBot, 1);

        if (checkWin(1)) {
          collector.stop();
          return gameMessage.edit({
            content: `🤖 Bot wins!\n\n${renderBoard()}`,
            components: createButtons(true)
          });
        }

        if (isDraw()) {
          collector.stop();
          return gameMessage.edit({
            content: `🤝 It's a draw!\n\n${renderBoard()}`,
            components: createButtons(true)
          });
        }

        current = 0;

        await gameMessage.edit({
          content: `${statusLine()}\n\n${renderBoard()}`,
          components: createButtons()
        }).catch(() => {});
      }
    });

    collector.on('end', () => {
      gameMessage.edit({ components: createButtons(true) }).catch(() => {});
    });
  }
};
