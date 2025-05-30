import fs from "fs"
import readline from "readline"

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

const decorationName = await ask("Enter decoration name: ")
const userId = await ask("Enter user id: ")

const token = fs.readFileSync("bot_token.txt", "utf-8").trim()

const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
  headers: {
    "Authorization": `Bot ${token}`
  }
})
const userData = await res.json()

const assetId = userData.avatar_decoration_data.asset.split("_")[1]
const skuId = userData.avatar_decoration_data.sku_id

const imageRes = await fetch(`https://cdn.discordapp.com/avatar-decoration-presets/${userData.avatar_decoration_data.asset}.png`)
fs.writeFileSync(`./decorations/avatar/${skuId}.png`, Buffer.from(await imageRes.arrayBuffer()))

const jsonData = JSON.parse(fs.readFileSync("./json/avatarDecorations.json", "utf8"))
jsonData.Quests[skuId] = decorationName
fs.writeFileSync("./json/avatarDecorations.json", JSON.stringify(jsonData, null, 2))