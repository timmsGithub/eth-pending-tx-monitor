let Web3 = require('web3');
const {ethers} = require("ethers");
const {default: axios} = require("axios");
const crypto = require("crypto");
const tlsClient = require("./tlsClient/tlsClientSimpleWrapper");
var Mutex = require('async-mutex').Mutex;
const mutex = new Mutex();
const {Interface} = require("ethers/lib/utils");
const NODEURL = process.env.NODE_URL;
const SOCKETURL = "wss://eth-mainnet.g.alchemy.com/v2/Ig8ePYqgCF7j9CifR1iVD4vNq2t6y2SY"
const provider = new ethers.providers.StaticJsonRpcProvider(NODEURL);
let web3 = new Web3(NODEURL)

this.client = new tlsClient.tlsClient({sessionId: crypto.randomBytes(20).toString('hex'), debug: false, proxy: "http://parateek:myPassword_streaming-1@geo.iproyal.com:12321"})

var options = {
    clientConfig: {
        keepalive: true,
        keepaliveInterval: 60000,
    },
    reconnect: {
        auto: true,
        delay: 2500,
        onTimeout: true,
    }
};
let ws = new Web3.providers.WebsocketProvider(SOCKETURL, options);
let web3Socket = new Web3(ws)
let subscription = ""


let alreadyAlearted = {}
let alreadySent = {}
async function newPendingTx(minTxPending, timeFrame, telegramBot) {
    this.telegramBot = telegramBot
    await new Promise(function(resolve) {
        try{
            console.log("New instance opened!")
            subscription = web3Socket.eth.subscribe("pendingTransactions").on("data", async (hash) => {
                let data;
                try{
                    data = await web3.eth.getTransaction(hash)
                }catch(e){
                    console.log(e)
                }
                if(data && data['to'] !== "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"){
                    const contractInformation = await getContractInformation(data['to'])
                    if(contractInformation?.abi){ //If Abi returned
                        let res = ""
                        try{
                            res = await provider.waitForTransaction(data['hash'], 1, 30000);
                        }catch (e) {
                        }
                        if(res.logs){ //If logs availa
                            const abi = await getContractAbi(data['to'])
                            if(!abi){
                                return
                            }
                            const iface = new ethers.utils.Interface(abi);
                            for (const logs of res.logs) {
                                let event = ""
                                try {
                                    event = iface.parseLog(logs);
                                }catch (e) {
                                    console.log(e)
                                }
                                if(event.name === "Transfer" && event.args.from === "0x0000000000000000000000000000000000000000"){
                                    if(event.args.tokenId){
                                        await mutex.runExclusive(async () => {
                                            if(!alreadySent[data['to']]){
                                                console.log(`WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW: ${data['to']}`)
                                                await addToArray(data, minTxPending, timeFrame, contractInformation);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            ).on("error", async (error) => {
                console.log("Error 1")
                console.log(error)
                resolve("");
            })
        }
        catch(e){
            console.log("Error 2")
            resolve("");
        }
    });
}

const addToArray = async (data, minTxPending, timeFrame, contractInformation) => {
    let contractAddress = data['to']
    if(!alreadyAlearted[contractAddress]){
        alreadyAlearted[contractAddress] = []
    }
    alreadyAlearted[contractAddress].push(Date.now())
    if(alreadyAlearted[contractAddress].length >= minTxPending){
        let x = 0
        while(x < (alreadyAlearted[contractAddress].length - minTxPending + 1)){
            if((alreadyAlearted[contractAddress][x]) > (Date.now() - timeFrame * 60 * 1000)){
                console.log(`[${Date().toLocaleString()}] https://etherscan.io/address/${data['to']}`)
                await initWebhook(data, contractInformation)
                break
            }
            x += 1
        }
    }
}

const getContractAbi = async (contractAddress) => {
    const client = new tlsClient.tlsClient({sessionId: crypto.randomBytes(20).toString('hex'), debug: false, proxy: "http://parateek:myPassword_streaming-1@geo.iproyal.com:12321"})
    const resp = await client.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}`)
    if(resp.body?.result?.includes("Max rate limit reached") || resp.body?.result?.includes("Contract source code not verified")){
        console.log("Failed with " + resp.body.result + " " + contractAddress)
        return;
    }
    return resp.body.result;
}

const getContractInformation = async (contractAddress) => {
    const client = new tlsClient.tlsClient({sessionId: crypto.randomBytes(20).toString('hex'), debug: false})
    const resp = await client.get(`https://api.catchmint.xyz/contracts/${contractAddress}/`)
    if(!resp?.body?.abi){
        return;
    }
    return resp.body;
}
    

const initWebhook = async (data, contractInformation) => {
    let bytesFound = false
    const contractAddress = data['to']
    let functionHex = data['input'].substring(0,10)
    let respValue = await this.client.get(`https://api.catchmint.xyz/contracts/${contractAddress}/entry/`)
    let collectionName = "[Not found]"
    let functionName = ""
    let inputArgs = ""
    let respEtherscanPending = ""
    let respEtherscan = ""
    let creator = "[Not found]"
    let currentPendingTx = "0"
    let gasGWEI = 0
    let inputResult = ""
    const etherscanClient = new tlsClient.tlsClient({sessionId: crypto.randomBytes(20).toString('hex'), debug: false, proxy: "http://parateek:myPassword_streaming-1@geo.iproyal.com:12321"})
    try{
        respEtherscanPending = await etherscanClient.get(`https://etherscan.io/txsPending?a=${contractAddress}`)
        currentPendingTx = Number.parseInt(respEtherscanPending.body.split("A total of ")[1].split(" pending")[0].replace(",", "")) 
    }catch (e) {
        try{
            respEtherscanPending = await etherscanClient.get(`https://etherscan.io/txsPending?a=${contractAddress}`)
            currentPendingTx = respEtherscanPending.body.split("A total of ")[1].split(" pending")[0].replace(",", "")
        }catch(e){}
    }
    console.log("AAAAAAA")
    try{
        try{
            respEtherscan = await etherscanClient.get(`https://etherscan.io/address/${contractAddress}`)
        }catch(e){
            respEtherscan = await etherscanClient.get(`https://etherscan.io/address/${contractAddress}`)
        }
        gasGWEI = respEtherscan.body.split("title='Base Fee: ")[1].split(" Gwei")[0]
        gasGWEI = `${parseInt(gasGWEI) * 1.1}`
        gasGWEI = Math.round(gasGWEI * 100) / 100
        try{
            creator = respEtherscan.body.split('Creator Address (')[1].split(")")[0]
        }catch (e) {
            creator = respEtherscan.body.split("href='/address/")[1].split("'")[0]
        }
    }catch (e) {}
    try{
        let methodResp = await getMethodInfo(data['input'], data)
        functionName = methodResp.methodName
        inputArgs = methodResp.inputArgs
    }catch (e) {}
    for(const arg in inputArgs){
        inputResult = inputResult + `&functionArgs[${arg}]=${inputArgs[arg]}`
    }
    websiteUrl = contractInformation?.websiteUrl ?? ""
    twitterUrl = contractInformation?.twitterUrl ?? ""
    discordUrl = contractInformation?.discordUrl ?? ""
    openseaUrl = contractInformation?.openseaUrl ?? ""
    try{
        if(contractInformation.name){
            collectionName = contractInformation.name
        }else if(openseaData.name){
            collectionName = openseaData.name
        }else{
            collectionName = respEtherscan.body.split('rounded-circle me-1\'>')[1].split(" (")[0]
            if(collectionName.length > 40){
                collectionName = respEtherscan.body.split('rounded-circle me-1\'>')[1].split("<")[0]
            }
        }
    }catch (e) {}
    totalSupply = contractInformation?.totalSupply ?? respValue?.totalSupply ?? "[Not found]"
    maxSupply = contractInformation.maxSupply?.[0]?.supply ?? "[Not found]"
    let vars = ""
    try{
        for(const value in contractInformation.abi[functionHex].inputs){
            vars = vars + contractInformation.abi[functionHex].inputs[value].type + ","
        }
    }
    catch(e){}
    try{
        vars = vars.slice(0,-1)
    }catch(e){}
    const message = `

<b>- ${collectionName} -</b>

<b>Contract Details:</b>
⛓️ Chain: ETH
⏲️ Pending: <a href='https://etherscan.io/txsPending?a=${contractAddress}'>${currentPendingTx}</a>
🏷️ Address: <a href='https://etherscan.io/address/${contractAddress}'>${contractAddress}</a>

<b>🌐 Supply 🌐</b>
totalSupply: ${totalSupply}
maxSupply: ${maxSupply}

<b>🪙 Price 🪙</b>
╚ avgPrice: ${Number((respValue.body.averageValue)).toFixed(3)}Ξ | avgGas: ${Number((respValue.body.averageTransactionFee)).toFixed(3)}Ξ | avgTotalCost: ${Number((respValue.body.averageEntry)).toFixed(3)}Ξ

<b>🐦 Token Socials 🐦</b>
🐦 Twitter: ${twitterUrl !== "" ? twitterUrl : "---"}
🚙 Discord: ${discordUrl !== "" ? discordUrl : "---"}
💻 Website: ${websiteUrl !== "" ? websiteUrl : "---"}

<b> 📊 View Collection 📊<b>
╠ <a href='https://blur.io/collection/${contractAddress}'>Blur</a> | <a href='${openseaUrl}'>Opensea</a> | <a href='https://www.gem.xyz/collection/${contractAddress}'>Gem</a> 
╚ <a href='https://nftnerds.ai/collection/${contractAddress}'>NFTNerds</a>  | <a href='https://x2y2.io/collection/${contractAddress}'>X2Y2</a> | <a href='https://catchmint.xyz/?address=${contractAddress}'>Catchmint</a>
    `
//                .setURL(`http://localhost:1738/qt?contractAddress=${contractAddress}&value=${web3.utils.fromWei(data.value)}&maxFeePerGas=${gasGWEI}&maxPriorityFeePerGas=1.5&gasLimit=200000&functionName=${functionName}&functionArgs[0]=1`)
    console.log(message)
    await sendMessage(message, contractAddress, currentPendingTx, Number((respValue.body.averageValue)).toFixed(3), maxSupply)
}

const sendMessage = async (message, contractAddress, currentPendingTx, price, maxSupply) => {
    const messageObjects = await getChatIdsFromFile()
    for(const messageObject of messageObjects){
        console.log(messageObject)
        if(messageObject?.alreadyNotified?.includes(contractAddress)){
            onsole.log("000000000")
            continue;
        }
        if(Number(currentPendingTx) > messageObject?.options?.filtercurrentpendingtransactions?.amount){
            if(messageObject.options.filtercurrentpendingtransactions.pronom === "more"){
                console.log("111111")
                continue;
            }
        }else{
            if(messageObject.options.filtercurrentpendingtransactions.pronom === "less"){
                console.log("22222222222")
                continue;
            }
        }
        if(Number(price) > messageObject?.options?.filterprice?.amount){
            if(messageObject.options.filterprice.pronom === "more"){
                console.log("33333333333")
                continue;
            }
        }else{
            if(messageObject.options.filterprice.pronom === "less"){
                console.log("444444444")
                continue;
            }
        }
        if(Number(maxSupply) > messageObject?.options?.filtermaxsupply?.amount){
            if(messageObject.options.filtermaxsupply.pronom === "more"){
                console.log("555555555555")
                continue;
            }
        }else{
            if(messageObject.options.filtermaxsupply.pronom === "less"){
                console.log("6666666666666")
                continue;
            }
        }
        try{
            await telegramBot.sendMessage(messageObject.chatId, message, {
                parse_mode: 'html',
                "disable_web_page_preview": true,
            });
        }catch(e){
            console.log(e)
        }
        await appendAlreadyNotified(messageObject.chatId, contractAddress)
    }
};

const getAbiInputs = (input) => {
    if (!input) {
        return "";
    }
    if (input.components) {
        return `(${input.components
            .map((input) => getAbiInputs(input))
            .join(",")})`;
    }

    return input.type;
};

const getMethodInfo = async (input, data) => {
    let abi = getContractAbi(data['to']);
    try {
        const iface = new Interface(abi);
        const hex = input.slice(0, 10);
        const methodName = await iface.getFunction(hex).name;

        const inputs = await iface.decodeFunctionData(methodName, input);

        const inputArgs = inputs.map((input) => {
            const res = ethers.BigNumber.isBigNumber(input);
            if (res) {
                return input.toString();
            }
            if (Array.isArray(input)) return input.join(",");

            return String(input);
        });
        let method = await iface.fragments.find((frag) => frag.name === methodName);
        let methodArgs = "";
        if (method) {
            methodArgs = method.inputs
                .map((input) => getAbiInputs(input))
                .join(",");
        }
        return { methodName: `${methodName}(${methodArgs})`, inputArgs };
    } catch (err) {
        return { methodName: "", inputArgs: [] };
    }
};

module.exports = { newPendingTx };