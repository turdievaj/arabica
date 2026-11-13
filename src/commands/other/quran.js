const { EmbedBuilder } = require('discord.js');
const axios = require('axios'); 

function splitDescription(text, maxLen = 4000) {
    const chunks = [];
    let rest = text || "";
    while (rest.length > maxLen) {
        let cut = rest.lastIndexOf('\n\n', maxLen);
        if (cut < maxLen / 2) cut = maxLen;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut).trimStart();
    }
    if (rest.length || !chunks.length) chunks.push(rest);
    return chunks;
}

module.exports = {
    name: 'quran',
    async execute(message, args, client, tools) {
        const { QURAN_VERSES, normalizeArabic } = tools;

        if (!args.length) {
            return message.reply('Usage: `a!quran <keyword>`\nExample: `a!quran الصراط`');
        }

        const keyword = args.join(" ").trim();
        const isArabic = /[\u0600-\u06FF]/.test(keyword);
        const normalizedKeyword = isArabic ? normalizeArabic(keyword) : keyword.toLowerCase();

        const matches = QURAN_VERSES.filter(v => {
            const arabicText = normalizeArabic(v.arabic || "");
            const englishText = (v.english || v.translation || "").toLowerCase();
            return isArabic
                ? arabicText.includes(normalizedKeyword)
                : englishText.includes(normalizedKeyword);
        });

        if (!matches.length) {
            return message.reply(`❌ No verses found for **${keyword}**.`);
        }

        await message.channel.sendTyping();

        const tafsirPrompt = `Provide a detailed Islamic Tafsir for the Quranic term "${keyword}".\nREPLY IN THIS FORMAT:\n\n**🔹 Arabic Explanation (بالعربية):**\n<detailed Arabic tafsir>\n\n---\n\n**🔹 English Explanation:**\n<detailed English tafsir>`;

        let aiTafsir = "❌ Unable to generate Tafsir.";
        try {
            const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are an expert Islamic Scholar. Provide a detailed Tafsir in Arabic and English, citing Quranic verses with surah and ayah numbers." },
                    { role: "user", content: tafsirPrompt }
                ]
            }, {
                headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
            });

            if (response.data.choices && response.data.choices[0]) {
                aiTafsir = response.data.choices[0].message.content;
            }
        } catch (err) {
            console.error("Tafsir Error:", err);
        }

        const pages = [];

        const tafsirChunks = splitDescription(aiTafsir);
        tafsirChunks.forEach((chunk, i) => {
            pages.push(
                new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(i === 0 ? `🧠 AI Tafsir for "${keyword}"` : `🧠 AI Tafsir (cont.)`)
                    .setDescription(chunk)
                    .setTimestamp()
            );
        });

        const pageSize = 3;
        for (let i = 0; i < matches.length; i += pageSize) {
            const slice = matches.slice(i, i + pageSize);
            let desc = "";
            slice.forEach((v, index) => {
                const sName = v.surah_name || v.surahName || `Surah ${v.surah || ""}`.trim();
                desc += `**${i + index + 1}. ${sName} [${v.surah}:${v.ayah}]**\n`;
                desc += `🔹 **Arabic:** ${v.arabic}\n`;
                desc += `🔹 **Translation:** ${v.english || v.translation || "N/A"}\n\n`;
                desc += `────────────────────\n`;
            });

            splitDescription(desc).forEach(chunk => {
                pages.push(
                    new EmbedBuilder()
                        .setColor(0x00a86b)
                        .setTitle(`📖 Quran Results for "${keyword}"`)
                        .setDescription(chunk)
                        .setTimestamp()
                );
            });
        }

        const totalPages = pages.length;
        pages.forEach((page, idx) => {
            page.setFooter({ text: `Page ${idx + 1}/${totalPages}` });
        });

        let currentPage = 0;
        const msg = await message.reply({ embeds: [pages[currentPage]] });

        if (pages.length === 1) return;

        await msg.react("◀️");
        await msg.react("▶️");

        const collector = msg.createReactionCollector({
            filter: (r, u) => ["◀️", "▶️"].includes(r.emoji.name) && u.id === message.author.id,
            time: 10 * 60 * 1000
        });

        collector.on("collect", async (reaction, user) => {
            if (reaction.emoji.name === "◀️") {
                currentPage = (currentPage - 1 + pages.length) % pages.length;
            } else {
                currentPage = (currentPage + 1) % pages.length;
            }
            await msg.edit({ embeds: [pages[currentPage]] });
            await reaction.users.remove(user.id).catch(() => {});
        });

        collector.on("end", () => {
            msg.reactions.removeAll().catch(() => {});
        });
    }
};
