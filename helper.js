const fs = require('fs');
const { Mutex } = require('async-mutex');
const fileMutex = new Mutex();

async function startChat(chatId) {
    try {
        // Read the file and parse its content
        const release = await fileMutex.acquire();
        const data = await fs.promises.readFile("./groupData.json", 'utf8');
        const jsonArray = JSON.parse(data);

        // Find the object with the matching chatId
        const index = jsonArray.findIndex(item => item.chatId === chatId);

        if (index === -1) {
            jsonArray.push({chatId: chatId})
        }

        // Write the updated content back to the file
        await fs.promises.writeFile("./groupData.json", JSON.stringify(jsonArray, null, 2));
        release();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateOptions(chatId, type, newPronoun, newAmount) {
    try {
        // Read the file and parse its content
        const release = await fileMutex.acquire();
        const data = await fs.promises.readFile("./groupData.json", 'utf8');
        const jsonArray = JSON.parse(data);

        // Find the object with the matching chatId
        let index = jsonArray.findIndex(item => item.chatId === chatId);

        if (index === -1) {
            jsonArray.push({ chatId: chatId, options: {}, alreadyNotified: [] });
            index = jsonArray.findIndex(item => item.chatId === chatId);
        }

        if (!jsonArray[index].options[type]) {
            jsonArray[index].options[type] = {
                "pronoun": "",
                "amount": 0
            };
        }
        jsonArray[index].options[type].pronoun = newPronoun;
        jsonArray[index].options[type].amount = newAmount;

        // Write the updated content back to the file
        console.log(jsonArray)
        await fs.promises.writeFile("./groupData.json", JSON.stringify(jsonArray, null, 2));
        release();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function appendAlreadyNotified(chatId, contractAddress) {
    try {
        // Read the file and parse its content
        const release = await fileMutex.acquire();
        const data = await fs.promises.readFile("./groupData.json", 'utf8');
        const jsonArray = JSON.parse(data);

        // Find the object with the matching chatId
        const index = jsonArray.findIndex(item => item.chatId === chatId);

        if (index === -1) {
            jsonArray.push({chatId: chatId})
        }

        if (!jsonArray[index].alreadyNotified) {
            jsonArray[index].alreadyNotified = [];
        }
        jsonArray[index].alreadyNotified.append(contractAddress)

        // Write the updated content back to the file
        await fs.promises.writeFile("./groupData.json", JSON.stringify(jsonArray, null, 2));
        release();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function getChatIdsFromFile() {
    const filePath = "./groupData.json"
    try {
        // Read existing data from the file
        const existingData = await fs.promises.readFile(filePath, 'utf8');
        const existingObjects = JSON.parse(existingData);

        return existingObjects;
    } catch (error) {
        console.error('Error getting chatIds from file:', error);
        return [];
    }
}

module.exports = { startChat,updateOptions,appendAlreadyNotified,getChatIdsFromFile };