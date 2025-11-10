import { TelegrafFn } from "../types";

export const startCommand: TelegrafFn = (ctx) => {
  ctx.reply('Привет! Напиши /subscribe, чтобы подписаться на рассылку')
}
