import { TelegrafFn } from "../types";
import config from "./../config.json"

export const configCommand: TelegrafFn = ctx => {
  ctx.reply(`
Я смотрю на следующие ссылки:
${config.map(url => `- [${url.name}](${url.link})`).join("\n")}
`, { parse_mode: "Markdown" })
}
