import fs from "node:fs"
import path from "path"

fs.mkdirSync("json", { recursive: true })
fs.mkdirSync("decorations/avatar", { recursive: true })
fs.mkdirSync("decorations/profile", { recursive: true })

const token = fs.readFileSync("token.txt", "utf-8")

const avatars = fs.existsSync("json/avatarDecorations.json") ? JSON.parse(fs.readFileSync("json/avatarDecorations.json")) : {}
const profiles = fs.existsSync("json/profileDecorations.json") ? JSON.parse(fs.readFileSync("json/profileDecorations.json")) : {}

const properties = Buffer.from(JSON.stringify({
  "client_build_number": 236850
})).toString("base64")

const categories = await fetch("https://discord.com/api/v9/collectibles-categories", {
  headers: {
    Authorization: token,
    "X-Super-Properties": properties
  }
}).then(e => e.json())

for (const category of categories) {
  for (const product of category.products) {
    for (const item of product.items) {
      if (item.type !== 0) continue
      console.log(`Avatar: ${category.name + " - " + product.name}`)
      const match = Object.entries(avatars).find(e => e[1].category === category.name && e[1].name === product.name)
      if (match) {
        item.id = match[0]
      }
      const avatar = await fetch(`https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png`).then(e => e.arrayBuffer())
      fs.writeFileSync(`decorations/avatar/${item.id}.png`, Buffer.from(avatar))
      avatars[item.id] = {
        name: product.name,
        category: category.name
      }
    }
  }
}

fs.writeFileSync("json/avatarDecorations.json", JSON.stringify(avatars, null, 2))

const profileEffects = await fetch("https://discord.com/api/v9/user-profile-effects", {
  headers: {
    Authorization: token,
    "X-Super-Properties": properties
  }
}).then(e => e.json())

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
  console.log(`Profile: ${effect.title}`)
  fs.mkdirSync(`decorations/profile/${effect.id}`, { recursive: true })
  for (const img of effect.effects) {
    const name = path.basename(img.src, ".png")
    if (!decoration.effects.includes(name)) decoration.effects.push(name)
    fs.writeFileSync(`decorations/profile/${effect.id}/${name}.png`, Buffer.from(await fetch(img.src).then(e => e.arrayBuffer())))
  }
  for (const key of ["staticFrameSrc", "thumbnailPreviewSrc", "reducedMotionSrc"]) {
    if (effect[key]) {
      const name = path.basename(effect[key], ".png")
      if (!decoration.extra.includes(name)) decoration.extra.push(name)
      fs.writeFileSync(`decorations/profile/${effect.id}/${name}.png`, Buffer.from(await fetch(effect[key]).then(e => e.arrayBuffer())))
    }
  }
  profiles[effect.id] = decoration
}

fs.writeFileSync("json/profileDecorations.json", JSON.stringify(profiles, null, 2))