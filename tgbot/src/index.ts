import dotenv from "dotenv"
dotenv.config({
  path: '.env'
})

import { Telegraf } from "telegraf"
import { findByFilters } from "./findTrains"
import fs from "node:fs"
import { sequelize, Subscription } from './model'
sequelize.sync();

import { helpCommand, startCommand, whoisthisCommand } from "./commands"

const bot = new Telegraf(process.env.BOT_TOKEN!)

const ids: number[] = []; // TODO: получать из БД

bot.telegram.setMyCommands([
  {
    command: "subscribe",
    description: "Подписаться на рассылку. Проверки проводятся каждые 10 минут"
  },
  {
    command: "unsubscribe",
    description: "Отписаться от рассылки"
  }
])

bot.start(startCommand)
bot.help(helpCommand)
bot.command("whoisthis", whoisthisCommand)
bot.command("unsubscribe", ctx => {
  if (!ids.includes(ctx.from.id)) {
    ctx.reply("Вы не подписаны на рассылку")
    return
  }
  ids.splice(ids.find(id => id !== ctx.from.id)!)
  fs.writeFileSync("./src/ids.json", JSON.stringify(ids))
  ctx.reply("Вы успешно отписались от рассылки")
})
bot.command("subscribe", ctx => {
  if (ids.includes(ctx.from.id)) {
    ctx.reply("Вы уже подписаны на рассылку")
    return
  }
  ids.push(ctx.from.id)
  fs.writeFileSync("./src/ids.json", JSON.stringify(ids))
  ctx.reply("Вы успешно подписались на рассылку")
})

bot.launch()
console.log("\n\nBot successfully started")

async function monitoring() {
  console.log("Monitoring", new Date().toLocaleTimeString("ru"))
  const users = await Subscription.findAll();
  for (const user of users) {
    const result = await findByFilters(user.get().filters)
    if (result) {
      bot.telegram.sendMessage(user.get().telegramId, result, { parse_mode: "Markdown" })
    }
  }
  

  // не раз в 10m, а раз в 10m±50s
  setTimeout(monitoring, 10 * 60 * 1000 + (Math.random() - 0.5) * 100000)
}

setTimeout(monitoring, 2000)

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
