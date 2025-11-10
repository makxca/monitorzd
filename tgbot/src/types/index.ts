import { Context, Middleware, NarrowedContext } from "telegraf";
import * as tt from 'telegraf/typings/telegram-types'

export type TelegrafFn = Middleware<
  NarrowedContext<Context, tt.MountMap['text']> & tt.CommandContextExtn
>
