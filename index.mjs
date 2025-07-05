import "dotenv/config";
import * as fs from 'fs';
import { Client, Events, IntentsBitField, Partials } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
let prompt = fs.readFileSync('prompt.txt', 'utf8');

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: prompt });

const chats = new Map();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
    ],
    partials: [
        Partials.Channel,
    ]
});

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
    try {
        if (message.author.bot) return;
        let isMentioned = message.mentions.has(client.user);
        let isReply = false;
        let isDM = message.channel.isDMBased();
        if (message.reference !== null) {
            const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedTo.author.equals(client.user)) {
                isReply = true;
            }
    
        }
        if (!isMentioned && !isReply && !isDM) return;
        await message.channel.sendTyping();
        if (!chats.has(message.channel.id)) {
            chats.set(message.channel.id, await model.startChat({}));
        }
        let format = /"((?:.|\n)*)"/g; // Gemini response format
        let messageToGemini = message.author.displayName + ": \"" + message.content + "\"";
        console.log(messageToGemini); // Log the message to gemini
        let result = await chats.get(message.channel.id).sendMessage(messageToGemini); // Send message
        let reply = result.response.text(); // Get response
        let finalReply = format.exec(reply); // Parse response
        console.log(reply); // Log response
        message.reply(finalReply.at(1)); // Send response
    } catch (error) {
        console.error(error);
        message.reply("CONNECTION LOST... PLEASE TRY AGAIN."); // Send error
    }
});


client.login(process.env.TOKEN);

