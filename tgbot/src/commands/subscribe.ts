import { Scenes, Markup } from "telegraf";
import { Subscription } from "../model/Subscription.js";

const seatTypes = ['plaz', 'coop', 'SV', 'sitting'];

export const createSubscriptionScene = new Scenes.WizardScene<Scenes.WizardContext>(
  "create-subscription",
  // дата отправления
  async (ctx) => {
    await ctx.reply("Введите дату отправления (в формате YYYY-MM-DD):");
    return ctx.wizard.next();
  },
  // валидация даты
  async (ctx) => {
    const departureDate = ctx.message?.text?.trim();
    if (!departureDate || !isValidDate(departureDate)) {
      await ctx.reply('❌ Неверный формат даты. Попробуйте ещё раз (например: 2001-05-17)');
      return;
    }

    ctx.wizard.state.departureDate = departureDate;
    await ctx.reply(`✅ Дата принята: ${departureDate}`);


    await ctx.reply("Введите станцию отправления");
    return ctx.wizard.next();
  },

  // валидация станции отправления
  async (ctx) => {
    const query = ctx.message?.text?.trim();
    if (!query) {
      await ctx.reply('Введите название станции текстом:');
      return;
    }

    try {
      const stations = await fetchStationSuggestions(query);

      if (stations.length === 0) {
        await ctx.reply('❌ Станция не найдена. Попробуйте уточнить название.');
        return;
      }

      // Для простоты — берём первую станцию
      const station = stations[0];
      ctx.wizard.state.origin = station.expressCode;

      await ctx.reply(`✅ Найдена станция: ${station.name}`);

      await ctx.reply("Введите станцию назначения");
      return ctx.wizard.next();
    } catch (err) {
      console.error(err);
      await ctx.reply('🚨 Не удалось проверить станцию. Попробуйте еще раз.');
    }
  },

  // валидация станции назначения
  async (ctx) => {
    const query = ctx.message?.text?.trim();
    if (!query) {
      await ctx.reply('Введите название станции текстом:');
      return;
    }

    try {
      const stations = await fetchStationSuggestions(query);

      if (stations.length === 0) {
        await ctx.reply('❌ Станция не найдена. Попробуйте уточнить название.');
        return;
      }

      // Для простоты — берём первую станцию
      const station = stations[0];
      ctx.wizard.state.destination = station.expressCode;

      await ctx.reply(`✅ Найдена станция: ${station.name}`);

      await ctx.reply("Введите максимальную допустимую стоимость билетов");
      return ctx.wizard.next();
    } catch (err) {
      console.error(err);
      await ctx.reply('🚨 Не удалось проверить станцию. Попробуйте еще раз.');
    }
  },

  // валидация стоимости + запрос на тип места
  async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || !isValidPrice(text)) {
      await ctx.reply('❌ Введите корректную сумму в рублях (например: 1500)');
      return;
    }

    ctx.wizard.state.maxPrice = Number(text);
    await ctx.reply(`✅ Максимальная стоимость установлена: ${ctx.wizard.state.maxPrice} руб.`);

    await ctx.reply(
      'Выберите тип места:',
      Markup.inlineKeyboard(
        seatTypes.map((type) => Markup.button.callback(type, `seat_${type}`)),
        { columns: 2 }
      )
    );

    return ctx.wizard.next();
  }
);

seatTypes.forEach((type) => {
  createSubscriptionScene.action(`seat_${type}`, async (ctx) => {
    ctx.wizard.state.carType = type;

    await ctx.answerCbQuery();

    const state = ctx.wizard.state;

    const filters = [
      {
        departureDate: state.departureDate,
        origin: state.origin,
        destination: state.destination,
        carType: state.carType,
        maxPrice: state.maxPrice || 0,
      },
    ];

    try {
      await Subscription.upsert({
        telegramId: String(ctx.from?.id),
        filters,
      });

      await ctx.reply(
        `✅ Подписка сохранена!\nТип места: ${state.carType}\n` +
        `Дата: ${state.departureDate}\n` +
        `Отправление: ${state.origin}\n` +
        `Максимальная цена: ${state.maxPrice} руб.`
      );
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ошибка при сохранении подписки. Попробуйте позже.');
    }

    ctx.scene.leave();
  });
});

function isValidPrice(input: string): boolean {
  const price = Number(input.trim());
  return !isNaN(price) && price > 0;
}

function isValidDate(input: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(input)) return false;

  const [year, month, day] = input.split('-').map(Number);
  const date = new Date(input);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  return true;
}

async function fetchStationSuggestions(query: string) {
  const url = new URL('https://ticket.rzd.ru/api/v1/suggests');
  url.searchParams.set('Query', query);
  url.searchParams.set(
    'TransportType',
    'bus,avia,rail,aeroexpress,suburban,boat'
  );
  url.searchParams.set('GroupResults', 'true');
  url.searchParams.set('RailwaySortPriority', 'true');
  url.searchParams.set('SynonymOn', '1');
  url.searchParams.set('Language', 'ru');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) throw new Error('Ошибка запроса к API РЖД');

  const data = await res.json();

  const stations: { name: string; expressCode: string }[] = [];

  for (const group of ['train', 'avia', 'bus', 'suburban']) {
    if (data[group]) {
      for (const item of data[group]) {
        stations.push({
          name: item.name,
          expressCode: item.expressCode,
        });
      }
    }
  }

  return stations;
}