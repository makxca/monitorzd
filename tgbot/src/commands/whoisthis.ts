import { TelegrafFn } from "../types";

export const whoisthisCommand: TelegrafFn = (ctx) => {
  ctx.reply(`This is ${ctx.botInfo.username}. And you are ${ctx.from.first_name} ${ctx.from.last_name}`)
}
