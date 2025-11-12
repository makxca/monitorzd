import { Scenes, Markup } from "telegraf";
import { Subscription } from "../model/Subscription.js";
import { fetchStationSuggestions, Station } from "../lib/fetchStationSuggestions.js";
import { isValidDate, isValidPrice } from "../lib/utils.js";

// Отображаемые пользователю имена типов мест
const seatTypeNameByType = {
  plaz: "Плацкарт",
  coop: "Купе",
  SV: "СВ",
  sitting: "Сидячее",
} as const;

type SeatType = keyof typeof seatTypeNameByType;
const seatTypes: SeatType[] = ["plaz", "coop", "SV", "sitting"];

// Тип данных, сохраняемых в фильтре подписки
interface SubscriptionData {
  departureDate?: string;
  origin?: Station;
  destination?: Station;
  maxPrice?: number;
  carType?: SeatType;
}

// Сессионные данные во время создания подписки
interface SubscriptionWizardSession extends Scenes.WizardSessionData {
  stepIndex: number;
  inEditing: boolean;

  data: SubscriptionData;

  selectingStationFor?: "origin" | "destination" | null;
  stationOptions?: Station[];
  lastStationMessageId?: number;
}

// Расширенный контекст сцены
interface SubscriptionWizardContext extends Scenes.WizardContext {
  session: SubscriptionWizardSession;
}

// Описание шагов мастера создания подписки
interface Step {
  key: keyof SubscriptionData;
  label: string;
  message: string;
  validate?: (text: string) => Promise<any> | any;
  error: string;
}

// Список шагов мастера
const steps: Step[] = [
  {
    key: "departureDate",
    label: "Дата отправления",
    message: "Введите дату отправления (в формате YYYY-MM-DD):",
    validate: (t) => (isValidDate(t) ? t : null),
    error: "❌ Неверный формат даты. Пример: 2025-11-17",
  },
  {
    key: "origin",
    label: "Пункт отправления",
    message: "Введите пункт отправления:",
    error: "❌ Станция отправления не найдена. Попробуйте уточнить название.",
  },
  {
    key: "destination",
    label: "Пункт назначения",
    message: "Введите пункт назначения:",
    error: "❌ Станция назначения не найдена. Попробуйте уточнить название.",
  },
  {
    key: "maxPrice",
    label: "Максимальная цена",
    message: "Введите максимальную допустимую стоимость билета:",
    validate: (t) => (isValidPrice(t) ? Number(t) : null),
    error: "❌ Введите корректную сумму в рублях (например: 1500)",
  },
  {
    key: "carType",
    label: "Тип места",
    message: "Выберите тип места:",
    error: "",
  },
];

// Создаем сцену мастера подписки
export const createSubscriptionScene = new Scenes.BaseScene<SubscriptionWizardContext>(
  "create-subscription"
);

// При входе в сцену данные заполняются дефолтными значениями
createSubscriptionScene.enter(async (ctx) => {
  ctx.session.stepIndex = 0;
  ctx.session.inEditing = false;
  ctx.session.data = {};
  ctx.session.selectingStationFor = null;
  ctx.session.stationOptions = [];
  ctx.session.lastStationMessageId = undefined;
  await sendWithKeyboard(ctx, "🚆 Начинаем создание подписки!");
  await ask(ctx);
});

// Обработчик выхода из сцены создания подписки
createSubscriptionScene.hears(["❌ Отмена", "отмена", "cancel"], async (ctx) => {
  ctx.session = {} as SubscriptionWizardSession;
  await ctx.reply("❌ Создание подписки отменено.", Markup.removeKeyboard());
  ctx.scene.leave();
});

// Обработчик возвращения на предыдущий шаг
createSubscriptionScene.hears(["⬅️ Назад", "назад", "back"], async (ctx) => {
  if (ctx.session.selectingStationFor) {
    ctx.session.selectingStationFor = null;
    ctx.session.stationOptions = [];
    if (ctx.session.lastStationMessageId) {
      try {
        await ctx.deleteMessage(ctx.session.lastStationMessageId);
      } catch {}
    }
    return showSummary(ctx);
  }
  ctx.session.stepIndex = Math.max(0, ctx.session.stepIndex - 1);
  await ask(ctx);
});

// Основной обработчик пользовательского ввода. 
// Сюда попадает всё, что пользователь вводит текстом (кроме ❌ Отмена и ⬅️ Назад)
createSubscriptionScene.on("text", async (ctx) => {
  if (ctx.session.stepIndex >= steps.length) return showSummary(ctx);

  const text = ctx.message.text.trim();
  const step = steps[ctx.session.stepIndex];

  // Для шагов выбора станций обрабатываем отдельно — идёт запрос к API РЖД
  if (step.key === "origin" || step.key === "destination") {
    try {
      const stations = await fetchStationSuggestions(text).catch(() => []);
      if (!stations.length) return sendWithKeyboard(ctx, step.error);

      ctx.session.stationOptions = stations;
      ctx.session.selectingStationFor = step.key;
      return sendStationSelection(ctx);
    } catch {
      return sendWithKeyboard(ctx, step.error);
    }
  }

  // Для остальных шагов просто валидируем текстовый ввод
  const result = await step.validate?.(text);
  if (!result) {
    await sendWithKeyboard(ctx, step.error);
    return;
  }

  ctx.session.data[step.key] = result;

  // Если мы редактировали конкретное поле — выходим обратно к обзору
  if (ctx.session.inEditing) {
    ctx.session.inEditing = false;
    return showSummary(ctx);
  }

  // Иначе идём дальше по шагам мастера
  ctx.session.stepIndex++;
  if (steps[ctx.session.stepIndex]?.key === "carType") {
    return ctx.reply(
      "Выберите тип места:",
      Markup.inlineKeyboard(
        seatTypes.map((t) =>
          Markup.button.callback(seatTypeNameByType[t], `seat_${t}`)
        ),
        { columns: 2 }
      )
    );
  }

  if (ctx.session.stepIndex >= steps.length) return showSummary(ctx);
  return ask(ctx);
});

// Функция отправки пользователю меню выбора станций
async function sendStationSelection(ctx: SubscriptionWizardContext) {
  const buttons = ctx.session.stationOptions!.map((s) =>
    Markup.button.callback(s.name, `station_select_${s.expressCode}`)
  );

  // Удаляем предыдущее сообщение со списком, чтобы не засорять чат
  if (ctx.session.lastStationMessageId) {
    try {
      await ctx.deleteMessage(ctx.session.lastStationMessageId);
    } catch {}
  }

  const msg = await ctx.reply(
    "Выберите станцию из списка:",
    Markup.inlineKeyboard(buttons, { columns: 1 })
  );

  ctx.session.lastStationMessageId = msg.message_id;
}

// Обработчик выбора станции пользователем
createSubscriptionScene.action(/station_select_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const code = ctx.match![1];
  const which = ctx.session.selectingStationFor!;
  const station = ctx.session.stationOptions!.find((s) => s.expressCode === code);
  if (!station) return;

  ctx.session.data[which] = station;
  ctx.session.selectingStationFor = null;

  if (ctx.session.lastStationMessageId) {
    try {
      await ctx.deleteMessage(ctx.session.lastStationMessageId);
    } catch {}
  }

  await ctx.reply(`✅ Выбрана станция: ${station.name}`);

  ctx.session.stepIndex++;
  if (ctx.session.inEditing) {
    ctx.session.inEditing = false;
    ctx.session.stepIndex = steps.length;
  }

  if (ctx.session.stepIndex >= steps.length) return showSummary(ctx);
  return ask(ctx);
});

// Обработчики выбора типа места
seatTypes.forEach((type) =>
  createSubscriptionScene.action(`seat_${type}`, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.data.carType = type;
    return showSummary(ctx);
  })
);

// Обработчики редактирования полей (кнопки ✏️)
steps.forEach((s, idx) =>
  createSubscriptionScene.action(`edit_${s.key}`, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.inEditing = true;
    ctx.session.stepIndex = idx;
    await sendWithKeyboard(ctx, `✏️ Измените значение поля: ${s.label}\n${s.message}`);
  })
);

// Сохранение подписки в базу
createSubscriptionScene.action("save_subscription", async (ctx) => {
  await ctx.answerCbQuery();
  const d = ctx.session.data;
  try {
    await Subscription.upsert({
      telegramId: String(ctx.from?.id),
      filters: [{
        departureDate: d.departureDate!,
        origin: d.origin?.expressCode!,
        originNodeId: d.origin?.nodeId!,
        destination: d.destination?.expressCode!,
        destinationNodeId: d.destination?.nodeId!,
        carType: d.carType!,
        maxPrice: d.maxPrice!,
      }],
    });
    await ctx.reply(
      `✅ Подписка сохранена!\n` +
        `Тип места: ${seatTypeNameByType[d.carType!]}\n` +
        `Дата: ${d.departureDate}\n` +
        `Отправление: ${d.origin!.name}\n` +
        `Назначение: ${d.destination!.name}\n` +
        `Макс. цена: ${d.maxPrice} руб.`,
      Markup.removeKeyboard()
    );
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Ошибка при сохранении подписки. Попробуйте позже.");
  }
  ctx.scene.leave();
});

// Отправка пользователю сообщения с клавиатурой "Назад" / "Отмена"
async function sendWithKeyboard(ctx: SubscriptionWizardContext, message: string) {
  await ctx.reply(message, Markup.keyboard([["⬅️ Назад"], ["❌ Отмена"]]).resize());
}

// Запрос следующего параметра у пользователя
async function ask(ctx: SubscriptionWizardContext) {
  const step = steps[ctx.session.stepIndex];
  await sendWithKeyboard(ctx, step.message);
}

// Отображение введённых пользователем данных перед сохранением
async function showSummary(ctx: SubscriptionWizardContext) {
  const d = ctx.session.data;
  const summary = [
    `📋 <b>Проверьте данные перед сохранением:</b>`,
    `🗓 <b>Дата:</b> ${d.departureDate}`,
    `🚉 <b>Отправление:</b> ${d.origin?.name}`,
    `🎯 <b>Назначение:</b> ${d.destination?.name}`,
    `💰 <b>Макс. цена:</b> ${d.maxPrice} руб.`,
    `💺 <b>Тип места:</b> ${seatTypeNameByType[d.carType!]}`,
  ].join("\n");

  const editBtns = steps.map((s) => [
    Markup.button.callback(`✏️ Изменить ${s.label}`, `edit_${s.key}`),
  ]);
  editBtns.push([Markup.button.callback("✅ Сохранить подписку", "save_subscription")]);

  await ctx.replyWithHTML(summary, Markup.inlineKeyboard(editBtns));
}