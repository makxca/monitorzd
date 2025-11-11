import dotenv from "dotenv"
dotenv.config({
  path: '.env'
})

import { Telegraf, Scenes, session } from "telegraf"
import { findAll } from "./findTrains"
import fs from "node:fs"
import { sequelize } from './model'
import { createSubscriptionScene } from "./commands/subscribe"
sequelize.sync();

import { checkCommand, configCommand, helpCommand, startCommand, whoisthisCommand } from "./commands"

const bot = new Telegraf<Scenes.WizardContext>(process.env.BOT_TOKEN!)

const ids: number[] = []; // TODO: получать из БД

bot.telegram.setMyCommands([
  {
    command: "check",
    description: "Единоразово проверить все поезда из конфигурации (спроси у @makxca)"
  },
  {
    command: "subscribe",
    description: "Подписаться на рассылку. Проверки проводятся каждые 10 минут"
  },
  {
    command: "config",
    description: "Посмотреть конфигурацию"
  },
  {
    command: "unsubscribe",
    description: "Отписаться от рассылки"
  }
])

bot.start(startCommand)
bot.help(helpCommand)
bot.command("whoisthis", whoisthisCommand)
bot.command("check", checkCommand)
bot.command("config", configCommand)
bot.command("unsubscribe", ctx => {
  if (!ids.includes(ctx.from.id)) {
    ctx.reply("Вы не подписаны на рассылку")
    return
  }
  ids.splice(ids.find(id => id !== ctx.from.id)!)
  fs.writeFileSync("./src/ids.json", JSON.stringify(ids))
  ctx.reply("Вы успешно отписались от рассылки")
})

const stage = new Scenes.Stage<Scenes.WizardContext>([createSubscriptionScene]);

bot.use(session());
bot.use(stage.middleware());

bot.command("subscribe", async (ctx) => {
  console.log("/subscribe");
  ctx.scene.enter("create-subscription")
});

bot.launch()
console.log("\n\nBot successfully started")

async function monitoring() {
  console.log("Monitoring", new Date().toLocaleTimeString("ru"))

  const s = await findAll()
  if (s) {
    ids.forEach(id => bot.telegram.sendMessage(id, s, { parse_mode: "Markdown" }))
  }

  setTimeout(monitoring, 10 * 60 * 1000 + (Math.random() - 0.5) * 100000)
}

setTimeout(monitoring, 20000)

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
