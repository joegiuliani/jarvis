const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Only using carnage right now so this is fine
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.log('No guilds available.');
        return;
    }

    processGuild(guild);
});

client.login(process.env.DISCORD_TOKEN);

async function processGuild(guild) {

    console.log("Beginning Server: " + guild.name + ".");

    let banned_regexs = await getBannedRegexs(guild);

    if (banned_regexs.length === 0) {
        console.log("Finished Server:" + guild.name + ".");
        return;
    }

    const channels = guild.channels.cache.filter(c => c.isTextBased()); // Get text channels
    for (const [channelId, channel] of channels) {
        if (channel.name !== "banned-regexs")
            await processChannel(channel, banned_regexs);
    }
    console.log("Finished Server:" + guild.name + ".");
}

async function processChannel(channel, banned_regexs) {
    console.log("   Beginning Channel: " + channel.name + ".");

    let message_ct = 0;
    let deleted_ct = 0;

    let message = await channel.messages
        .fetch({ limit: 1 })
        .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    while (message) {
        await channel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
                messagePage.forEach(msg => {
                    for (banned_regex of banned_regexs) {
                        if (msg.content.toLowerCase().match(banned_regex)) {
                            process.stdout.write(`*`);
                            msg.delete();
                            deleted_ct++;
                        }
                    }
                })

                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            })
            .catch(error => {
                console.log("Error processing messages: " + error);
            });

        message_ct += 1;
        if (message_ct == 999) {
            console.log("       Scanned 100,000 messages.");
            message_ct = 0;
        }
    }

    console.log("\n   Finished Channel: " + channel.name + ".");
    return deleted_ct;
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