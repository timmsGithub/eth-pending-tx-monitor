const { updateOptions, getChatIdsFromFile } = require("./helper");
const { newPendingTx } = require("./pendingMonitor");
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const telegramBot = new TelegramBot(token, { polling: true });

telegramBot.setMyCommands([
    {
        command: 'showfilters',
        description: 'Show your choosen filters',
    },
    {
        command: 'resetfilters',
        description: 'Reset all filters',
    },
    {
        command: 'filtercurrentpendingtransactions',
        description: 'Filter the amount of pending transactions for the contract',
    },
    {
        command: 'filterprice',
        description: 'Filter the price per NFT',
    },
    {
        command: 'filtermaxsupply',
        description: 'Filter the maxSupply of the collection',
    },
])
const commands = {"/filtercurrentpendingtransactions": "current pending transactions", "/filterprice": "price in ETH", "/filtermaxsupply/": "maximum supply"}

// telegramBot.onText(/\/showfilters/, async (msg, match) => {
//     const jsonArray = await getChatIdsFromFile()
//     const index = jsonArray.findIndex(item => item.chatId === chatId);
//     const message = `
// <b>Overview</b>

// ${index?.["/filtercurrentpendingtransactions"] ? "Current pending transactions: Notify if " + index?.["/filtercurrentpendingtransactions"].}
//     `
//     await telegramBot.sendMessage(msg.from.id, ``, {
//         parse_mode: 'html',
//         "disable_web_page_preview": true,
//     });
// });

telegramBot.onText(/\/filtercurrentpendingtransactions|\/filterprice|\/filtermaxsupply/, async (msg, match) => {
    const chatId = msg.chat.id;
    const command = match[0];
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'more than',
                        callback_data: `${command} more`
                    },
                    {
                        text: 'less than',
                        callback_data: `${command} less`
                    }
                ]
            ]
        }
    };
    await telegramBot.sendMessage(msg.from.id, `Please choose more or less. In the next step, you will choose a number. For example: Give me every ping where the ${commands[command]} is more than Y`, {
        ...opts,
        parse_mode: 'html',
        "disable_web_page_preview": true,
    });
});

telegramBot.on("callback_query", async function onCallbackQuery(callbackQuery) {
    let data = {"command": callbackQuery.data.split(" ")[0], commands: commands, pronoun: callbackQuery.data.split(" ")[1]}
    const options = {
        reply_markup: JSON.stringify({
            force_reply: true
        })
    };
    await telegramBot.sendMessage(callbackQuery.from.id, `Type a number (for example 10000) when you want to get notified if the ${commands[data.command]} is ${data.pronoun} than your number`, options).then(sentMessage => {
        handleReplyToMessage(sentMessage.chat.id, sentMessage.message_id, data);
    });

});

function handleReplyToMessage(chatId, messageId, data) {
    telegramBot.onReplyToMessage(chatId, messageId, async (reply) => {
        try{
            const amount = Number(reply.text.replace(",", "").replace(".",""))
            await telegramBot.sendMessage(chatId, `You will only get notified, when the ${data.commands[data.command]} is ${data.pronoun} than ${amount}`);
            await updateOptions(chatId, data.command, data.pronoun, amount)
        }catch(e){
            await telegramBot.sendMessage(chatId, `${reply.text} is not a number in the format of 1-100000!! Please try again...`);
        }
        
    });
}


~(async () => {
    await newPendingTx(0, 5, telegramBot)
})();