const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    if (message.channel.id === 'jarvis-eval' && !messageCameFromBot(message)) {
        discordEval(message.content);
    }
  });


client.login(process.env.DISCORD_TOKEN);

function messageCameFromBot(message)
{
    return message.author.id === client.user.id;
}


function discordEval(str)
{
    try
    {
        const originalConsoleLog = console.log;
        const originalProcessStdoutWrite = process.stdout.write;
        
        console.log = function(message) {
            message.channel.send(message);
        };

        process.stdout.write = function(message) {
            message.channel.send(message);
        };

        eval(str);

        console.log = originalConsoleLog;
        process.stdout.write = originalProcessStdoutWrite;
    }
    catch (error)
    {
        message.channel.send(error);
    }
}

function containsBannedRegex(str)
{
    for (banned_regex of banned_regexs) {
        if (str.toLowerCase().match(banned_regex)) {
            return true;
        }
    }

    return false;
}

async function purgeBannedRegexs() {
  
    // Find the guild by name (case-sensitive)
    const guild = client.guilds.cache.find(g => g.name === guildName);
    
    if (guild) {
      console.log(`Found ${guild.name}`);
    } else {
      console.log(`${guild.name} not found!`);
      return;
    }

    let banned_regexs = await getBannedRegexs(guild);
    if (banned_regexs.length !== 0) {
        const channels = guild.channels.cache.filter(c => c.isTextBased()); // Get text channels
        for (const [channelId, channel] of channels) {
            if (channel.name !== "banned-regexs")
                await processChannel(channel, banned_regexs);
        }
    }
}

async function forEachMessage(channel, action)
{
    let message = await channel.messages
    .fetch({ limit: 1 })
    .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    while (message) {
        await channel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
                messagePage.forEach(msg => {
                    action(msg);
                })

                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            })
            .catch(error => {
                console.log(`Error processing messages in ${channel.name}: ${error}`);
            });
    }
}

async function processChannel(channel, banned_regexs) {
    await forEachMessage(channel, message => 
    {
        if (containsBannedRegex(message.content))
        {
            process.stdout.write(`*`);
            message.delete();
        }
    });
}

async function getBannedRegexs(guild) {
    console.log("   Reading banned-regexs");
    let regexs;

    const banned_regexs_channel = guild.channels.cache.find(channel => channel.name === "banned-regexs");
    if (!banned_regexs_channel) {
        console.log("Unable to located banned-regexs channel");
        return [];
    }

    await banned_regexs_channel.messages
        .fetch({ limit: 1 })
        .then(messages => {
            messages.forEach(message => {
                regexs = message.content.split("\n");
                console.log("Banning: " + regexs);
            })
            //if (messages.length === 1) regexs = messages[0].content;
        })
        .catch(error => { console.log("Unable to get banned regexs: " + error); });

    return regexs;
}