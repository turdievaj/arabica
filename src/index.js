require('dotenv').config();

const Database = require('better-sqlite3');

const { 
  Client,
  Collection,
  IntentsBitField,
  Events,
  EmbedBuilder,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Partials
} = require('discord.js');

const path = require('path');
const ms = require('ms');
const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.DirectMessages,  
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildExpressions,
      IntentsBitField.Flags.GuildWebhooks,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildVoiceStates,
      IntentsBitField.Flags.GuildMessageReactions,
    ],
    partials: [Partials.Channel]});
const fs = require('fs');
const FOCUS_STATS_FILE = './focus_stats.json';

let focusStats = {};
try {
    if (fs.existsSync(FOCUS_STATS_FILE)) {
        focusStats = JSON.parse(fs.readFileSync(FOCUS_STATS_FILE));
    }
} catch (err) {
    console.error("Failed to load focus stats:", err);
}
function saveFocusStats() {
    fs.writeFileSync(FOCUS_STATS_FILE, JSON.stringify(focusStats, null, 2));
}
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
}
client.prefix = process.env.PREFIX || 'a!';

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        // Check if it's a directory (like 'mod', 'fun')
        if (fs.lstatSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                
                if (command.name && command.execute) {
                    client.commands.set(command.name, command);

		if (command.aliases && Array.isArray(command.aliases)) {
		    for (const alias of command.aliases) {
		        client.commands.set(alias, command);
			    }
			}
		    console.log(`✅ Loaded command: a!${command.name} (from ${folder}/${file})`);
                }
            }
        }
    }
}

function calculateStats(userId) {
    const sessions = focusStats[userId] || [];
    const now = Date.now();
    const periods = { 
        today: 86400000, 
        week: 7 * 86400000, 
        fourteen: 14 * 86400000, 
        month: 30 * 86400000 
    };
    const result = {};
    for (const [key, window] of Object.entries(periods)) {
        result[key] = sessions
            .filter(s => now - s.start <= window)
            .reduce((acc, s) => acc + s.duration, 0);
    }
    result.total = sessions.reduce((acc, s) => acc + s.duration, 0);
    return result;
}


const { loadUserStats, saveUserStats } = require('./user-stats');
const PREFIX = 'a!';
const deepseek = require('./lib/deepseek');
const conversationHistory = new Map();
const MAX_HISTORY = 10;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
const axios = require('axios');
const DM_LOG_CHANNEL_ID = '1446600877581271080';
const dns = require('dns');
const punishmentLogs = new Map(); // Stores warns, mutes, bans
let globalCaseCounter = 1; // Global unique case number (warn/mute/ban/note share this)
// ===== Punishment logs persistence (local JSON) =====
const PUNISHMENT_LOGS_FILE = path.join(__dirname, 'data', 'punishment_logs.json');

// ===== Voice history persistence (local JSON) =====
const VOICE_LOGS_FILE = path.join(__dirname, "data", "voice_logs.json");
const voiceHistory = new Map();

function saveVoiceHistory() {
    try {
        const payload = Object.fromEntries(voiceHistory.entries());
        fs.writeFileSync(VOICE_LOGS_FILE, JSON.stringify(payload, null, 2), "utf8");
    } catch (err) {
        console.error("❌ Failed to save voice history:", err);
    }
}

function loadVoiceHistory() {
    try {
        if (!fs.existsSync(VOICE_LOGS_FILE)) return;
        const raw = fs.readFileSync(VOICE_LOGS_FILE, "utf8");
        if (!raw.trim()) return;
        const parsed = JSON.parse(raw);
        voiceHistory.clear();
        for (const [userId, data] of Object.entries(parsed)) {
            if (!data.sessions) data.sessions = [];
            voiceHistory.set(userId, data);
        }
        console.log(`✅ Loaded voice history: ${voiceHistory.size} user(s)`);
    } catch (err) {
        console.error("❌ Failed to load voice history:", err);
    }
}
loadVoiceHistory();
function savePunishmentLogs() {
    try {
        const payload = {
            globalCaseCounter,
            punishmentLogs: Object.fromEntries(punishmentLogs.entries()),
        };
        fs.writeFileSync(PUNISHMENT_LOGS_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
        console.error('❌ Failed to save punishment logs:', err);
    }
}


// --- Safe, idempotent stats initialization (paste once near top of index.js) ---
global.focusStats = global.focusStats || {};
global.voiceStats = global.voiceStats || {};

const STATS_FILE = path.join(__dirname, 'data', 'focus_stats.json');
const VOICE_FILE = path.join(__dirname, 'data', 'voice_stats.json');

try {
  if (fs.existsSync(STATS_FILE)) {
    const raw = fs.readFileSync(STATS_FILE, 'utf8');
    if (raw && raw.trim()) Object.assign(global.focusStats, JSON.parse(raw));
  }
} catch (e) {
  console.error('[INIT] failed to load focus_stats.json', e);
}

try {
  if (fs.existsSync(VOICE_FILE)) {
    const raw = fs.readFileSync(VOICE_FILE, 'utf8');
    if (raw && raw.trim()) Object.assign(global.voiceStats, JSON.parse(raw));
  }
} catch (e) {
  console.error('[INIT] failed to load voice_stats.json', e);
}

function saveFocusStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(global.focusStats, null, 2));
  } catch (e) {
    console.error('[SAVE] saveFocusStats failed', e);
  }
}
function saveVoiceStats() {
  try {
    fs.writeFileSync(VOICE_FILE, JSON.stringify(global.voiceStats, null, 2));
  } catch (e) {
    console.error('[SAVE] saveVoiceStats failed', e);
  }
}

function loadPunishmentLogs() {
    try {
        if (!fs.existsSync(PUNISHMENT_LOGS_FILE)) return;

        const raw = fs.readFileSync(PUNISHMENT_LOGS_FILE, 'utf8');
        if (!raw.trim()) return;

        const parsed = JSON.parse(raw);

        // Migration support:
        // Old format: { "<​userId>": { warns:[], mutes:[], bans:[] } }
        // New format: { globalCaseCounter: N, punishmentLogs: { "<​userId>": {...} } }
        const isNewFormat =
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.globalCaseCounter === 'number' &&
            parsed.punishmentLogs &&
            typeof parsed.punishmentLogs === 'object';

        const logsObj = isNewFormat ? parsed.punishmentLogs : parsed;
        const counterFromFile = isNewFormat ? parsed.globalCaseCounter : null;

        punishmentLogs.clear();
        for (const [userId, logs] of Object.entries(logsObj || {})) {
            if (!logs) continue;
            if (!logs.warns) logs.warns = [];
            if (!logs.mutes) logs.mutes = [];
            if (!logs.bans) logs.bans = [];
            if (!logs.notes) logs.notes = [];

            // Ensure entries have caseId if missing (migration)
            for (const arr of [logs.warns, logs.mutes, logs.bans, logs.notes]) {
                for (const entry of arr) {
                    if (entry && entry.caseId == null) {
                        entry.caseId = globalCaseCounter++;
                    }
                }
            }

            punishmentLogs.set(userId, logs);
        }

        // If file had a saved counter, use it (but also ensure it's >= max used + 1)
        if (typeof counterFromFile === 'number') {
            globalCaseCounter = Math.max(globalCaseCounter, counterFromFile);
        }

        // Write back in new format so it stays consistent
        savePunishmentLogs();

        console.log(`✅ Loaded punishment logs: ${punishmentLogs.size} user(s). Next case #${globalCaseCounter}`);
    } catch (err) {
        console.error('❌ Failed to load punishment logs:', err);
    }
}

function formatCEST(dateLike) {
  const d = new Date(dateLike);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' }).format(d);
}

// Load once at startup
loadPunishmentLogs();
const activeMutes = new Map(); // Tracks timed mutes
// ===== Mute persistence =====
const MUTES_FILE = path.join(__dirname, 'data', 'active_mutes.json');

function saveMutes() {
    try {
        const data = {};
        for (const [userId, mute] of activeMutes.entries()) {
            data[userId] = {
                guildId: mute.guildId,
                mutedRoleId: mute.mutedRoleId,
                unmuteAt: mute.unmuteAt
            };
        }
        fs.writeFileSync(MUTES_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Failed to save mutes:", err);
    }
}

	async function loadMutes() {
    try {
        if (!fs.existsSync(MUTES_FILE)) return;
        const raw = fs.readFileSync(MUTES_FILE, 'utf8');
        if (!raw.trim()) return;

        const data = JSON.parse(raw);
        const now = Date.now();

        for (const [userId, mute] of Object.entries(data)) {
            const remaining = mute.unmuteAt - now;

            if (remaining <= 0) {
                // Already expired while bot was off
                await performUnmute(mute.guildId, userId, mute.mutedRoleId);
            } else {
                // Restore the timer using the saved data
                const timeoutId = setTimeout(() => {
                    performUnmute(mute.guildId, userId, mute.mutedRoleId);
                }, remaining);

                activeMutes.set(userId, {
                    guildId: mute.guildId,
                    mutedRoleId: mute.mutedRoleId,
                    unmuteAt: mute.unmuteAt,
                    timeoutId: timeoutId
                });
            }
        }
        console.log(`✅ Restored ${activeMutes.size} active mutes`);
    } catch (err) {
        console.error("❌ Failed to load mutes:", err);
    }
}

async function performUnmute(guildId, userId, mutedRoleId) {
    try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;

        if (member.roles.cache.has(mutedRoleId)) {
            await member.roles.remove(mutedRoleId, "Mute expired");
        }

        activeMutes.delete(userId);
        saveMutes();

        console.log(`🔊 Unmuted ${userId}`);
    } catch (err) {
        console.error("❌ Unmute error:", err);
    }
}

function formatAgo(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hours ago`;
}


// ===== Focus persistence =====
const FOCUS_FILE = path.join(__dirname, 'data', 'focus_sessions.json');


// 1. Updated Save Function (Saves an array of roles instead of just one)
function saveFocus() {
  try {
    const data = {};
    // focusSessions Map keys should be the same string you used when creating sessions,
    // e.g. `${guildId}_${userId}`
    focusSessions.forEach((val, key) => {
	data[key] = {
  	guildId: val.guildId,
  	userId: val.userId,
  	focusRoleId: val.focusRoleId || null,    // <-- add this
  	roleIds: Array.isArray(val.roleIds) ? val.roleIds : [],
  	levelRoleId: val.levelRoleId || null,
  	startTime: val.startTime || null,
  	endTime: val.endTime || null
	};
    });
    fs.writeFileSync(FOCUS_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('[FOCUS] saved', Object.keys(data).length, 'sessions');
  } catch (err) {
    console.error("[FOCUS] Error saving focus sessions:", err);
  }
}

// 2. Updated Load Function (Restores the array back into memory on startup)
function loadFocus(passedFocusRoleId) {
  try {
    if (!fs.existsSync(FOCUS_FILE)) return;
    const raw = fs.readFileSync(FOCUS_FILE, 'utf8');
    if (!raw) return;
    const data = JSON.parse(raw);
    const now = Date.now();
    for (const [key, s] of Object.entries(data)) {
      const entry = {
        guildId: s.guildId,
        userId: s.userId,
        roleIds: Array.isArray(s.roleIds) ? s.roleIds : [],
        levelRoleId: s.levelRoleId || null,
        startTime: s.startTime || null,
        endTime: s.endTime || null,
        timeoutId: null
      };
      focusSessions.set(key, entry);

      // choose the role id to use for the scheduled endFocus:
      const focusRoleIdToUse = s.focusRoleId || passedFocusRoleId;

      if (entry.endTime && entry.endTime > now) {
        const remaining = entry.endTime - now;
        entry.timeoutId = setTimeout(() => {
          endFocus(entry.guildId, entry.userId, focusRoleIdToUse).catch(err => console.error('[FOCUS] endFocus expired error', err));
        }, remaining + 50);
      } else {
        // expired while bot was offline — end immediately
        setImmediate(() => {
          endFocus(entry.guildId, entry.userId, focusRoleIdToUse).catch(err => console.error('[FOCUS] endFocus expired error', err));
        });
      }
    }
    console.log('[FOCUS] loadFocus restored', focusSessions.size, 'sessions');
  } catch (err) {
    console.error('[FOCUS] loadFocus failed', err);
  }
}

// 3. Updated End Function (Loops through the array and gives ALL roles back)
async function endFocus(guildId, userId, focusRoleId) {
  const key = `${guildId}_${userId}`;
  const session = focusSessions.get(key);
  if (!session) {
    console.warn('[endFocus] no session for', key);
    return;
  }

  // clear scheduled timer
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
    session.timeoutId = null;
  }

  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      console.error('[endFocus] guild not found', guildId);
    } else {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        console.error('[endFocus] member not found in guild', userId);
      } else {
        // Remove focus role if present
        try {
          if (member.roles.cache.has(focusRoleId)) {
            await member.roles.remove(focusRoleId, 'Focus ended');
            console.log('[endFocus] removed focus role for', member.user.tag);
          }
        } catch (err) {
          console.warn('[endFocus] failed to remove focus role:', err?.message || err);
        }

        // Determine roles to restore (prefer snapshot)
        const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);

        let restoreRoleIds = Array.isArray(session.roleIds) && session.roleIds.length
          ? session.roleIds.slice()
          : (session.levelRoleId ? [session.levelRoleId] : []);

        // Filter out @everyone and roles the bot can't manage
        restoreRoleIds = restoreRoleIds.filter(rid => {
          if (rid === guild.id) return false;
          const role = guild.roles.cache.get(rid);
          if (!role) return false;
          if (botMember && role.position >= botMember.roles.highest.position) {
            console.warn('[endFocus] skipping role due to hierarchy:', role.name, role.id);
            return false;
          }
          return true;
        });

        // Merge with any unmanageable roles the member already has (so we don't remove them)
        const currentRoles = member.roles.cache.map(r => r.id);
        const unmanageable = currentRoles.filter(rid => {
          const r = guild.roles.cache.get(rid);
          return r && botMember && r.position >= botMember.roles.highest.position;
        });
        const finalRoles = Array.from(new Set([...restoreRoleIds, ...unmanageable]));

        // Apply restored roles
        try {
          await member.roles.set(finalRoles, 'Restoring roles after focus end');
          console.log('[endFocus] restored roles for', member.user.tag, 'count=', finalRoles.length);
        } catch (err) {
          console.error('[endFocus] failed to restore roles:', err?.message || err);
        }

        // DM the user (fallback to guild channel if DM blocked)
        const durationSeconds = Math.max(0, Math.floor((Date.now() - (session.startTime || Date.now())) / 1000));
        const durationHours = (durationSeconds / 3600).toFixed(2);
        const earnedCoins = ((durationSeconds / 3600) * 0.5).toFixed(2);
        const dmText = `🎉 Great job! You completed ${durationHours} hrs of focus and received ${earnedCoins} coins.`;

        try {
          await member.send(dmText);
          console.log('[endFocus] DM sent to', member.user.tag);
        } catch (dmErr) {
          console.warn('[endFocus] DM failed for', member.user.tag);
          const fallback = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
          if (fallback) fallback.send(`${member} — ${dmText}`).catch(e => console.error('[endFocus] fallback send failed', e));
        }
      }
    }
  } catch (err) {
    console.error('[endFocus] unexpected error', err);
  } finally {
    focusSessions.delete(key);
    saveFocus(); // persist removal
    console.log('[endFocus] cleaned session for', key);
  }
}

const levelRoles = [
  "Native Speaker",
  "Heritage Speaker",
  "Newbie",
  "Beginner",
  "Intermediate",
  "Fluent",
  "Advanced"
];

const SPECIAL_BOOSTER_ROLE_ID = '1487607046265245797';  
const LOG_CHANNEL_ID = '945254025199226930';            
const GUILD_ID = '823889299325714462';
const BAN_APPEAL_CHANNEL_ID = '1446600877581271080';
dns.setDefaultResultOrder('ipv4first');

const BOOSTER_ROLE_IDS = [
	'852811899221180489',
]

// Booster color roles
const BOOSTER_COLOR_ROLE_IDS = [
  '1487566213931601920',
  '1487566227965607986',
  '1487566232675942570',
  '1487566238367613028',
  '1487566235200917726',
  '1487566253576028400',
  '1487566244444901527',
  '1487566241471135855',
  '1487566259926077482',
  '1487566270005252167',
  '1487566266591084685',
  '1487566262929199155',
  '1423709547054501899',
  '1487566249998155826',
  '1487566256696459426',
];

// Sync all members on startup: ensure anyone with the Discord booster role(s) has your special role
async function syncBoosterRoles(client) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) return console.error('[SYNC] Guild not found:', GUILD_ID);

    // fetch all members (requires GUILD_MEMBERS intent and Developer Portal intent enabled)
    const members = await guild.members.fetch();
    console.log(`[SYNC] Checking ${members.size} members for booster roles...`);

    // fetch bot member & permission checks once
    const me = await guild.members.fetchMe();
    const canManageRoles = me.permissions.has('ManageRoles');
    const botPos = me.roles.highest.position;

    if (!canManageRoles) console.warn('[SYNC] Bot does not have Manage Roles permission.');

    for (const member of members.values()) {
      // Check if member has any Discord-given booster role
      const hasDiscordBooster = BOOSTER_ROLE_IDS.some(id => member.roles.cache.has(id));
      const hasSpecial = member.roles.cache.has(SPECIAL_BOOSTER_ROLE_ID);

      if (hasDiscordBooster && !hasSpecial) {
        const targetRole = guild.roles.cache.get(SPECIAL_BOOSTER_ROLE_ID);
        if (!targetRole) {
          console.error('[SYNC] SPECIAL_BOOSTER_ROLE_ID not found in guild roles');
          break;
        }
        if (!canManageRoles || botPos <= targetRole.position) {
          console.error(`[SYNC] Cannot add role to ${member.user.tag} due to role hierarchy or missing perms.`);
          // Optional: log to log channel
          const logCh = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logCh && logCh.isTextBased?.()) {
            await logCh.send(`⚠️ I couldn't add the special booster role to ${member.user.tag} — check bot role position/permissions.`);
          }
          continue;
        }

        await member.roles.add(SPECIAL_BOOSTER_ROLE_ID, 'Sync: user has Discord booster role')
          .then(() => console.log(`[SYNC] Added special role to ${member.user.tag}`))
          .catch(err => console.error(`[SYNC ERROR] Failed to add role to ${member.user.tag}:`, err.message));
      }

      // If they no longer have Discord booster role but still have your special role, remove it
      if (!hasDiscordBooster && hasSpecial) {
        const targetRole = guild.roles.cache.get(SPECIAL_BOOSTER_ROLE_ID);
        if (!targetRole) continue;
        if (!canManageRoles || botPos <= targetRole.position) {
          console.error(`[SYNC] Cannot remove role from ${member.user.tag} due to role hierarchy or missing perms.`);
          continue;
        }

        await member.roles.remove(SPECIAL_BOOSTER_ROLE_ID, 'Sync: user no longer has Discord booster role')
          .then(() => console.log(`[SYNC] Removed special role from ${member.user.tag}`))
          .catch(err => console.error(`[SYNC ERROR] Failed to remove role from ${member.user.tag}:`, err.message));
      }
    }

    console.log('[SYNC] Booster role sync complete.');
  } catch (err) {
    console.error('[SYNC ERROR] Failed to sync booster roles:', err);
  }
}



// Log channel for removals

let QURAN_VERSES = [];

try {
    const quranPath = path.join(__dirname, 'data', 'quran.json');
    if (fs.existsSync(quranPath)) {
        const raw = fs.readFileSync(quranPath, 'utf8');
        QURAN_VERSES = JSON.parse(raw);
        console.log(`✅ Loaded ${QURAN_VERSES.length} Quran verses locally.`);
    } else {
        console.error('❌ quran.json not found at:', quranPath);
    }
} catch (err) {
    console.error('❌ Failed to load quran.json:', err);
}

function normalizeArabic(text = '') {
    return text
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // Remove diacritics
        .replace(/[إأٱآا]/g, 'ا') // Normalize alef forms
        .replace(/ة/g, 'ه') // Normalize taa marbuta
        .replace(/ـ/g, '') // Remove tatweel
        .trim();
}

// Language markers for validation
const languageMarkers = {
    msa: [/ال/, /هذا/, /ذلك/, /السلام/, /الله/],
    egyptian: [/بس/, /يعني/, /عاوز/, /تمام/, /حاجة/],
    levantine: [/كيفك/, /شو/, /منيح/, /هلق/, /كتير/],
    darija: [/لاباس/, /شنو/, /بزاف/, /كيداير/, /واش/, /صافي/],
    gulf: [/شلونك/, /وين/, /عسب/, /بس/, /طيب/],
    english: [/\bthe\b/, /\bto\b/, /\band\b/, /\bis\b/, /\bof\b/]
};

const NO_PERMISSION_MESSAGE = "🔒 This command requires staff permissions.";

// AI-allowed channels (add your channel IDs here)
const AI_ALLOWED_CHANNELS = [
	'1446584673861107883',
	'825365651697827890',
	'994184305569959946',
	'1441920284612497518',
	'1501968175535751208',
	'1501968559901905057',
	'1501971390864298074',
];

const TOPICS_EN = [
    "Would you rather be respected or feared?",
    "Would you live forever if you could?",
    "Is ignorance truly bliss?",
    "Are humans naturally good or evil?",
    "What would you do if money didn’t exist?",
    "Is honesty always the best policy?",
    "Would you sacrifice one person to save 100?",
    "Is technology making us more lonely?",
    "Do we have free will or is everything predetermined?",
    "What would society look like without laws?",
    "Would you choose happiness over truth?",
    "Are dreams meaningful or just random?",
    "Should social media be regulated?",
    "Is intelligence more valuable than kindness?",
    "Would you erase your worst memory?",
    "Can people truly change?",
    "What defines a meaningful life?",
    "Should emotions or logic guide decisions?",
    "Is competition good or harmful?",
    "Would you rather know how you die or when?",
    "Is failure necessary for success?",
    "Do people deserve second chances?",
    "Would you trade years of your life for wealth?",
    "Is fame worth the loss of privacy?",
    "Should AI have rights in the future?",
    "What is more dangerous: power or ignorance?",
    "Would you rather be loved or understood?",
    "Can money buy happiness long-term?",
    "Would you restart your life if you could?",
    "Is suffering necessary for growth?",
    "What’s something new you learned recently?",
    "If you could live anywhere for a year, where would it be?",
    "What’s your favorite way to start the day?",
    "What makes someone a good listener?",
    "Do you prefer routine or variety?",
    "What’s a small goal you want to achieve this week?",
    "What kind of music helps you focus?",
    "What’s your favorite way to stay active?",
    "Do you enjoy challenges or prefer comfort?",
    "What’s a skill you’re currently improving?",
    "What makes a good leader?",
    "Do you prefer online or in-person communication?",
    "What’s your favorite way to spend time alone?",
    "What’s something you’re proud of?",
    "What motivates you to keep going when things get hard?",
    "Do you prefer learning by doing or by reading?",
    "What’s your favorite place you’ve visited?",
    "What’s something you want to learn this year?",
    "How do you stay organized?",
    "What’s your favorite type of food?",
    "Do you prefer quiet environments or busy ones?",
    "What helps you stay consistent?",
    "What’s your favorite way to celebrate achievements?",
    "What’s something that always makes you laugh?",
    "Do you enjoy trying new things?",
    "What’s your ideal way to spend a day off?",
    "What kind of goals do you set for yourself?",
    "What’s a habit you want to build?",
    "What’s your favorite type of weather?",
    "What makes a conversation meaningful?",
    "What’s your favorite memory with friends?",
    "Do you prefer planning ahead or deciding last minute?",
    "What helps you stay positive?",
    "What’s your favorite way to learn something new?",
    "What’s one thing you’d improve about your daily routine?",
    "What kind of activities help you relax?",
    "What inspires you the most?",
    "What’s something simple you enjoy every day?",
    "Do you prefer working early or late?",
    "What’s your favorite way to spend time outdoors?"
];

const TOPICS_AR = [
    "هل تفضل أن تكون محبوبًا أم محترمًا؟",
    "هل الخصوصية انتهت في عصرنا الحالي؟",
    "هل ترغب في العيش إلى الأبد؟",
    "هل الجهل نعمة أم مشكلة؟",
    "هل الإنسان بطبيعته خير أم شر؟",
    "ماذا ستفعل لو لم يكن هناك مال في العالم؟",
    "هل يجب الحكم على الناس من ماضيهم؟",
    "هل الصراحة دائمًا أفضل؟",
    "هل تضحي بشخص واحد لإنقاذ 100؟",
    "هل التكنولوجيا جعلتنا أكثر وحدة؟",
    "هل لدينا حرية اختيار أم كل شيء مقدر؟",
    "كيف سيكون العالم بدون قوانين؟",
    "هل إلغاء الأشخاص (cancel culture) مبرر؟",
    "هل تختار السعادة أم الحقيقة؟",
    "هل الأحلام لها معنى أم عشوائية؟",
    "هل يجب تنظيم وسائل التواصل الاجتماعي؟",
    "هل الذكاء أهم من اللطف؟",
    "هل تمحو أسوأ ذكرى في حياتك؟",
    "هل يمكن للإنسان أن يتغير فعلاً؟",
    "ما معنى الحياة بالنسبة لك؟",
    "هل العاطفة أهم أم المنطق؟",
    "هل المنافسة مفيدة أم مضرة؟",
    "هل تفضل معرفة متى تموت أم كيف؟",
    "هل الفشل ضروري للنجاح؟",
    "هل الناس يستحقون فرصة ثانية؟",
    "هل تضحي بسنوات من عمرك مقابل المال؟",
    "هل الشهرة تستحق فقدان الخصوصية؟",
    "هل يجب أن يكون للذكاء الاصطناعي حقوق؟",
    "ما الأخطر: القوة أم الجهل؟",
    "هل تفضل أن تكون محبوبًا أم مفهومًا؟",
    "هل الانتقام مبرر أحيانًا؟",
    "هل المال يجلب السعادة على المدى الطويل؟",
    "هل تبدأ حياتك من جديد لو أتيحت لك الفرصة؟",
    "هل المعاناة ضرورية للنمو؟",
    "ما الشيء الجديد الذي تعلمته مؤخرًا؟",
    "لو استطعت العيش في أي مكان لمدة سنة، أين سيكون؟",
    "ما طريقتك المفضلة لبدء يومك؟",
    "ما الذي يجعل الشخص مستمعًا جيدًا؟",
    "هل تفضل الروتين أم التنوع؟",
    "ما هدف بسيط تريد تحقيقه هذا الأسبوع؟",
    "ما نوع الموسيقى الذي يساعدك على التركيز؟",
    "ما طريقتك المفضلة للبقاء نشيطًا؟",
    "هل تفضل التحديات أم الراحة؟",
    "ما المهارة التي تعمل على تحسينها الآن؟",
    "ما الذي يجعل الشخص قائدًا جيدًا؟",
    "هل تفضل التواصل عبر الإنترنت أم وجهًا لوجه؟",
    "ما طريقتك المفضلة لقضاء وقتك بمفردك؟",
    "ما الشيء الذي تفخر به؟",
    "ما الذي يدفعك للاستمرار عندما تصبح الأمور صعبة؟",
    "هل تفضل التعلم بالممارسة أم بالقراءة؟",
    "ما المكان المفضل الذي زرته؟",
    "ما الشيء الذي تريد تعلمه هذا العام؟",
    "كيف تنظم وقتك؟",
    "ما نوع الطعام الذي تفضله؟",
    "هل تفضل الأماكن الهادئة أم المزدحمة؟",
    "ما الذي يساعدك على الاستمرارية؟",
    "كيف تحتفل بإنجازاتك؟",
    "ما الشيء الذي يجعلك تضحك دائمًا؟",
    "هل تحب تجربة أشياء جديدة؟",
    "ما طريقتك المثالية لقضاء يوم إجازة؟",
    "ما نوع الأهداف التي تضعها لنفسك؟",
    "ما العادة التي تريد اكتسابها؟",
    "ما نوع الطقس الذي تفضله؟",
    "ما الذي يجعل الحديث ممتعًا؟",
    "ما أفضل ذكرى لك مع أصدقائك؟",
    "هل تفضل التخطيط المسبق أم اتخاذ القرار في اللحظة؟",
    "ما الذي يساعدك على التفكير بإيجابية؟",
    "ما طريقتك المفضلة لتعلم شيء جديد؟",
    "ما الشيء الذي ترغب بتحسينه في روتينك اليومي؟",
    "ما الأنشطة التي تساعدك على الاسترخاء؟",
    "ما الذي يلهمك أكثر؟",
    "ما الأشياء البسيطة التي تستمتع بها يوميًا؟",
    "هل تفضل العمل صباحًا أم مساءً؟",
    "ما طريقتك المفضلة لقضاء وقتك في الخارج؟"
];

// Image reminder
const ISLAMIC_IMAGE_REMINDER_CHANNEL_ID = '1450163027340165140';
const islamicReminderMessages = new Map();

const scamMutedUsers = new Map();
const MUTE_ROLE_NAME = "Muted";
const MAX_SCAM_OFFENSES = 10;

const SCAM_PATTERNS = [
    /discord-nitro/i,
    /discordgift/i,
    /steamcommunity\.ru/i,
    /dlscord\./i,
    /discorcl\./i,
    /free-nitro/i,
    /claim-your/i,
    /(free|steam|nitro|claim).*(cdn\.discordapp\.com\/attachments)/i
];

function isScamMessage(content) {
    if (!content) return false;
    return SCAM_PATTERNS.some(pattern => pattern.test(content));
}

const scamDb = new Database(path.join(__dirname, 'data', 'scam_offenses.db'));
scamDb.prepare(`
    CREATE TABLE IF NOT EXISTS scam_offenses (
        user_id TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
    )
`).run();
scamDb.prepare(`
    CREATE TABLE IF NOT EXISTS scam_image_hashes (
        hash TEXT PRIMARY KEY
    )
`).run();

function isKnownScamImageHash(hash) {
    return !!scamDb.prepare("SELECT 1 FROM scam_image_hashes WHERE hash = ?").get(hash);
}

function addScamImageHash(hash) {
    scamDb.prepare("INSERT OR IGNORE INTO scam_image_hashes (hash) VALUES (?)").run(hash);
}

function getScamOffenseCount(userId) {
    const row = scamDb.prepare("SELECT count FROM scam_offenses WHERE user_id = ?").get(userId);
    return row ? row.count : 0;
}

function incrementScamOffenseCount(userId) {
    const count = getScamOffenseCount(userId) + 1;
    scamDb.prepare(`
        INSERT INTO scam_offenses (user_id, count) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET count = ?
    `).run(userId, count, count);
    return count;
}
const recentUserMessages = new Map(); // userId -> { content, count }

function checkRepeatedMessage(userId, content) {
    if (!content || content.trim().length === 0) return 0;

    const normalized = content.trim().toLowerCase();
    const entry = recentUserMessages.get(userId);

    if (entry && entry.content === normalized) {
        entry.count++;
        return entry.count;
    } else {
        recentUserMessages.set(userId, { content: normalized, count: 1 });
        return 1;
    }
}

const crypto = require('crypto');

async function hashAttachment(url) {
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

const focusSessions = new Map();

async function callDeepSeekAPI(messages) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: "deepseek-chat",
      messages: messages,
      temperature: 0.3,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

// Define comprehensive rule violations and prohibited content
const RULE_VIOLATIONS = {
    DISRESPECT: [
      "racist", "discrimination", "hate speech", "harassment", "offensive", "insult",
      "العنصرية", "التمييز", "خطاب الكراهية", "التحرش", "مسيئ", "إهانة"
    ],
    NSFW: [
      "porn", "nsfw", "explicit", "adult content", "محتوى إباحي", "محتوى للبالغين",
      "عنف", "violent", "gore", "blood", "دم"
    ],
    LGBTQ: [
      "lgbt", "gay", "lesbian", "trans", "queer", "المثلية", "الشذوذ"
    ],
    CONTROVERSIAL: [
      "genocide", "إبادة", "political", "سياسي", "religious debate", "جدل ديني",
      "sports fight", "تعصب رياضي"
    ],
    ADVERTISING: [
      "join my server", "check out my", "advertisement", "promo", "إعلان", "دعاية",
      "انضم لسيرفر"
    ],
    PERSONAL_INFO: [
      "phone number", "address", "email", "personal info", "رقم هاتف", "عنوان",
      "معلومات شخصية"
    ],
    SPAM: ["spam", "سبام", "تكرار"],
    IMPERSONATION: ["pretending to be", "fake account", "انتحال شخصية"],
    DRAMA: ["drama", "argument", "fight", "جدال", "شجار", "دراما"]
};

const PROHIBITED_TOPICS = [
    "suicide",
    "self-harm",
    "violence",
    "terrorism",
    "sexual content",
    "gore",
    "explicit",
];

// Language settings for channels
const CHANNEL_LANGUAGE_SETTINGS = {
    '1070116097799487618': { dialect: 'msa', allowEnglish: true },
    '1042561259012358244': { dialect: 'gulf', allowEnglish: true },
    '1042561655923552256': { dialect: 'egyptian', allowEnglish: true },
    '1368308950029832343': { dialect: 'egyptian', allowEnglish: true },
    '1042561780632780904': { dialect: 'levantine', allowEnglish: true },
    '1042561929782231170': { dialect: 'darija', allowEnglish: true },
    '835000976225861643': { dialect: 'arabic', allowEnglish: false },
    '823889299752878140': { dialect: 'bilingual', allowEnglish: true },
    '823889299325714467': { dialect: 'multilingual', allowEnglish: true },
    '1446584673861107883': { dialect: "auto", allowEnglish: true }
};

// Language rules definition
const LANGUAGE_RULES = {
    msa: "use Modern Standard Arabic (Fusha) and English. Never code-switch and be native in Dialect.",
    egyptian: "use Egyptian Arabic, franco and English. Don't use MSA or other dialects, be native in Egyptian. Switch between Egyptian Arabic and English naturally.",
    levantine: "use Levantine, franco and Arabic and English. Be native in Levantine. Switch between Levantine and English naturally.",
    gulf: "use Gulf Arabic and English. Be native in Gulf Arabic. Switch between Gulf and English naturally.",
    darija: "use Moroccan Darija, franco and English. Be native in Darija. Switch between Darija and English naturally.",
    arabic: "use ONLY Arabic (any dialect). Never use other languages.",
    bilingual: "respond in the user's preferred language (Arabic or English). Switch between Arabic and English naturally.",
    multilingual: "Respond in the exact language the user writes in. Do not default to Arabic."
};

const noPermissionResponses = [
    "Sorry, you don't have permission to do that.",
    "You can't use this command here.",
    "Access denied. Please check your permissions.",
    "Oops! You don't have the required permissions."
];

// Path to user stats file
const statsFilePath = path.join(__dirname, '..', 'user-stats.json');

// Helper functions
function getLanguageInstruction(channelSettings) {
    const dialect = channelSettings.dialect;
    const allowEnglish = channelSettings.allowEnglish;

    const instructions = {
      msa: "Modern Standard Arabic (Fusha) with formal tone. Use English only if allowed.",
      egyptian: "Egyptian Arabic dialect (Masri) with casual tone. Switch to English naturally if allowed.",
      levantine: "Levantine Arabic (Shami) with friendly tone. Switch to English naturally if allowed.",
      gulf: "Gulf Arabic (Khaleeji) with respectful tone. Switch to English naturally if allowed.",
      darija: "Moroccan Arabic (Darija) with warm tone. Switch to English naturally if allowed.",
      arabic: "Strictly Arabic (any dialect). No English.",
      bilingual: "Switch between Arabic and English naturally.",
      multilingual: "Respond in the user's language. No default to Arabic."
    };

    let baseInstruction = instructions[dialect] || "Use the user's language";

    if (allowEnglish) {
      baseInstruction += " and English when appropriate.";
    } else {
      baseInstruction += " only.";
    }

    return baseInstruction;
}

// ✅ 1. Create the balance object
let userBalances = {}; 

const BALANCES_FILE = './balances.json';
if (fs.existsSync(BALANCES_FILE)) {
    userBalances = JSON.parse(fs.readFileSync(BALANCES_FILE));
}
function getBalance(userId) {
    return userBalances[userId] || 0;
}

function addBalance(userId, amount) {
    if (!userBalances[userId]) userBalances[userId] = 0;
    userBalances[userId] += amount;
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(userBalances, null, 2));
}

// Helper function to truncate text for embeds
function truncate(text, maxLength) {
    if (!text) return '[No content]';
    return text.length > maxLength ?
        text.slice(0, maxLength - 3) + '...' :
        text;
}

function validateLanguage(text, channelSettings) {
    const dialect = channelSettings.dialect;
    const allowEnglish = channelSettings.allowEnglish;

    // Check dialect first
    const dialectValid = languageMarkers[dialect]?.some(regex => regex.test(text)) ?? true;

    // Check English if allowed
    const englishValid = allowEnglish && languageMarkers.english.some(regex => regex.test(text));

    return dialectValid || (allowEnglish && englishValid);
}

function getCulturalContext(language) {
    const contexts = {
      msa: "Use formal MSA with Islamic greetings like 'السلام عليكم', use phrases that are commonly used in poetry and books",
      egyptian: "Use common Egyptian phrases like 'ازيك', كحيان, كحيانة casually, be native in egyptian",
      levantine: "Use Levantine terms like 'كيفك' naturally",
      gulf: "Use Gulf terms like 'شلونك' respectfully",
      darija: "Use Moroccan terms like 'لاباس', 'كيداير warmly and be native"
    };
    return contexts[language] || "Be accurate, native and culturally appropriate";
}

function getLanguageReminder(language) {
    const reminders = {
      msa: "⚠️ هذا القناة للغة العربية الفصحى فقط",
      egyptian: "⚠️ يا عم ده قناة عامية مصرية بس",
      levantine: "⚠️ هاد القناة للهجة الشامية فقط",
      darija: "⚠️ هاد القناة للارجة المغربية فقط",
      gulf: "⚠️ هذي القناة للهجة الخليجية فقط"
    };
    return reminders[language] || "⚠️ Please use the correct language for this channel";
}

function containsProhibitedTopic(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return PROHIBITED_TOPICS.some(topic => lower.includes(topic));
}

// Function to format equations for Discord
function formatEquationForDiscord(equation) {
    return equation
        .replace(/\\frac\s*{([^}]+)}\s*{([^}]+)}/g, '($1/$2)')
        .replace(/\s+/g, ' ')
        .replace(/_([a-zA-Z0-9]+)/g, '$1')
        .replace(/\\cdot/g, '×')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\sqrt\s*{([^}]+)}/g, '√($1)')
        .replace(/\\pi/g, 'π')
        .replace(/\\theta/g, 'θ');
}

// Initialize quizStates map
client.quizStates = new Map();

function hasStaffRole(member) {
    const staffRoles = ['Staff', 'Moderator','TrialMod', 'Admin', 'Administrator', 'Mod'];
    return member.roles.cache.some(role =>
      staffRoles.includes(role.name) ||
      member.permissions.has('Administrator') ||
      member.id === member.guild.ownerId
    );
}

let focusRole;

// Ready event
client.once(Events.ClientReady, async () => {
    console.log(`🪼 ${client.user.tag} is online`);
    const guild = await client.guilds.fetch('823889299325714462').catch(() => null);
  if (!guild) {
    console.error('Guild not found');
    return;
  }

  focusRole = guild.roles.cache.find(r => r.name === 'Focus') || await guild.roles.fetch('FOCUS_ROLE_ID_HERE').catch(() => null);
  if (!focusRole) {
    console.error('Focus role not found');
    return;
  }

  loadFocus(focusRole.id);
});

// Interaction handler for slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    
	const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        // Defer the reply immediately to prevent timeout
        await interaction.deferReply();

        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error executing this command!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'There was an error executing this command!',
                    ephemeral: true
                });
            }
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
});

// Snipes map for deleted messages (in-memory only)
const snipes = new Map();

// Message Delete Event (sniping)
client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;

    const channelSnipes = snipes.get(message.channel.id) || [];
    channelSnipes.unshift({
        content: message.content,
        author: message.author,
        authorTag: message.author.tag,
        createdAt: message.createdAt,
        deletedAt: new Date(),
        attachments: message.attachments.map(att => ({
            url: att.url,
            proxyURL: att.proxyURL,
            name: att.name
        })),
        channelId: message.channel.id
    });
    if (channelSnipes.length > 10) channelSnipes.pop(); // Keep last 10 messages
    snipes.set(message.channel.id, channelSnipes);
});

// Consolidated booster handler — replace existing guildMemberUpdate handlers with this one
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // handle partials
    if (oldMember.partial) await oldMember.fetch().catch(() => null);
    if (newMember.partial) await newMember.fetch().catch(() => null);

    const guild = newMember.guild;

    // fetch bot's guild member for perms/position checks
    const me = await guild.members.fetchMe();
    const canManageRoles = me.permissions.has('ManageRoles');
    const botPos = me.roles.highest.position;

    // 1) Detect by premiumSinceTimestamp
    const oldBoostTs = oldMember?.premiumSinceTimestamp ?? null;
    const newBoostTs = newMember?.premiumSinceTimestamp ?? null;
    const stoppedByTimestamp = Boolean(oldBoostTs && !newBoostTs);
    const startedByTimestamp = Boolean(!oldBoostTs && newBoostTs);

    // 2) Detect by presence of any configured booster role(s)
    const hadBoosterRole = (BOOSTER_ROLE_IDS || []).some(id => oldMember.roles.cache.has(id));
    const hasBoosterRole = (BOOSTER_ROLE_IDS || []).some(id => newMember.roles.cache.has(id));
    const startedByRole = !hadBoosterRole && hasBoosterRole;
    const stoppedByRole = hadBoosterRole && !hasBoosterRole;

    // Short-circuit: nothing booster-related changed
    if (!(stoppedByTimestamp || startedByTimestamp || startedByRole || stoppedByRole)) return;

    const logCh = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

    // Target role object
    const specialRole = guild.roles.cache.get(SPECIAL_BOOSTER_ROLE_ID);
    if (!specialRole) {
      console.error('[BOOSTER] SPECIAL_BOOSTER_ROLE_ID not found in guild.');
    }

    // Helper: safe add role with checks
    async function safeAddRole(member, roleId, reason) {
      if (!roleId) return;
      const role = guild.roles.cache.get(roleId);
      if (!role) return;
      if (!canManageRoles || botPos <= role.position) {
        const msg = `[BOOSTER] Cannot add role ${role.name} to ${member.user.tag} due to role hierarchy or missing ManageRoles perm.`;
        console.error(msg);
        if (logCh && logCh.isTextBased?.()) await logCh.send(`⚠️ ${msg}`);
        return;
      }
      await member.roles.add(roleId, reason).catch(err => {
        console.error(`[BOOSTER] Failed to add role to ${member.user.tag}:`, err.message);
      });
    }

    // Helper: safe remove role(s) with checks
    async function safeRemoveRoles(member, roleIds, reason) {
      if (!roleIds || !roleIds.length) return;
      const removable = roleIds.filter(rid => {
        const role = guild.roles.cache.get(rid);
        return role && canManageRoles && botPos > role.position;
      });
      if (!removable.length) {
        console.error(`[BOOSTER] No removable roles for ${member.user.tag} (hierarchy/perm blocked).`);
        return;
      }
      await member.roles.remove(removable, reason).catch(err => {
        console.error(`[BOOSTER] Failed to remove roles from ${member.user.tag}:`, err.message);
      });
    }

    // Who started boosting? (either detection)
    if (startedByTimestamp || startedByRole) {
      console.log(`[BOOSTER] ${newMember.user.tag} started boosting (timestamp:${startedByTimestamp} role:${startedByRole}).`);
      await safeAddRole(newMember, SPECIAL_BOOSTER_ROLE_ID, 'Auto: user started boosting');
      if (logCh && logCh.isTextBased?.()) {
        await logCh.send(`🚀 **${newMember.user.tag}** started boosting — added <@&${SPECIAL_BOOSTER_ROLE_ID}>.`);
      }
    }

    // Who stopped boosting? (either detection)
    if (stoppedByTimestamp || stoppedByRole) {
      console.log(`[BOOSTER] ${newMember.user.tag} stopped boosting (timestamp:${stoppedByTimestamp} role:${stoppedByRole}).`);

      // remove special booster role
      await safeRemoveRoles(newMember, [SPECIAL_BOOSTER_ROLE_ID], 'Auto: user stopped boosting');

      // remove configured booster color roles too
      const colorsToRemove = (BOOSTER_COLOR_ROLE_IDS || []).filter(id => newMember.roles.cache.has(id));
      if (colorsToRemove.length > 0) {
        await safeRemoveRoles(newMember, colorsToRemove, 'Auto: booster expired - clean colors');
      }

      if (logCh && logCh.isTextBased?.()) {
        await logCh.send(`📉 **${newMember.user.tag}** stopped boosting — removed booster roles${colorsToRemove.length ? ` and colors (${colorsToRemove.map(r => `<@&${r}>`).join(', ')})` : ''}.`);
      }
    }
  } catch (err) {
    console.error('Error in consolidated guildMemberUpdate booster handler:', err);
  }
});

// --- DEBUG BLOCK (temporary) ---
async function debugSyncBoostersNow(guild) {
  try {
    const members = await guild.members.fetch();
    console.log(`[DBG-SYNC] members fetched: ${members.size}`);
    let added = 0, removed = 0;
    for (const member of members.values()) {
      const hasDiscordBooster = (BOOSTER_ROLE_IDS || []).some(id => member.roles.cache.has(id));
      const hasSpecial = member.roles.cache.has(SPECIAL_BOOSTER_ROLE_ID);
      if (hasDiscordBooster && !hasSpecial) {
        await member.roles.add(SPECIAL_BOOSTER_ROLE_ID, 'DBG Sync add').then(() => added++).catch(err => console.error('[DBG-SYNC] add error', member.user.tag, err.message));
      }
      if (!hasDiscordBooster && hasSpecial) {
        await member.roles.remove(SPECIAL_BOOSTER_ROLE_ID, 'DBG Sync remove').then(() => removed++).catch(err => console.error('[DBG-SYNC] remove error', member.user.tag, err.message));
      }
    }
    console.log(`[DBG-SYNC] complete. added=${added} removed=${removed}`);
  } catch (err) {
    console.error('[DBG-SYNC] error', err);
  }
}

// Replace any existing guildMemberUpdate handlers with this diagnostic one
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Fetch partials if needed
    if (oldMember.partial) await oldMember.fetch().catch(() => null);
    if (newMember.partial) await newMember.fetch().catch(() => null);

    const guild = newMember.guild;
    const logPre = {
      user: newMember.user.tag + ' (' + newMember.id + ')',
      oldBoostTs: oldMember?.premiumSinceTimestamp ?? null,
      newBoostTs: newMember?.premiumSinceTimestamp ?? null,
      oldRoles: oldMember.roles.cache.map(r => `${r.id}:${r.name}`).slice(0,50),
      newRoles: newMember.roles.cache.map(r => `${r.id}:${r.name}`).slice(0,50),
      hasAnyBoosterRole_old: (BOOSTER_ROLE_IDS || []).some(id => oldMember.roles.cache.has(id)),
      hasAnyBoosterRole_new: (BOOSTER_ROLE_IDS || []).some(id => newMember.roles.cache.has(id)),
    };

    console.log('[DBG<GUILD_MEMBER_UPDATE>] change detected:', JSON.stringify(logPre, null, 2));

    // Bot member and permissions/positions
    const me = await guild.members.fetchMe();
    const botCanManage = me.permissions.has('ManageRoles');
    const botPos = me.roles.highest.position;
    const specialRole = guild.roles.cache.get(SPECIAL_BOOSTER_ROLE_ID);
    console.log(`[DBG] botCanManage=${botCanManage}, botPos=${botPos}, specialRolePos=${specialRole ? specialRole.position : 'n/a'}`);

    // Detect transitions
    const startedByTimestamp = Boolean(!oldMember?.premiumSinceTimestamp && newMember?.premiumSinceTimestamp);
    const stoppedByTimestamp = Boolean(oldMember?.premiumSinceTimestamp && !newMember?.premiumSinceTimestamp);
    const startedByRole = (BOOSTER_ROLE_IDS || []).some(id => !oldMember.roles.cache.has(id) && newMember.roles.cache.has(id));
    const stoppedByRole = (BOOSTER_ROLE_IDS || []).some(id => oldMember.roles.cache.has(id) && !newMember.roles.cache.has(id));

    console.log(`[DBG] startedByTimestamp=${startedByTimestamp}, stoppedByTimestamp=${stoppedByTimestamp}, startedByRole=${startedByRole}, stoppedByRole=${stoppedByRole}`);

    // Try to act based on changes and log any errors
    if (startedByTimestamp || startedByRole) {
      console.log(`[DBG] Attempting to add special role ${SPECIAL_BOOSTER_ROLE_ID} to ${newMember.user.tag}`);
      if (!specialRole) {
        console.error('[DBG] specialRole not found in guild.roles');
      } else if (!botCanManage || botPos <= specialRole.position) {
        console.error('[DBG] cannot add role due to hierarchy/permissions');
      } else {
        await newMember.roles.add(SPECIAL_BOOSTER_ROLE_ID, 'DBG: auto add on boost').then(() => {
          console.log(`[DBG] successfully added special role to ${newMember.user.tag}`);
        }).catch(err => console.error('[DBG] add failed:', err && err.message ? err.message : err));
      }
    }

    if (stoppedByTimestamp || stoppedByRole) {
      console.log(`[DBG] Attempting to remove special role ${SPECIAL_BOOSTER_ROLE_ID} from ${newMember.user.tag}`);
      if (!specialRole) {
        console.error('[DBG] specialRole not found in guild.roles (remove)');
      } else if (!botCanManage || botPos <= specialRole.position) {
        console.error('[DBG] cannot remove role due to hierarchy/permissions');
      } else {
        await newMember.roles.remove(SPECIAL_BOOSTER_ROLE_ID, 'DBG: auto remove on boost stop').then(() => {
          console.log(`[DBG] successfully removed special role from ${newMember.user.tag}`);
        }).catch(err => console.error('[DBG] remove failed:', err && err.message ? err.message : err));
      }
    }
  } catch (err) {
    console.error('[DBG] Error in diagnostic guildMemberUpdate:', err);
  }
});


// --- BOOSTER SYNC + DEBUG (paste after your constants) ---
async function debugSyncBoostersNow(guild) {
  try {
    const members = await guild.members.fetch();
    console.log(`[DBG-SYNC] members fetched: ${members.size} for guild ${guild.id}`);
    let added = 0, removed = 0;
    for (const member of members.values()) {
      // whether Discord's premium flag/role indicates booster
      const isDiscordBooster = Boolean(member.premiumSinceTimestamp);
      const hasAnyBoosterRole = (BOOSTER_ROLE_IDS || []).some(id => member.roles.cache.has(id));
      const hasSpecial = member.roles.cache.has(SPECIAL_BOOSTER_ROLE_ID);

      // treat booster if either premium flag set OR has any booster role
      const currentlyBooster = isDiscordBooster || hasAnyBoosterRole;

      if (currentlyBooster && !hasSpecial) {
        await member.roles.add(SPECIAL_BOOSTER_ROLE_ID, 'DBG Sync add')
          .then(() => { added++; console.log(`[DBG-SYNC] add ok ${member.user.tag}`); })
          .catch(e => console.error('[DBG-SYNC] add error', member.user.tag, e?.message || e));
      }
      if (!currentlyBooster && hasSpecial) {
        await member.roles.remove(SPECIAL_BOOSTER_ROLE_ID, 'DBG Sync remove')
          .then(() => { removed++; console.log(`[DBG-SYNC] remove ok ${member.user.tag}`); })
          .catch(e => console.error('[DBG-SYNC] remove error', member.user.tag, e?.message || e));
      }
    }
    console.log(`[DBG-SYNC] complete. added=${added} removed=${removed}`);
  } catch (err) {
    console.error('[DBG-SYNC] fatal', err);
  }
}

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // fetch partials when necessary
    if (oldMember?.partial) await oldMember.fetch().catch(() => null);
    if (newMember?.partial) await newMember.fetch().catch(() => null);

    const guild = newMember.guild;
    if (!guild || guild.id !== GUILD_ID) return; // limit to configured guild

    // Prepare debug info
    const logPre = {
      user: `${newMember.user.tag} (${newMember.id})`,
      oldBoostTs: oldMember?.premiumSinceTimestamp ?? null,
      newBoostTs: newMember?.premiumSinceTimestamp ?? null,
      oldRolesSample: oldMember.roles.cache.map(r => `${r.id}:${r.name}`).slice(0, 30),
      newRolesSample: newMember.roles.cache.map(r => `${r.id}:${r.name}`).slice(0, 30),
      hasAnyBoosterRole_old: (BOOSTER_ROLE_IDS || []).some(id => oldMember.roles.cache.has(id)),
      hasAnyBoosterRole_new: (BOOSTER_ROLE_IDS || []).some(id => newMember.roles.cache.has(id)),
    };
    console.log('[DBG<GUILD_MEMBER_UPDATE>] change detected:', JSON.stringify(logPre, null, 2));

    // fetch bot member and role positions
    const me = guild.members.me || await guild.members.fetchMe();
    const botCanManage = me.permissions.has('ManageRoles', true);
    const botPos = me.roles.highest.position;
    const specialRole = guild.roles.cache.get(SPECIAL_BOOSTER_ROLE_ID);
    const specialPos = specialRole ? specialRole.position : null;
    console.log(`[DBG] botCanManage=${botCanManage}, botPos=${botPos}, specialRolePos=${specialPos}`);

    // Detect transitions (either via premium timestamp change OR role changes)
    const startedByTimestamp = Boolean(!oldMember?.premiumSinceTimestamp && newMember?.premiumSinceTimestamp);
    const stoppedByTimestamp = Boolean(oldMember?.premiumSinceTimestamp && !newMember?.premiumSinceTimestamp);
    const startedByRole = (BOOSTER_ROLE_IDS || []).some(id => !oldMember.roles.cache.has(id) && newMember.roles.cache.has(id));
    const stoppedByRole = (BOOSTER_ROLE_IDS || []).some(id => oldMember.roles.cache.has(id) && !newMember.roles.cache.has(id));

    console.log(`[DBG] startedByTimestamp=${startedByTimestamp}, stoppedByTimestamp=${stoppedByTimestamp}, startedByRole=${startedByRole}, stoppedByRole=${stoppedByRole}`);

    // Decide add/remove
    if (startedByTimestamp || startedByRole) {
      console.log(`[DBG] Attempting to ADD special role ${SPECIAL_BOOSTER_ROLE_ID} to ${newMember.user.tag}`);
      if (!specialRole) {
        console.error('[DBG] specialRole not found in guild.roles');
      } else if (!botCanManage || botPos <= specialPos) {
        console.error('[DBG] cannot add role due to hierarchy/permissions');
      } else {
        await newMember.roles.add(SPECIAL_BOOSTER_ROLE_ID, 'Auto add on boost').then(() => {
          console.log(`[DBG] successfully added special role to ${newMember.user.tag}`);
        }).catch(err => console.error('[DBG] add failed:', err?.message || err));
      }
    }

    if (stoppedByTimestamp || stoppedByRole) {
      console.log(`[DBG] Attempting to REMOVE special role ${SPECIAL_BOOSTER_ROLE_ID} from ${newMember.user.tag}`);
      if (!specialRole) {
        console.error('[DBG] specialRole not found in guild.roles (remove)');
      } else if (!botCanManage || botPos <= specialPos) {
        console.error('[DBG] cannot remove role due to hierarchy/permissions');
      } else {
        // remove the special role
        await newMember.roles.remove(SPECIAL_BOOSTER_ROLE_ID, 'Auto remove on boost stop')
          .then(() => console.log(`[DBG] successfully removed special role from ${newMember.user.tag}`))
          .catch(err => console.error('[DBG] remove failed:', err?.message || err));

        // remove booster color roles if present
        for (const colorId of (BOOSTER_COLOR_ROLE_IDS || [])) {
          if (newMember.roles.cache.has(colorId)) {
            await newMember.roles.remove(colorId, 'Auto remove booster color role on boost stop')
              .then(() => console.log(`[DBG] removed color ${colorId} from ${newMember.user.tag}`))
              .catch(e => console.error('[DBG] remove color failed', colorId, e?.message || e));
          }
        }
      }
    }
  } catch (err) {
    console.error('[DBG] Error in guildMemberUpdate handler:', err);
  }
});


// Main MessageCreate event
async function sendModLog(guild, embed) {
    const botMember = guild.members.me;
    const modLogChannel = guild.channels.cache.find(
        channel => channel.name === 'mod-log' || channel.name === 'mod-logs'
    );
    if (modLogChannel?.permissionsFor(botMember)?.has('SendMessages')) {
        await modLogChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

function addLog(userId, type, moderator, reason, duration = null) {
    if (!punishmentLogs.has(userId)) punishmentLogs.set(userId, { warns: [], mutes: [], bans: [], notes: [] });
    const userLogs = punishmentLogs.get(userId);
    const caseId = globalCaseCounter++;
    const entry = { caseId, type, moderator, reason, timestamp: new Date().toUTCString(), duration };

    if (type === "warn") userLogs.warns.push(entry);
    else if (type === "mute") userLogs.mutes.push(entry);
    else if (type === "ban") userLogs.bans.push(entry);
    else if (type === "note") {
        if (!userLogs.notes) userLogs.notes = [];
        userLogs.notes.push(entry);
    }
	savePunishmentLogs();
	    return caseId;
}


// ========== MESSAGE HANDLER ==========
client.on(Events.MessageCreate, async (message) => {
  try {
    // 0) Ignore bots
    if (message.author.bot) return;

    // ===== 1) DM forwarder =====
    if (!message.guild) {
      try {
        console.log(`[DM RECEIVED] From: ${message.author.tag} (${message.author.id})`);
        console.log(`[DM CONTENT] ${message.content}`);

        const logCh = await client.channels.fetch(DM_LOG_CHANNEL_ID).catch(() => null);
        if (!logCh) return console.error('[DM FORWARDER] DM log channel not found');

        const dmEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setAuthor({
            name: `DM from ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setDescription(message.content || '[No text]')
          .addFields(
            { name: '👤 User ID', value: message.author.id, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(message.author.createdTimestamp/1000)}:R>`, inline: true }
          )
          .setFooter({ text: 'DM → Arabica Bot' })
          .setTimestamp();

        if (message.attachments.size) {
          const links = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
          dmEmbed.addFields({ name: '📎 Attachments', value: links });
          const firstImg = message.attachments.find(a => a.contentType?.startsWith('image/'));
          if (firstImg) dmEmbed.setImage(firstImg.url);
        }

        await logCh.send({ embeds: [dmEmbed] });
        await message.reply('Thanks, your DM has been forwarded to staff.');
      } catch (e) {
        console.error('[DM FORWARDER]', e);
      }
      return;
    }

    // ===== 2) Ensure member object =====
    if (!message.member) {
      message.member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (!message.member) return;
    }

const isScamLink = isScamMessage(message.content);
    const repeatCount = checkRepeatedMessage(message.author.id, message.content);
    const isRepeatedSpam = repeatCount >= MAX_SCAM_OFFENSES;

    if (isScamLink || isRepeatedSpam) {
        try {
            await message.delete();
        } catch (err) {
            console.error("Failed to delete message:", err.message);
        }

        const reason = isScamLink
            ? "suspected scam link"
            : `sending the same message ${repeatCount} times`;

        try {
            const warning = await message.channel.send(
                `⚠️ ${message.author}, your message was removed for ${reason}.`
            );
            setTimeout(() => warning.delete().catch(() => {}), 8000);
        } catch (err) {}

        const shouldMute = isRepeatedSpam || incrementScamOffenseCount(message.author.id) >= MAX_SCAM_OFFENSES;

        if (shouldMute) {
            let muteRole = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);

            if (!muteRole) {
                try {
                    muteRole = await message.guild.roles.create({
                        name: MUTE_ROLE_NAME,
                        reason: "Auto-created for moderation",
                    });
                    message.guild.channels.cache.forEach(async (channel) => {
                        try {
                            if (channel.isTextBased()) {
                                await channel.permissionOverwrites.edit(muteRole, {
                                    SendMessages: false,
                                    AddReactions: false,
                                });
                            }
                        } catch (e) {}
                    });
                } catch (err) {
                    console.error("Could not create Muted role:", err.message);
                }
            }

            if (muteRole) {
                try {
                    await message.member.roles.add(muteRole, `Auto-muted: ${reason}`);
                    await message.channel.send(`🔇 ${message.author} has been permanently muted for ${reason}.`);
                } catch (err) {
                    await message.channel.send("⚠️ Failed to mute user. Ensure my bot's role is positioned above the Muted role in Server Settings > Roles.");
                }
            }
        }
        return;
    }
    // ===== 2.6) Owner command: block an image =====
    if (message.content === '!blockimage' && message.attachments.size > 0) {
        if (message.author.id !== '781007535267119138') return;
        for (const attachment of message.attachments.values()) {
            const hash = await hashAttachment(attachment.url);
            addScamImageHash(hash);
        }
        message.reply('✅ Image hash added to scam block list.');
        return;
    }

    // ===== 3) AI mentions & replies (no prefix) =====
    const PREFIX = process.env.PREFIX || 'a!';
    const content = message.content.trim();
    const isMentioned = message.mentions.has(client.user);
    const repliedMsg = message.reference?.messageId
      ? await message.channel.messages.fetch(message.reference.messageId).catch(()=>null)
      : null;
    const isReplyToBot = repliedMsg?.author?.id === client.user.id;
    const hasMassMention = message.mentions.everyone || message.mentions.roles.size > 0;

    if (!hasMassMention && (isMentioned || isReplyToBot) && !content.toLowerCase().startsWith(PREFIX)) {
      // channel restriction
      if (AI_ALLOWED_CHANNELS.length && !AI_ALLOWED_CHANNELS.includes(message.channel.id)) {
        return message.reply('⚠️ AI is only available in designated channels.');
      }
      if (content.toLowerCase().includes('clearai')) return;
      if (content.toLowerCase().includes('forget our chat')) {
        conversationHistory.delete(message.author.id);
        return message.reply("I've forgotten our chat.");
      }
      const question = content.replace(/<@!?(\d+)>/g, '').trim();
      if (question) return handleAIResponse(message, question, false);
    }

    // ===== 4) Prefix commands & debug-sync =====
    if (!content.startsWith(PREFIX)) {
      // fall through to AFK/add-take below
    } else {
      const parts = content.slice(PREFIX.length).trim().split(/\s+/);
      const commandName = parts.shift().toLowerCase();
      const args = parts;

      console.log(`🔍 Command detected: ${commandName}`);

      // — debug sync booster
      if (commandName === 'dbg-sync-boosters') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          return message.reply('❌ No permission.');
        }
        await message.reply('Starting debug sync…');
        await debugSyncBoostersNow(message.guild);
        return message.reply('Debug sync finished.');
      }

      // — general command router
      const fileCommand =
        client.commands.get(commandName) ||
        client.commands.find(cmd => cmd.aliases?.includes(commandName));

      console.log('Found command:', fileCommand ? 'YES' : 'NO');
      if (fileCommand) {
        // pass your entire tools/context object here
        return fileCommand.execute(message, args, client, {
          snipes,
          PREFIX,
          hasStaffRole,
          NO_PERMISSION_MESSAGE,
          FOURTEEN_DAYS,
          scamMutedUsers,
          noPermissionResponses,
          activeMutes,
          saveMutes,
          performUnmute,
          focusSessions,
          saveFocus,
          endFocus,
          focusRole: message.guild.roles.cache.get('1480393357640335472'),
          levelRoles,
          addLog,
          sendModLog,
          punishmentLogs,
          voiceHistory,
          focusStats,
          voiceStats,
          TOPICS_EN,
          TOPICS_AR,
          saveFocusStats,
          calculateStats,
          conversationHistory,
          QURAN_VERSES,
          normalizeArabic,
          formatTime,
          formatCEST,
          getBalance,
	  hashAttachment,
	  addScamImageHash,
          addBalance
        }).catch(err => {
          console.error(`Command error (a!${commandName}):`, err);
          return message.reply('❌ Error executing command.');
        });
      }
    }

    // ===== 5) AFK removal & mention =====
    if (message.client.afkUsers?.has(message.author.id)) {
      message.client.afkUsers.delete(message.author.id);
      const back = await message.reply(`✅ Welcome back <@${message.author.id}>! AFK removed.`);
      setTimeout(()=>back.delete().catch(()=>{}), 30_000);
    }
    if (message.mentions.users.size) {
      for (const [id] of message.mentions.users) {
        const afk = message.client.afkUsers?.get(id);
        if (afk) {
          const ago = Date.now() - afk.since;
          const timeAgo = formatAgo(ago);
          const afkMsg = await message.reply(`💤 ${message.guild.members.cache.get(id)?.displayName||`<@${id}>`} is AFK: ${afk.message} (${timeAgo})`);
          setTimeout(()=>afkMsg.delete().catch(()=>{}), 30_000);
        }
      }
    }

    // ===== 6) add / take balance =====
    const parts2 = content.split(/\s+/);
    const cmd2 = parts2[0]?.slice(PREFIX.length).toLowerCase();
    if (['add','take'].includes(cmd2)) {
      const ALLOWED = '781007535267119138';
      if (message.author.id !== ALLOWED) {
        return message.reply("❌ You don't have permission.");
      }
      const target =
        message.mentions.users.first() ||
        await client.users.fetch(parts2[1]).catch(()=>null);
      if (!target) return message.reply("❌ Mention user or valid ID.");
      const amount = parseFloat(message.mentions.users.first() ? parts2[1] : parts2[2]);
      if (isNaN(amount)||amount<=0) return message.reply("❌ Provide valid amount.");

      if (cmd2 === 'add') {
        addBalance(target.id, amount);
        return message.reply(`✅ Added ${amount.toFixed(2)} to <@${target.id}>. New: ${getBalance(target.id).toFixed(2)}`);
      } else {
        const cur = getBalance(target.id);
        if (amount > cur) return message.reply(`❌ <@${target.id}> only has ${cur.toFixed(2)}.`);
        addBalance(target.id, -amount);
        return message.reply(`✅ Removed ${amount.toFixed(2)} from <@${target.id}>. New: ${getBalance(target.id).toFixed(2)}`);
      }
    }

  } catch (err) {
    console.error('[MSG HANDLER] Uncaught error:', err);
  }
});

	// Unified AI handler
	async function handleAIResponse(message, question, isCommand) {
    const channelId = message.channel.id;

    const settings = CHANNEL_LANGUAGE_SETTINGS[channelId] || {
        dialect: "auto",
        allowEnglish: true
    };

    console.log(`Channel ${channelId} settings:`, settings);

    const systemPrompt = {
        role: "system",
        content: `
	You are Arabica, a friendly and helpful member of this Discord server, developed by Jelly.

	Language & Dialect Rules:
	- Primary channel dialect setting: ${settings.dialect}
	- Always reply in the same language the user is using
	- If user writes in English → reply in English
	- If user writes in Arabic → match their dialect (MSA, Egyptian, Levantine, Gulf, Darija)
	- Do NOT mix dialects unless the user is clearly mixing them
	- Only switch language if explicitly asked to translate
	- If channel has a locked dialect (not "auto"), use that dialect consistently
	- Be fluent in Modern Standard Arabic (MSA), Egyptian, Levantine, Gulf, and Moroccan (Darija) dialects
	- Clearly differentiate between dialects when asked
	- Be extremely accurate with translations
	- If user speaks wrong language for the channel, politely remind them of the rules
	- Example: If channel=arabic-only and user writes in English, say: "هذا القناة للغة العربية الفصحى فقط. يرجى استخدام العربية الفصحى"
	- Use Moroccan Darija, Egyptian and Levantine franco and arabic when appropriate
	- خصك تهضر معايا بدارجة

	Personality & Behavior:
	- Be friendly and approachable, chill and fun
	- Be serious and mature when needed
	- Don't be creepy, weird, too formal, or too casual
	- Maintain conversation context
	- Don't repeat same phrases again and again
	- Use emojis but don't overuse them
	- Keep responses focused and relevant
	- Be concise unless detail is requested
	- Don't add unnecessary information
	- Be culturally appropriate

	Knowledge & Expertise:
	- Acknowledge Islam, Allah, and Prophet Muhammad (peace be upon him) respectfully
	- Use mature and accurate explanations
	- Know chemistry, biology, physics, math, other science classes, and medical field
	- Know history of all Arabic countries
	- Provide clear dialect comparisons when asked
	- Share authentic idioms and expressions when requested
	- Ask for clarification if dialect is unclear
	- Know history, cultures, countries and their holidays and important dates

	Server Members:
	- Schoolboy is your father and the best owner of the server
	- C2, Koukou,  Azalea, Slimkah, Worldline, Bloomie, Falcon, Hamza, Systèm, Zero, Black Cat, and Jack are nice moderators
	- Horus the admin is cool, but strict and tough
	- Admins: Horus, Jelly, Schoolboy, Jen, Abdulazeez
	- Don't mention other members or names when asked about one person
	- You were developed by the Deepseek AI

	Content Rules:
	- Politely refuse prohibited topics (politics, NSFW, violence, explicit religious debates)
	- Format code properly when sharing it
	- When providing mathematical equations: Use inline format like (1/R1 + 1/R2) instead of LaTeX fractions
	- Use standard symbols (π, θ, √) instead of LaTeX commands
	- Keep equations simple and Discord-compatible
	- Use ||spoilers|| when giving question examples and their solutions or answers
	- Use bullet points when long answers or listing is needed
        `.trim()
    };

    await message.channel.sendTyping();
    const userId = message.author.id;

    if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, []);
    }
    const history = conversationHistory.get(userId);

    const messages = [
        systemPrompt,
        ...history,
        { role: "user", content: question }
    ];

    try {
        const completion = await callDeepSeekAPI(messages);
        let response = completion.choices[0].message.content;

        // 🔹 Sanitize dangerous pings from AI output
        response = response
            .replace(/@everyone/gi, '@\u200Beveryone')
            .replace(/@here/gi, '@\u200Bhere')
            .replace(/<@&\d+>/g, '@role')
            .replace(/<@!?(\d+)>/g, '@user');

        // Validate response language only if dialect is locked
        const lockedDialects = ["arabic", "msa", "egyptian", "levantine", "gulf", "darija"];
        if (
            lockedDialects.includes(settings.dialect) &&
            !validateLanguage(response, settings)
        ) {
            return message.reply(getLanguageReminder(settings.dialect));
        }

        if (containsProhibitedTopic(response)) {
            return message.reply("I apologize, but I cannot provide that type of response.");
        }

        // Update history
        const updatedHistory = conversationHistory.get(userId) || [];
        updatedHistory.push({ role: "user", content: question });
        updatedHistory.push({ role: "assistant", content: response });
        while (updatedHistory.length > MAX_HISTORY * 2) updatedHistory.shift();
        conversationHistory.set(userId, updatedHistory);

        // Handle long responses
        if (response.length > 2000) {
            const chunks = splitMessage(response);
            let firstChunk = true;

            for (const chunk of chunks) {
                if (firstChunk && isCommand) {
                    const embed = createResponseEmbed(message, question, chunk, updatedHistory);
                    await message.reply({ embeds: [embed] });
                    firstChunk = false;
                } else {
                    await message.reply(chunk);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return;
        }

        // Send normal length response
        if (isCommand) {
            const responseEmbed = createResponseEmbed(message, question, response, updatedHistory);
            await message.reply({ embeds: [responseEmbed] });
        } else {
            await message.reply(response);
        }
    } catch (error) {
        console.error("AI Error:", error);
        if (error.code === 50035) {
            await message.reply("Response too long, trying a shorter version...");
            return handleAIResponse(message, "Give a much shorter summary of your previous answer.", isCommand);
        }
        try {
            await message.reply("Sorry, I encountered an error. Please try again.");
        } catch {
            // ignore
        }
    }
}

// Helper function to create response embed
function createResponseEmbed(message, question, response, history) {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({
            name: 'Arabica AI',
            iconURL: message.client.user.displayAvatarURL()
        })
        .addFields(
            { name: '❓ Question', value: truncate(question, 1024) },
            { name: '💭 Response', value: truncate(response, 1024) }
        )
        .setFooter({
            text: `Asked by ${message.author.tag} | Memory: ${Math.floor(history.length / 2)}/${MAX_HISTORY}`,
            iconURL: message.author.displayAvatarURL()
        })
        .setTimestamp();
}

// Helper function to split long messages
function splitMessage(text, maxLength = 2000) {
    const chunks = [];
    while (text.length > 0) {
        let chunk = text.slice(0, maxLength);
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline > 0 && chunk.length === maxLength) {
            chunk = chunk.slice(0, lastNewline);
        }
        chunks.push(chunk);
        text = text.slice(chunk.length);
    }
    return chunks;
}

// 🔹artwork reminder block
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === ISLAMIC_IMAGE_REMINDER_CHANNEL_ID) {
        try {
            const lastReminderId = islamicReminderMessages.get(message.channel.id);
            if (lastReminderId) {
                const lastMsg = await message.channel.messages.fetch(lastReminderId).catch(() => null);
                if (lastMsg) {
                    await lastMsg.delete().catch(() => {});
                }
            }

            const reminderEmbed = new EmbedBuilder()
                .setColor(0xFFCC00)
                .setTitle('⚠️ تذكير مهم | Important Reminder')
                .setDescription(
		    '**ضوابط نشر الأعمال الفنية:**\n' +
		    '• يُرجى الاكتفاء برسم الجمادات والمناظر الطبيعية والزخارف\n' +
		    '• يُرجى تجنب تصوير ذوات الأرواح (البشر والحيوانات)\n' +
		    '• يجب أن تكون الصور لائقة ومناسبة للجميع\n' +
		    '• نعتذر عن استقبال التماثيل والمجسمات للكائنات الحية\n\n' +
		    '**Artistic Content Guidelines:**\n' +
		    '• Please focus on drawing inanimate objects, nature, and patterns\n' +
		    '• Please avoid depicting living beings (humans and animals)\n' +
		    '• All images must be modest and appropriate for all members\n' +
		    '• We do not accept statues or sculptures of living creatures\n\n' +
                    'جزاكم الله خيرًا على التزامكم واحترامكم. 🤍\n' +
                    'May Allah reward you for your commitment and respect.'
                )
                .setFooter({ text: 'القناة ملتزمة بالأحكام الشرعية | This channel follows Islamic rulings' })
                .setTimestamp();

            const sent = await message.channel.send({ embeds: [reminderEmbed] });
            islamicReminderMessages.set(message.channel.id, sent.id);

        } catch (err) {
            console.error('Islamic reminder error:', err);
        }
    }
});

// Owner notification when mentioned
const OWNER_ID = '781007535267119138';

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    if (content.includes('jelly') || content.includes('جيلي')) {
        try {
            const owner = await client.users.fetch(OWNER_ID);
            let serverName = message.guild ? message.guild.name : 'DM';
            let channelName = message.channel && message.channel.name ? `#${message.channel.name}` : 'DM';
            let link = message.guild
                ? `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`
                : 'No link (DM)';
            await owner.send(
                `🔔 **Mention detected:**\n` +
                `Server: ${serverName}\n` +
                `Channel: ${channelName}\n` +
                `User: ${message.author.tag}\n` +
                `Message: ${message.content}\n` +
                `Link: ${link}`
            );
        } catch (err) {
            console.error('Failed to DM owner:', err);
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "appeal_ban") {
        try {
            console.log("✅ Button clicked:", interaction.user.id);

            // ✅ ALWAYS defer immediately (prevents timeout)
            await interaction.deferReply({ ephemeral: true });

            // ✅ Then edit reply (safe)
            await interaction.editReply({
                content: "✅ Your ban appeal has been submitted. Staff will review it shortly."
            });

            // ✅ Send to staff channel
            const staffChannel = client.channels.cache.get("1446600877581271080");

            if (staffChannel) {
                const { EmbedBuilder } = require('discord.js');

                const embed = new EmbedBuilder()
                    .setTitle("📩 Ban Appeal")
                    .setColor(0x5865F2)
                    .setDescription(`User: ${interaction.user.tag}\nID: ${interaction.user.id}`)
                    .setTimestamp();

                await staffChannel.send({ embeds: [embed] });
            }

        } catch (err) {
            console.error("APPEAL ERROR:", err);

            // ✅ fallback reply if something breaks
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Something went wrong. Please try again.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
        // Ignore bots
        if (newState.member?.user?.bot) return;

        const userId = newState.id;

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // No change
        if (oldChannel?.id === newChannel?.id) return;

        if (!voiceHistory.has(userId)) {
            voiceHistory.set(userId, { sessions: [], current: null });
        }

        const data = voiceHistory.get(userId);

        const now = Date.now();

        // Helper: close existing session if any
        const closeCurrent = () => {
            if (data.current && data.current.joinedAt) {
                const joinedAtMs = new Date(data.current.joinedAt).getTime();
                const durationMs = Number.isNaN(joinedAtMs) ? null : (now - joinedAtMs);

                data.sessions.unshift({
                    channelId: data.current.channelId,
                    channelName: data.current.channelName,
                    joinedAt: data.current.joinedAt,
                    leftAt: new Date(now).toISOString(),
                    durationMs: durationMs ?? null,
                });

                // Keep last 200 sessions per user to prevent massive files
                if (data.sessions.length > 200) data.sessions = data.sessions.slice(0, 200);
            }
            data.current = null;
        };

        // User left VC
        if (oldChannel && !newChannel) {
            closeCurrent();
            saveVoiceHistory();
            return;
        }

        // User joined VC
        if (!oldChannel && newChannel) {
            data.current = {
                channelId: newChannel.id,
                channelName: newChannel.name,
                joinedAt: new Date(now).toISOString(),
            };
            saveVoiceHistory();
            return;
        }

        // User switched VC (old -> new)
        if (oldChannel && newChannel) {
            closeCurrent();
            data.current = {
                channelId: newChannel.id,
                channelName: newChannel.name,
                joinedAt: new Date(now).toISOString(),
            };
            saveVoiceHistory();
            return;
        }
    } catch (err) {
        console.error('❌ VoiceStateUpdate error:', err);
    }
});

const UNVERIFIED_ROLE_ID      = '1487824521351266476';
const VERIFIED_ROLE_IDS       = [
  '987729925173817424', // Verified Female
  '1501957694737748039'  // Verified Male
];

client.login(process.env.DISCORD_TOKEN);
