import { findAll } from "../findTrains";
import { TelegrafFn } from "../types";

export const checkCommand: TelegrafFn = async (ctx) => {
  const s = await findAll()
  if (s) {
    ctx.reply(s, { parse_mode: "Markdown" })
  } else {
    ctx.reply("Ничего не нашёл :(")
  }
}
