import { Scenes, Markup } from "telegraf";
import { Subscription } from "../model/Subscription.js";
import { fetchStationSuggestions, Station } from "../lib/fetchStationSuggestions.js";
import { isValidDate, isValidPrice } from "../lib/utils.js";

const seatTypeNameByType = {
  plaz: 'Плацкарт',
  coop: 'Купе',
  SV: 'СВ',
  sitting: 'Сидячее',
} as const;

type SeatType = keyof typeof seatTypeNameByType;
const seatTypes: SeatType[] = ["plaz", "coop", "SV", "sitting"];

interface SubscriptionData {
  departureDate?: string;
  origin?: Station[];
  destination?: Station[];
  maxPrice?: number;
  carType?: SeatType;
}

interface SubscriptionWizardSession extends Scenes.WizardSessionData {
  stepIndex: number;
  inEditing: boolean;

  data: SubscriptionData;

  selectingStationFor?: "origin" | "destination" | null;
  stationOptions?: Station[];
  selectedStations?: Station[];
  lastStationMessageId?: number;
}

interface SubscriptionWizardContext extends Scenes.WizardContext {
  session: SubscriptionWizardSession;
}

interface Step {
  key: keyof SubscriptionData;
  label: string;
  message: string;
  validate?: (text: string) => Promise<any> | any;
  error: string;
}

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
  ctx.session.selectedStations = [];
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
    ctx.session.selectedStations = [];
    return showSummary(ctx);
  }
  ctx.session.stepIndex = Math.max(0, ctx.session.stepIndex - 1);
  await ask(ctx);
});

// Основной обработчик пользовательского ввода. Сюда попадает все, что пользователь вводит текстом (кроме ❌ Отмена и ⬅️ Назад,
// на эти действия есть отдельные обработчики)
createSubscriptionScene.on("text", async (ctx) => {
  if (ctx.session.stepIndex >= steps.length) return showSummary(ctx);

  const text = ctx.message.text.trim();
  const step = steps[ctx.session.stepIndex];

  // Станции обрабатываем отдельно, так как тут не совсем тривиальная логика с запросом списка из API РЖД и
  // предоставлением пользователю множественного выбора
  if (step.key === "origin" || step.key === "destination") {
    try {
      const stations = await fetchStationSuggestions(text).catch(() => []);
      if (!stations.length) return sendWithKeyboard(ctx, step.error);

      ctx.session.stationOptions = stations;
      ctx.session.selectedStations = [];
      ctx.session.selectingStationFor = step.key;

      return sendStationSelection(ctx);
    } catch {
      return sendWithKeyboard(ctx, step.error);
    }
  } 

  // Остальные шаги по стандартному флоу: валидируем пользовательский ввод, инкрементим stepIndex, 
  // переходим к следующему шагу
  const result = await step.validate?.(text);
  if (!result) {
    await sendWithKeyboard(ctx, step.error);
    return;
  }

  ctx.session.data[step.key] = result;

  if (ctx.session.inEditing) {
    ctx.session.stepIndex = steps.length;
    ctx.session.inEditing = false;
    return showSummary(ctx);
  }

  ctx.session.stepIndex++;
  if(steps[ctx.session.stepIndex].key === "carType") {
    return ctx.reply(
      "Выберите тип места:",
      Markup.inlineKeyboard(
        seatTypes.map((t) => Markup.button.callback(seatTypeNameByType[t], `seat_${t}`)),
        { columns: 2 }
      )
    );
  }

  if (ctx.session.stepIndex >= steps.length) return showSummary(ctx);
  return ask(ctx);
});

// Функция для отправки пользователю меню выбора станций
async function sendStationSelection(ctx: SubscriptionWizardContext) {
  const buttons = ctx.session.stationOptions!.map((s) => {
    const selected = ctx.session.selectedStations!.some(sel => sel.expressCode === s.expressCode);
    return Markup.button.callback(`${selected ? "✅ " : ""}${s.name}`, `station_toggle_${s.expressCode}`);
  });
  buttons.unshift(Markup.button.callback("🌆 Все станции города", "station_all"));
  buttons.push(Markup.button.callback("✅ Готово", "station_done"));

  // Удаляем предыдущее сообщение со списком, если есть
  if (ctx.session.lastStationMessageId) {
    try {
      await ctx.deleteMessage(ctx.session.lastStationMessageId);
    } catch {}
  }

  const msg = await ctx.reply(
    "Выберите станции (можно несколько):",
    Markup.inlineKeyboard(buttons, { columns: 1 })
  );

  ctx.session.lastStationMessageId = msg.message_id;
}

// Регистрация обработчика на выбор станции из предложенного списка
createSubscriptionScene.action(/station_toggle_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const code = ctx.match![1];
  const station = ctx.session.stationOptions!.find(s => s.expressCode === code);
  if (!station) return;
  const selected = ctx.session.selectedStations!;
  const idx = selected.findIndex(s => s.expressCode === code);
  if (idx >= 0) selected.splice(idx, 1);
  else selected.push(station);
  return sendStationSelection(ctx);
});

// Регистрация обработчика на выбор всех доступных станций (если пользователю вообще пофиг с какой станции ехать)
createSubscriptionScene.action("station_all", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.selectedStations = [...ctx.session.stationOptions!];
  return sendStationSelection(ctx);
});

// Регистрация обработчика на завершение выбора станций
createSubscriptionScene.action("station_done", async (ctx) => {
  await ctx.answerCbQuery();
  const which = ctx.session.selectingStationFor!;
  ctx.session.data[which] = ctx.session.selectedStations!;
  ctx.session.selectingStationFor = null;
  ctx.session.stationOptions = [];
  ctx.session.selectedStations = [];
  ctx.session.lastStationMessageId = undefined;
  ctx.session.stepIndex++;
  if (ctx.session.inEditing) {
    ctx.session.inEditing = false;
    ctx.session.stepIndex = steps.length;
  }
  await ctx.reply(`✅ Выбрано: ${ctx.session.data[which]!.map(s => s.name).join(", ")}`);
  if (ctx.session.stepIndex >= steps.length) return showSummary(ctx);
  return ask(ctx);
});

// Регистрация обработчиков на выбор тип места
seatTypes.forEach((type) =>
  createSubscriptionScene.action(`seat_${type}`, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.data.carType = type;
    ctx.session.stepIndex++;
    return showSummary(ctx);
  })
);

// Регистрация обработчиков на редактирование парметров подписки
steps.forEach((s, idx) =>
  createSubscriptionScene.action(`edit_${s.key}`, async (ctx) => {
    console.log("editing index: ", idx);
    await ctx.answerCbQuery();
    ctx.session.inEditing = true;
    ctx.session.stepIndex = idx;
    await sendWithKeyboard(ctx, `✏️ Измените значение поля: ${s.label}\n${s.message}`);
  })
);

// Сохранение подписки
createSubscriptionScene.action("save_subscription", async (ctx) => {
  await ctx.answerCbQuery();
  const d = ctx.session.data;
  try {
    await Subscription.upsert({
      telegramId: String(ctx.from?.id),
      filter: {
        departureDate: d.departureDate!,
        origin: d.origin!,
        destination: d.destination!,
        carType: d.carType!,
        maxPrice: d.maxPrice!,
      },
    });
    await ctx.reply(
      `✅ Подписка сохранена!\n` +
      `Тип места: ${seatTypeNameByType[d.carType!]}\n` +
      `Дата: ${d.departureDate}\n` +
      `Отправление: ${d.origin!.map(s => s.name).join(", ")}\n` +
      `Назначение: ${d.destination!.map(s => s.name).join(", ")}\n` +
      `Макс. цена: ${d.maxPrice} руб.`,
      Markup.removeKeyboard()
    );
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Ошибка при сохранении подписки. Попробуйте позже.");
  }
  ctx.scene.leave();
});

// Отправка сообщения пользователю с кнопками "Назад" и "Отмена". Кнопки нужно отправлять с каждым сообщением,
// иначе они просто не будут отображаться в интерфейсе
async function sendWithKeyboard(ctx: SubscriptionWizardContext, message: string) {
  await ctx.reply(
    message,
    Markup.keyboard([["⬅️ Назад"], ["❌ Отмена"]]).resize()
  );
}

// Запрос следующего параметра у пользователя
async function ask(ctx: SubscriptionWizardContext) {
  const step = steps[ctx.session.stepIndex];
  await sendWithKeyboard(ctx, step.message);
}

// Отображение введенных данных
async function showSummary(ctx: SubscriptionWizardContext) {
  const d = ctx.session.data;
  const summary = [
    `📋 <b>Проверьте данные перед сохранением:</b>`,
    `🗓 <b>Дата:</b> ${d.departureDate}`,
    `🚉 <b>Отправление:</b> ${d.origin!.map(s => s.name).join(", ")}`,
    `🎯 <b>Назначение:</b> ${d.destination!.map(s => s.name).join(", ")}`,
    `💰 <b>Макс. цена:</b> ${d.maxPrice} руб.`,
    `💺 <b>Тип места:</b> ${seatTypeNameByType[d.carType!]}`,
  ].join("\n");

  const editBtns = steps.map((s) => [
    Markup.button.callback(`✏️ Изменить ${s.label}`, `edit_${s.key}`),
  ]);
  editBtns.push([Markup.button.callback("✅ Сохранить подписку", "save_subscription")]);

  await ctx.replyWithHTML(summary, Markup.inlineKeyboard(editBtns));
}