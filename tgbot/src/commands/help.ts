import { TelegrafFn } from "../types";

export const helpCommand: TelegrafFn = (ctx) => {
  ctx.reply('/check, /subscribe')
}
