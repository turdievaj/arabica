const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.alquran.cloud/v1';
const EN_EDITION = 'en.sahih'; // you can change to another English edition if you want

async function main() {
    const verses = [];

    for (let surah = 1; surah <= 114; surah++) {
        console.log(`Fetching surah ${surah}...`);

        // Arabic text
        const arRes = await axios.get(`${API_BASE}/surah/${surah}`);
        const arAyahs = arRes.data?.data?.ayahs || [];

        // English translation
        const enRes = await axios.get(`${API_BASE}/surah/${surah}/${EN_EDITION}`);
        const enAyahs = enRes.data?.data?.ayahs || [];

        if (arAyahs.length !== enAyahs.length) {
            console.warn(`Surah ${surah}: AR and EN lengths mismatch (${arAyahs.length} vs ${enAyahs.length})`);
        }

        const len = Math.min(arAyahs.length, enAyahs.length);

        for (let i = 0; i < len; i++) {
            const a = arAyahs[i];
            const e = enAyahs[i];

            verses.push({
                surah: a.surah.number,
                ayah: a.numberInSurah,
                surah_name: a.surah.englishName,
                surah_name_ar: a.surah.name,
                text_ar: a.text,
                text_en: e.text
            });
        }
    }

    console.log(`Total verses collected: ${verses.length}`);

    const outPath = path.join(__dirname, 'data', 'quran.json');
    fs.writeFileSync(outPath, JSON.stringify(verses, null, 2), 'utf8');
    console.log(`Saved to ${outPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
