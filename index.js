import path from "node:path"
import fs from "node:fs"

fs.mkdirSync("json", { recursive: true })
fs.mkdirSync("decorations/avatar", { recursive: true })
fs.mkdirSync("decorations/nameplate", { recursive: true })
fs.mkdirSync("decorations/profile", { recursive: true })

const token = fs.readFileSync("token.txt", "utf-8")

const avatars = fs.existsSync("json/avatarDecorations.json") ? JSON.parse(fs.readFileSync("json/avatarDecorations.json")) : {}
const nameplates = fs.existsSync("json/nameplateDecorations.json") ? JSON.parse(fs.readFileSync("json/nameplateDecorations.json")) : {}
const profiles = fs.existsSync("json/profileDecorations.json") ? JSON.parse(fs.readFileSync("json/profileDecorations.json")) : {}

const properties = Buffer.from(JSON.stringify({
  "client_build_number": 420052
})).toString("base64")

const shop = await fetch("https://discord.com/api/v9/collectibles-shop", {
  headers: {
    Authorization: token,
    "X-Super-Properties": properties
  }
}).then(e => e.json())

const profileEffects = await fetch("https://discord.com/api/v9/user-profile-effects", {
  headers: {
    Authorization: token,
    "X-Super-Properties": properties
  }
}).then(e => e.json())

const promises = []

for (const category of shop.categories) {
  if (category.name === "Autumn") {
    category.name = "Fall"
  } else if (category.name === "Winter Wonderland") {
    category.name = "Winter"
  }
  for (const product of category.products) {
    for (const item of product.items) {
      if (item.type === 0) {
        avatars[category.name] ??= {}
        avatars[category.name][item.id] = product.name
        promises.push(fetch(`https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png`).then(async e => {
          console.log(`Avatar: ${category.name + " - " + product.name}`)
          fs.promises.writeFile(`decorations/avatar/${item.id}.png`, Buffer.from(await e.arrayBuffer()))
        }))
      } else if (item.type === 2) {
        nameplates[category.name] ??= {}
        promises.push(
          fetch(`https://cdn.discordapp.com/assets/collectibles/${item.asset}asset.webm`).then(async e => {
            console.log(`Nameplate WebM: ${category.name + " - " + product.name}`)
            fs.promises.writeFile(`decorations/nameplate/${item.id}.webm`, Buffer.from(await e.arrayBuffer()))
          }),
          fetch(`https://cdn.discordapp.com/assets/collectibles/${item.asset}static.png`).then(async e => {
            console.log(`Nameplate PNG: ${category.name + " - " + product.name}`)
            fs.promises.writeFile(`decorations/nameplate/${item.id}.png`, Buffer.from(await e.arrayBuffer()))
          })
        )
        nameplates[category.name][item.id] = product.name
      }
    }
  }
}

for (const effect of profileEffects.profile_effect_configs) {
  const match = Object.entries(profiles).find(e => e[0] === effect.id || e[1].title === effect.title)
  let decoration
  if (match) {
    effect.id = match[0]
    decoration = match[1]
    decoration.title = effect.title
    decoration.name = effect.thumbnailPreviewSrc.match(/(?<=\/)[^\/]+(?=\/[^\/]+$)/)[0]
  } else {
    decoration = {
      name: effect.thumbnailPreviewSrc.match(/(?<=\/)[^\/]+(?=\/[^\/]+$)/)[0],
      title: effect.title,
      effects: [],
      extra: []
    }
  }
  profiles[effect.id] = decoration
  fs.mkdirSync(`decorations/profile/${effect.id}`, { recursive: true })
  for (const img of effect.effects) {
    const name = path.basename(img.src, ".png")
    if (!decoration.effects.includes(name)) decoration.effects.push(name)
    promises.push(fetch(img.src).then(async e => {
      console.log(`Profile PNG: ${effect.title}`)
      fs.promises.writeFile(`decorations/profile/${effect.id}/${name}.png`, Buffer.from(await e.arrayBuffer()))
    }))
  }
  for (const key of ["staticFrameSrc", "thumbnailPreviewSrc", "reducedMotionSrc"]) {
    if (effect[key]) {
      const name = path.basename(effect[key], ".png")
      if (!decoration.extra.includes(name)) decoration.extra.push(name)
      promises.push(fetch(effect[key]).then(async e => {
        console.log(`Profile ${key}: ${effect.title}`)
        fs.promises.writeFile(`decorations/profile/${effect.id}/${name}.png`, Buffer.from(await e.arrayBuffer()))
      }))
    }
  }
}

await Promise.all(promises)

fs.writeFileSync("json/avatarDecorations.json", JSON.stringify(avatars, null, 2))
fs.writeFileSync("json/nameplateDecorations.json", JSON.stringify(nameplates, null, 2))
fs.writeFileSync("json/profileDecorations.json", JSON.stringify(profiles, null, 2))