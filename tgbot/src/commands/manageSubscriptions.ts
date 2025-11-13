import { Scenes, Markup } from "telegraf";
import { Subscription } from "../model/Subscription.js";
import { seatTypeNameByType } from "../lib/const.js";

interface ManageSubscriptionsContext extends Scenes.WizardContext {
  session: {
    subscriptions?: any[];
  };
}

export const manageSubscriptionsScene = new Scenes.BaseScene<ManageSubscriptionsContext>(
  "manage-subscriptions"
);

manageSubscriptionsScene.enter(async (ctx) => {
  const telegramId = String(ctx.from?.id);

  try {
    const subs = await Subscription.findAll({
      where: { telegramId},
      order: [["createdAt", "ASC"]],
    });

    if (!subs.length) {
      await ctx.reply("📭 У вас пока нет активных подписок.");
      return ctx.scene.leave();
    }

    ctx.session.subscriptions = subs;
    await showCompactList(ctx);
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Не удалось загрузить список подписок. Попробуйте позже.");
    ctx.scene.leave();
  }
});

async function showCompactList(ctx: ManageSubscriptionsContext) {
  const subs = ctx.session.subscriptions!;

  let text = "📋 <b>Ваши активные подписки:</b>\n\n";

  subs.forEach((s, i) => {
    const f = s.filters?.[0];
    if (!f) return;

    text += `${i + 1}) ${f.departureDate} | ${f.originName} → ${f.destinationName}`;
    if (f.carType) text += ` | ${seatTypeNameByType[f.carType]}`;
    if (f.maxPrice) text += ` | ≤ ${f.maxPrice}₽`;
    text += "\n";
  });

  const buttons = subs.map((s, i) => [
    Markup.button.callback(`❌ Отписаться от #${i + 1}`, `unsubscribe_${s.id}`),
  ]);
  buttons.push([Markup.button.callback("⬅️ Выйти", "exit")]);

  await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
}

manageSubscriptionsScene.action(/unsubscribe_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const id = Number(ctx.match![1]);

  try {
    const sub = await Subscription.findByPk(id);
    if (!sub) {
      await ctx.reply("❌ Подписка не найдена.");
      return;
    }

    await sub.destroy();

    ctx.session.subscriptions = ctx.session.subscriptions!.filter((s) => s.id !== id);

    if (!ctx.session.subscriptions!.length) {
      await ctx.editMessageText("📭 У вас больше нет активных подписок.", {
        parse_mode: "HTML",
      });
      return ctx.scene.leave();
    }

    const text = buildCompactText(ctx.session.subscriptions!);
    const buttons = ctx.session.subscriptions!.map((s, i) => [
      Markup.button.callback(`❌ Отписаться от #${i + 1}`, `unsubscribe_${s.id}`),
    ]);
    buttons.push([Markup.button.callback("⬅️ Выйти", "exit")]);

    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
    });
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Не удалось удалить подписку. Попробуйте позже.");
  }
});

manageSubscriptionsScene.action("exit", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("👋 Возвращаю вас в главное меню.", Markup.removeKeyboard());
  ctx.scene.leave();
});

manageSubscriptionsScene.hears(["❌ Выйти", "выйти", "exit"], async (ctx) => {
  ctx.scene.leave();
});

function buildCompactText(subs: any[]): string {
  let text = "📋 <b>Ваши активные подписки:</b>\n\n";

  subs.forEach((s, i) => {
    const f = s.filters?.[0];
    if (!f) return;

    text += `${i + 1}) ${f.departureDate} | ${f.originName} → ${f.destinationName}`;
    if (f.carType) text += ` | ${seatTypeNameByType[f.carType]}`;
    if (f.maxPrice) text += ` | ≤ ${f.maxPrice}₽`;
    text += "\n";
  });

  return text;
}