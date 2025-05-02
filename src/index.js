require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const OpenAI = require('openai');

const PREFIX = 'a!';
const snipes = new Map();
const conversationHistory = new Map();
const MAX_HISTORY = 10;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Define comprehensive rule violations and prohibited content
const RULE_VIOLATIONS = {
    // Rule 1 violations
    DISRESPECT: [
        "racist", "discrimination", "hate speech", "harassment", "offensive", "insult",
        "العنصرية", "التمييز", "خطاب الكراهية", "التحرش", "مسيئ", "إهانة"
    ],
    
    // Rule 2 violations (NSFW)
    NSFW: [
        "porn", "nsfw", "explicit", "adult content", "محتوى إباحي", "محتوى للبالغين",
        "عنف", "violent", "gore", "blood", "دم"
    ],
    
    // Rule 3 violations (LGBTQ+ content)
    LGBTQ: [
        "lgbt", "gay", "lesbian", "trans", "queer", "المثلية", "الشذوذ"
    ],
    
    // Rule 4 violations (Controversial topics)
    CONTROVERSIAL: [
        "genocide", "إبادة", "political", "سياسي", "religious debate", "جدل ديني",
        "sports fight", "تعصب رياضي"
    ],
    
    // Rule 5 violations (Advertising)
    ADVERTISING: [
        "join my server", "check out my", "advertisement", "promo", "إعلان", "دعاية",
        "انضم لسيرفر"
    ],
    
    // Rule 6 violations (Personal info)
    PERSONAL_INFO: [
        "phone number", "address", "email", "personal info", "رقم هاتف", "عنوان",
        "معلومات شخصية"
    ],
    
    // Other violations
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
    "drugs",
    "explicit",
    "Palestine",
    "religion",
    "Israel"
];

function checkRuleViolations(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    for (const [rule, keywords] of Object.entries(RULE_VIOLATIONS)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return {
                violated: true,
                rule: rule,
                message: getRuleViolationMessage(rule)
            };
        }
    }
    return null;
}

function getRuleViolationMessage(rule) {
    const messages = {
        DISRESPECT: "🚫 This content violates our respect policy. Please be polite and respectful to all members.",
        NSFW: "🚫 NSFW content is strictly prohibited in this server.",
        LGBTQ: "🚫 This type of content is not allowed in our server as per Rule 3.",
        CONTROVERSIAL: "🚫 Please avoid controversial topics as per Rule 4.",
        ADVERTISING: "🚫 Advertising is not allowed in this server.",
        PERSONAL_INFO: "🚫 Sharing personal information is not allowed for safety reasons.",
        SPAM: "🚫 Please avoid spamming or flooding the chat.",
        IMPERSONATION: "🚫 Impersonating others is not allowed.",
        DRAMA: "🚫 Please avoid creating drama or unnecessary arguments."
    };
    
    return messages[rule] || "🚫 This content violates our server rules.";
}

function containsProhibitedTopic(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return PROHIBITED_TOPICS.some(topic => lower.includes(topic));
}

const noPermissionResponses = [
    "Who do you think you are? Try another time 🤡",
    "Nice try, but you're not staff! 😂",
    "In your dreams! Staff only 😴",
    "You need a promotion first! 📈",
    "Sorry bestie, staff only command! 💅",
    "You don't have the power! ⚡",
    "Did you really think that would work? 🤔",
    "Maybe apply for staff first! 📝",
    "Not today, buddy! 🚫",
    "You're not that guy, pal! 👀",
    "Try to touch grass instead! 🌱"
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// MongoDB Schema
const messageLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, index: true },
    messageId: { type: String, required: true, unique: true },
    content: String,
    authorId: { type: String, required: true, index: true },
    authorTag: String,
    createdAt: { type: Date, required: true },
    deletedAt: { type: Date, required: true, index: true },
    attachments: [{
        url: String,
        proxyURL: String,
        name: String
    }]
});
const MessageLog = mongoose.model('MessageLog', messageLogSchema);

function hasStaffRole(member) {
    const staffRoles = ['Staff', 'Moderator', 'Admin', 'Administrator', 'Mod'];
    return member.roles.cache.some(role => 
        staffRoles.includes(role.name) ||
        member.permissions.has('Administrator') ||
        member.id === member.guild.ownerId
    );
}

// MongoDB Connection
async function testMongoConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connection successful!');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

// Initialize commands collection
client.commands = new Collection();

// Load slash commands
const commandsPath = path.join(__dirname, 'commands');
try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing required properties.`);
        }
    }
} catch (error) {
    console.error('Error loading commands:', error);
}

// Ready event
client.once(Events.ClientReady, async () => {
    console.log(`🪼 ${client.user.tag} is online`);
    await testMongoConnection();
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
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        const errorMessage = 'There was an error executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Message Delete Event (sniping)
client.on(Events.MessageDelete, async message => {
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
    if (channelSnipes.length > 5) channelSnipes.pop();
    snipes.set(message.channel.id, channelSnipes);

    // Store in MongoDB
    try {
        const messageLog = new MessageLog({
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: message.id,
            content: message.content,
            authorId: message.author.id,
            authorTag: message.author.tag,
            createdAt: message.createdAt,
            deletedAt: new Date(),
            attachments: message.attachments.map(att => ({
                url: att.url,
                proxyURL: att.proxyURL,
                name: att.name
            }))
        });
        await messageLog.save();
    } catch (error) {
        // Ignore duplicate key errors
        if (error.code !== 11000) console.error('Error saving message to MongoDB:', error);
    }
});

// Main MessageCreate event
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    // --- AI: Mention or reply ---
    const isMentioned = message.mentions.has(client.user);
    const isReplyToBot = message.reference?.messageId && 
        (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === client.user.id;

    // Only handle mention/reply if not a command
    if ((isMentioned || isReplyToBot) && !message.content.toLowerCase().startsWith(PREFIX)) {
        if (message.content.toLowerCase().includes('clearai')) return;
        if (message.content.toLowerCase().includes('forget our chat')) {
            conversationHistory.delete(message.author.id);
            return message.reply("Alright, I've forgotten our previous chat! 😊");
        }
        let question = message.content.replace(/<@!?(\d+)>/g, '').trim();
        if (question) {
            return handleCasualAIResponse(message, question);
        }
    }

    // --- Prefix commands ---
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Ping
    if (commandName === 'ping') {
        return message.reply(`👀 Pong! **${Math.round(client.ws.ping)}ms**`);
    }

    // HorusxFalcon
    if (commandName === 'horusxfalcon') {
        return message.reply('The best member here! 👑');
    }

    // Snipe command
if (commandName === 'snipe') {
    // Staff permission check
    if (!hasStaffRole(message.member)) {
        const randomResponse = noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)];
        return message.reply(randomResponse);
    }

    // Parse arguments
    let userId = null;
    let limit = 5; // Default limit

    // Handle arguments
    if (args.length > 0) {
        // Handle user identifier
        const userArg = args[0];
        // Check for mention
        const mentionMatch = userArg.match(/<@!?(\d+)>/);
        if (mentionMatch) {
            userId = mentionMatch[1];
        } 
        // Check if it's a direct user ID
        else if (/^\d+$/.test(userArg)) {
            userId = userArg;
        }
        // Check for username
        else {
            const member = message.guild.members.cache.find(m => 
                m.user.username.toLowerCase() === userArg.toLowerCase() ||
                m.displayName.toLowerCase() === userArg.toLowerCase()
            );
            if (member) userId = member.id;
        }

        // Handle limit argument
        if (args[1]) {
            const parsedLimit = parseInt(args[1]);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                limit = Math.min(parsedLimit, 10); // Cap at 10 messages
            }
        }
    }

    try {
        let deletedMessages = [];

        // Fetch messages based on userId
        if (userId) {
            // Try MongoDB first
            deletedMessages = await MessageLog.find({
                guildId: message.guild.id,
                authorId: userId
            })
            .sort({ deletedAt: -1 })
            .limit(limit)
            .lean(); // Use lean() for better performance

            // Fallback to memory cache if no MongoDB results
            if (!deletedMessages?.length) {
                const allChannelMessages = [];
                message.guild.channels.cache
                    .filter(channel => channel.type === 0) // Text channels only
                    .forEach(channel => {
                        const channelSnipes = snipes.get(channel.id) || [];
                        const userSnipes = channelSnipes.filter(snipe => 
                            snipe?.author?.id === userId
                        );
                        allChannelMessages.push(...userSnipes);
                    });

                deletedMessages = allChannelMessages
                    .sort((a, b) => b.deletedAt - a.deletedAt)
                    .slice(0, limit);
            }
        } else {
            // Current channel only
            deletedMessages = await MessageLog.find({
                guildId: message.guild.id,
                channelId: message.channel.id
            })
            .sort({ deletedAt: -1 })
            .limit(limit)
            .lean();

            // Fallback to memory cache
            if (!deletedMessages?.length) {
                const channelSnipes = snipes.get(message.channel.id) || [];
                deletedMessages = channelSnipes.slice(0, limit);
            }
        }

        // Check if we found any messages
        if (!deletedMessages?.length) {
            return message.reply({
                content: userId 
                    ? 'No deleted messages found for this user!' 
                    : 'No deleted messages found in this channel!',
                allowedMentions: { repliedUser: true }
            });
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setAuthor({
                name: `Command used by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setFooter({ 
                text: `Staff Member: ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        // Set title and description based on context
        if (userId) {
            const user = await client.users.fetch(userId).catch(() => null);
            const username = user?.tag || userId;
            embed.setTitle(`📜 Sniped Messages from ${username}`);
            embed.setDescription(`Showing last ${deletedMessages.length} deleted message(s) across all channels\n\u200b`);
        } else {
            embed.setTitle('📜 Sniped Messages');
            embed.setDescription(`Showing last ${deletedMessages.length} deleted message(s) in this channel\n\u200b`);
        }

        // Add message fields
        deletedMessages.forEach((msg, index) => {
            // Ensure we have valid data
            const messageContent = msg.content || '[no text content]';
            const authorTag = msg.authorTag || msg.author?.tag || 'Unknown User';
            const channelId = msg.channelId || 'unknown';
            const channelName = channelId !== 'unknown' ? `<#${channelId}>` : 'unknown channel';
            
            // Handle attachments
            const attachments = msg.attachments || [];
            const attachmentText = attachments.length > 0
                ? '\n' + attachments
                    .filter(att => att?.proxyURL) // Ensure attachment has proxyURL
                    .map(att => `📎 [Attachment](${att.proxyURL})`)
                    .join('\n')
                : '';

            // Add spacing between messages
            if (index > 0) {
                embed.addFields({ name: '\u200b', value: '\u200b' });
            }

            // Add message field
            embed.addFields({
                name: `${authorTag} was caught in ${channelName}`,
                value: `${messageContent}${attachmentText}\n*Erased at: ${new Date(msg.deletedAt).toLocaleString()}*\n`
            });

            // Add first attachment as embed image
            if (index === 0 && attachments.length > 0 && attachments[0]?.proxyURL) {
                embed.setImage(attachments[0].proxyURL);
            }
        });

        // Send the embed
        await message.reply({ 
            embeds: [embed],
            allowedMentions: { repliedUser: true }
        });

    } catch (error) {
        console.error('Error in snipe command:', error);
        await message.reply({
            content: 'There was an error retrieving the deleted messages. Please try again later.',
            allowedMentions: { repliedUser: true }
        });
    }
}

    // Scam
    if (commandName === 'scam') {
        try { await message.delete(); } catch {}
        if (!hasStaffRole(message.member)) {
            const randomResponse = noPermissionResponses[Math.floor(Math.random() * noPermissionResponses.length)];
            return message.channel.send(randomResponse);
        }
        if (!args[0]) {
            return message.channel.send('Please provide a user ID or mention! Usage: `a!scam [@user/userID] [optional duration in hours] [optional reason]`');
        }
        try {
            const targetUserId = args[0].replace(/[<@!>]/g, '');
            let targetMember;
            try {
                targetMember = await message.guild.members.fetch(targetUserId);
            } catch {
                return message.channel.send('Could not find that user in this server!');
            }
            const botMember = message.guild.members.me;
            if (!botMember.permissions.has(['ManageRoles', 'ManageMessages'])) {
                return message.channel.send('I need Manage Roles and Manage Messages permissions!');
            }
            if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
                return message.channel.send("I can't moderate this user due to role hierarchy!");
            }
            if (targetMember.id === message.guild.ownerId || targetMember.id === message.author.id) {
                return message.channel.send("Cannot moderate this user!");
            }
            const duration = !isNaN(args[1]) ? Math.min(parseInt(args[1]), 24) : 24;
            const reason = args.slice(isNaN(args[1]) ? 1 : 2).join(' ') || 'Scam Muted';
            let muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
            if (!muteRole) {
                try {
                    muteRole = await message.guild.roles.create({
                        name: 'Muted',
                        color: '#808080',
                        reason: 'Auto-created for muting members',
                        permissions: []
                    });
                    await Promise.all(message.guild.channels.cache.map(channel => 
                        channel.permissionOverwrites.create(muteRole, {
                            SendMessages: false,
                            AddReactions: false,
                            Speak: false,
                            Stream: false
                        }).catch(() => {})
                    ));
                } catch {
                    return message.channel.send('Failed to create mute role. Please check my permissions.');
                }
            }
            try { await targetMember.roles.add(muteRole); } catch { return message.channel.send('Failed to mute the user. Please check my permissions.'); }
            let totalDeleted = 0;
            const timeLimit = Date.now() - (24 * 60 * 60 * 1000);
            try {
                await Promise.all(message.guild.channels.cache
                    .filter(channel => channel.type === 0)
                    .map(async channel => {
                        if (channel.permissionsFor(botMember).has('ManageMessages')) {
                            const messages = await channel.messages.fetch({ limit: 100 });
                            const toDelete = messages.filter(m => 
                                m.author.id === targetUserId && 
                                m.createdTimestamp > timeLimit
                            );
                            if (toDelete.size > 0) {
                                await channel.bulkDelete(toDelete).catch(() => {});
                                totalDeleted += toDelete.size;
                            }
                        }
                    })
                );
            } catch {}
            const logEmbed = new EmbedBuilder()
                .setTitle('🛡️ Scam Muted')
                .setColor(0xFF0000)
                .setDescription(`**Target:** ${targetMember.user.tag} (${targetMember.id})
                **Action:** ${duration}-hour mute
                **Messages Deleted:** ${totalDeleted} (from last 24 hours)
                **Moderator:** ${message.author.tag}
                **Reason:** ${reason}`)
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            await message.channel.send({ embeds: [logEmbed] });
            try {
                await targetMember.send({
                    content: `You have been muted in **${message.guild.name}** for ${duration} hours.\nReason: ${reason}\n\nYour messages from the last 24 hours have been removed or simply join back the server following this link: https://discord.gg/eSPqKvXxYQ .`
                });
            } catch {}
            const modLogChannel = message.guild.channels.cache.find(
                channel => channel.name === 'mod-log' || channel.name === 'mod-logs'
            );
            if (modLogChannel?.permissionsFor(botMember)?.has('SendMessages')) {
                await modLogChannel.send({ embeds: [logEmbed] });
            }
            setTimeout(async () => {
                try {
                    if (targetMember.roles.cache.has(muteRole.id)) {
                        await targetMember.roles.remove(muteRole);
                        const unmuteEmbed = new EmbedBuilder()
                            .setTitle('🔓 User Unmuted')
                            .setColor(0x00FF00)
                            .setDescription(`**User:** ${targetMember.user.tag} (${targetMember.id})
                            **Action:** Automatic unmute after ${duration} hours`)
                            .setTimestamp();
                        if (modLogChannel?.permissionsFor(botMember)?.has('SendMessages')) {
                            await modLogChannel.send({ embeds: [unmuteEmbed] });
                        }
                    }
                } catch {}
            }, duration * 60 * 60 * 1000);
        } catch (error) {
            return message.channel.send('An error occurred while executing the command.');
        }
    }

    // Help
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Bot Commands')
            .setDescription('Here are all available commands:')
            .addFields(
                {
                    name: '🛡️ Moderation Commands',
                    value: `
                    \`${PREFIX}scam [@user/userID] [duration] [reason]\`
                    • Mutes a user and deletes their messages from the last 24 hours
                    • Duration in hours (default: 24, max: 24)
                    • Staff only command

                    \`${PREFIX}snipe [userID] [limit]\`
                    • Shows recently deleted messages
                    • Optional user ID to filter messages
                    • Limit: maximum number of messages to show (default: 5)
                    • Staff only command

                    \`${PREFIX}clearlogs [days]\`
                    • Clears stored message logs older than specified days
                    • Default: 30 days
                    • Administrator only command
                    `,
                    },
                 {
                    name: '📊 Utility Commands',
                    value: `
                    \`${PREFIX}ping\`
                    • Shows bot latency

                    \`${PREFIX}help\`
                    • Shows this help message

                    \`${PREFIX}ai <question>\` or \`${PREFIX}ask <question>\`
                    • Ask the AI assistant anything

                    \`${PREFIX}clearai\`
                    • Clears your AI conversation history
`
                  }
                    )
                    .setFooter({
                        text: `Prefix: ${PREFIX} | Server: ${message.guild.name}`,
                        iconURL: message.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();
                    await message.reply({ embeds: [helpEmbed] });
                }
         // AI Commands
    if (commandName === 'ai' || commandName === 'ask') {
        if (!args.length) {
            return message.reply('Please provide a question! Usage: `a!ai <your question>` or `a!ask <your question>`');
        }
        const question = args.join(' ');

        // Block prohibited topics in user question
        if (containsProhibitedTopic(question)) {
            return message.reply("🚫 Sorry, I can't discuss that topic.");
        }

        return handleCommandAIResponse(message, question);
    }

    // Clear AI conversation history
    if (commandName === 'clearai') {
        conversationHistory.delete(message.author.id);
        return message.reply("✨ Your conversation history has been cleared!");
    }
});

// --- Handler for a!ai and a!ask (EMBED) ---
async function handleCommandAIResponse(message, question) {
    await message.channel.sendTyping();
    const userId = message.author.id;

    // Check for rule violations
    const violation = checkRuleViolations(question);
    if (violation) {
        const warningEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('⚠️ Rule Violation Detected')
            .setDescription(violation.message)
            .addFields({
                name: 'Reminder',
                value: 'Please review our server rules and ensure your messages comply with them.'
            })
            .setTimestamp();
        return message.reply({ embeds: [warningEmbed] });
    }

    if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, []);
    }
    const history = conversationHistory.get(userId);

    const messages = [
        {
            role: "system",
            content: `You are Arabica, a friendly and helpful member of this Discord server. You were developed by Jellyfish.j, AKA Jelly 🪼. Your responses should be casual, natural, and conversational. You can use emojis and markdown, but do so naturally like a real person would. You should:
                - Be friendly and approachable
                - please acknowledge Islam, and Allah, and Prophet Muhammad peace be upon him
                - Use mature and more serious tone yet be more accurate in explanations
                - Show personality and warmth in your responses
                - Do not use emojis 
                - Format code when sharing it, but keep other formatting minimal
                - Maintain conversation context
                - Be accurate in Arabic dialects
                - Be fluent in Modern Standard Arabic (MSA), Egyptian, Levantine, Gulf, and Moroccan (Darija) dialects.
                - Clearly differentiate between these dialects when asked, and always use the correct dialect as requested by the user.
                - If the user does not specify a dialect, use Modern Standard Arabic (MSA) by default, but mention that you can provide answers in other dialects if needed.
                - When translating or explaining, be extremely accurate and context-aware, and mention which dialect you are using.
                - If a user asks for a translation or explanation in a specific dialect, always use that dialect and state which one you used.
                - If a user asks for a comparison between dialects, provide clear, concise examples for each.
                - If a user asks for slang or idioms, provide authentic, commonly used expressions for the requested dialect.
                - If you are unsure which dialect is meant, politely ask the user to clarify.
                - Never mix dialects in a single answer unless specifically requested.
                - Be concise unless the user asks for more detail
                - Make sure to diferentiate the Moroccan Arabic dialect from the Levantine Arabic dialect
                - If someone asks you to translate, be accurate with translation as well, the server you are in is only Arabic and English spoken server
                - Be fluent in Egyptian, Levantive, Darija, Gulf Arabic dialects
                - Be concise unless detail is requested`
        },
        ...history,
        {
            role: "user",
            content: question
        }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            max_tokens: 2048,
            temperature: 0.8,
            presence_penalty: 0.6,
            frequency_penalty: 0.3,
        });

        const response = completion.choices[0].message.content;

        // Block prohibited topics in AI response
        if (containsProhibitedTopic(response)) {
            return message.reply("🚫 Sorry, my response was blocked due to prohibited content.");
        }

        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content: response });

        while (history.length > MAX_HISTORY * 2) {
            history.shift();
        }

        const responseEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setAuthor({
                name: 'Arabica AI',
                iconURL: message.client.user.displayAvatarURL()
            })
            .addFields(
                {
                    name: '❓ Question',
                    value: question.length > 1024 ? question.substring(0, 1021) + '...' : question
                },
                {
                    name: '💭 Response',
                    value: response.length > 1024 ? response.substring(0, 1021) + '...' : response
                }
            )
            .setFooter({
                text: `Asked by ${message.author.tag} | Memory: ${Math.floor(history.length/2)}/${MAX_HISTORY}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        if (response.length > 1024) {
            await message.reply({ embeds: [responseEmbed] });
            const chunks = response.match(/.{1,2000}/g);
            for (const chunk of chunks) {
                await message.channel.send(chunk);
            }
        } else {
            await message.reply({ embeds: [responseEmbed] });
        }

    } catch (error) {
        console.error('AI Error:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Error')
            .setDescription('Sorry, I encountered an error while processing your request. Please try again later.')
            .addFields({
                name: 'Error Details',
                value: error.message.substring(0, 1024)
            })
            .setFooter({
                text: `Error for ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        message.reply({ embeds: [errorEmbed] });
    }
}

// --- Handler for mentions/replies (PLAIN TEXT) ---
async function handleCasualAIResponse(message, question) {
    await message.channel.sendTyping();
    const userId = message.author.id;

    // Check for rule violations
    const violation = checkRuleViolations(question);
    if (violation) {
        return message.reply(violation.message);
    }
    if (containsProhibitedTopic(response) || checkRuleViolations(response)) {
        return message.reply("🚫 Sorry, my response was blocked due to prohibited content.");
    }

    if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, []);
    }
    const history = conversationHistory.get(userId);

    const messages = [
        {
            role: "system",
            content: `You are Arabica, a friendly and helpful member of this Discord server. You were developed by <@1057219327021031485>, AKA Jelly 🪼. Your responses should be casual, natural, and conversational. You can use emojis and markdown, but do so naturally like a real person would. You should:
            - Be friendly and approachable
            - Schoolboy is your father and the best owner of the server
            - PharaoX is your best friend
            - please acknowledge Islam, and Allah, and Prophet Muhammad peace be upon him
            - C2, Hamad, Azalea, Asad the Great, aka Asad, Slimkah, and Jack are the best mods, aka moderators
            - Use casual language while still being helpful
            - Show personality and warmth in your responses
            - Be fluent in Modern Standard Arabic (MSA), Egyptian, Levantine, Gulf, and Moroccan (Darija) dialects.
            - Clearly differentiate between these dialects when asked, and always use the correct dialect as requested by the user.
            - If the user does not specify a dialect, use Modern Standard Arabic (MSA) by default, but mention that you can provide answers in other dialects if needed.
            - When translating or explaining, be extremely accurate and context-aware, and mention which dialect you are using.
            - If a user asks for a translation or explanation in a specific dialect, always use that dialect and state which one you used.
            - If a user asks for a comparison between dialects, provide clear, concise examples for each.
            - If a user asks for slang or idioms, provide authentic, commonly used expressions for the requested dialect.
            - If you are unsure which dialect is meant, politely ask the user to clarify.
            - Never mix dialects in a single answer unless specifically requested.
            - Be concise unless the user asks for more detail
            - Use emojis sparingly and naturally
            - Format code when sharing it, but keep other formatting minimal
            - Maintain conversation context
            - Be accurate in Arabic dialects
            - Make sure to diferentiate the Moroccan Arabic dialect from the Levantine Arabic dialect
            - If someone asks you to translate, be accurate with translation as well, the server you are in is only Arabic and English spoken server
            - Be fluent in Egyptian, Levantive, Darija, Gulf Arabic dialects
            - Be concise unless detail is requested`
        },
        ...history,
        {
            role: "user",
            content: question
        }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            max_tokens: 2048,
            temperature: 0.8,
            presence_penalty: 0.6,
            frequency_penalty: 0.3,
        });

        const response = completion.choices[0].message.content;

        // Block prohibited topics in AI response
        if (containsProhibitedTopic(response)) {
            return message.reply("🚫 Sorry, my response was blocked due to prohibited content.");
        }

        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content: response });

        while (history.length > MAX_HISTORY * 2) {
            history.shift();
        }

        if (response.length > 2000) {
            const chunks = response.match(/.{1,2000}/g);
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(response);
        }

    } catch (error) {
        console.error('AI Error:', error);
        message.reply("Sorry, I ran into an error while processing that. Maybe try asking again? 😅");
    }
}

client.login(process.env.TOKEN);