const fs = require('fs');

// 1. Load the stats from the correct path
const statsPath = '/root/arabica/focus_stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

let balances = {};

Object.keys(stats).forEach(userId => {
    const sessions = stats[userId];
    if (Array.isArray(sessions)) {
        // Sum up all 'duration' values in the array
        const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
        const totalMinutes = totalSeconds / 60;
        
        // Calculate coins (0.25 per minute)
        balances[userId] = parseFloat((totalMinutes * 0.25).toFixed(2));
    }
});

// 2. Save to the root balances file
fs.writeFileSync('/root/arabica/balances.json', JSON.stringify(balances, null, 2));

console.log("✅ Success! Calculated coins from durations.");
console.log("Sample Balance for you:", balances["1307046577587617794"]);
