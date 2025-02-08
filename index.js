import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.TOKEN;
const API_KEY_RATE = process.env.API_KEY_RATE;
const API_KEY_WEATHER = process.env.API_KEY_WEATHER;

const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY_RATE}/latest/USD`;
const WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?q=Tashkent&appid=${API_KEY_WEATHER}&units=metric&lang=ru`;
const MEME_URL = "https://meme-api.com/gimme/ru_memes";
const AIR_QUALITY_URL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=41.2995&lon=69.2401&appid=${API_KEY_WEATHER}`;

const bot = new TelegramBot(TOKEN, { polling: true });

async function getExchangeRates() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.conversion_rates?.RUB || !data.conversion_rates?.UZS) {
      throw new Error("Ошибка получения курсов");
    }

    const usdToRub = data.conversion_rates.RUB;
    const usdToSum = data.conversion_rates.UZS;
    const rubToSum = usdToSum / usdToRub;

    return `💰 *Курсы валют:*\n1 USD = ${usdToRub.toFixed(
      2
    )} RUB\n1 USD = ${usdToSum.toFixed(2)} SUM\n1 RUB = ${rubToSum.toFixed(
      2
    )} SUM`;
  } catch (error) {
    console.error("Ошибка получения курсов:", error);
    return "❌ Не удалось получить курсы валют.";
  }
}

async function getWeather() {
  try {
    const response = await fetch(WEATHER_URL);
    const data = await response.json();

    if (!data.main || !data.weather) {
      throw new Error("Ошибка получения погоды");
    }

    const temp = data.main.temp.toFixed(1);
    const feelsLike = data.main.feels_like.toFixed(1);
    const description = data.weather[0].description;

    return `🌤 *Погода в Ташкенте:*\nТемпература: ${temp}°C\nОщущается как: ${feelsLike}°C\n${description}`;
  } catch (error) {
    console.error("Ошибка получения погоды:", error);
    return "❌ Не удалось получить данные о погоде.";
  }
}

async function getAirQuality() {
  try {
    const response = await fetch(AIR_QUALITY_URL);
    const data = await response.json();

    if (!data.list || !data.list[0].main.aqi) {
      throw new Error("Ошибка получения данных воздуха");
    }

    const aqi = data.list[0].main.aqi;
    const aqiLevels = [
      "Хороший",
      "Приемлемый",
      "Умеренный",
      "Плохой",
      "Очень плохой",
    ];
    const airQuality = aqiLevels[aqi - 1];

    return `🌫 *Загрязнение воздуха:*\nИндекс качества воздуха: ${aqi} (${airQuality})`;
  } catch (error) {
    console.error("Ошибка получения данных о воздухе:", error);
    return "❌ Не удалось получить данные о качестве воздуха.";
  }
}

async function getMeme() {
  try {
    const response = await fetch(MEME_URL);
    const data = await response.json();

    if (!data.url) {
      throw new Error("Ошибка получения мема");
    }

    return data.url;
  } catch (error) {
    console.error("Ошибка получения мема:", error);
    return null;
  }
}

bot.onText(/\/info/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "⏳ Собираю данные, подождите...");

  const [rates, weather, airQuality] = await Promise.all([
    getExchangeRates(),
    getWeather(),
    getAirQuality(),
  ]);

  const message = `${rates}\n\n${weather}\n\n${airQuality}`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot
    .sendMessage(chatId, "🔄 Обновляю меню...", {
      reply_markup: { remove_keyboard: true },
    })
    .then(() => {
      setTimeout(() => {
        const welcomeMessage = `
👋 Привет, ${msg.from.first_name}!
Я бот, который показывает курсы валют, погоду и качество воздуха. 💰🌤🌫

Нажми кнопку ниже, чтобы получить актуальные данные. ⬇
      `;

        const options = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📊 бэнг Андрею или Получить данные",
                  callback_data: "get_info",
                },
                { text: "мем - тык", callback_data: "get_meme" },
              ],
            ],
          },
        };

        bot.sendMessage(chatId, welcomeMessage, options);
      }, 500);
    });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "get_info") {
    bot.sendMessage(chatId, "⏳ Собираю данные, подождите...");

    const [rates, weather, airQuality] = await Promise.all([
      getExchangeRates(),
      getWeather(),
      getAirQuality(),
    ]);

    const message = `${rates}\n\n${weather}\n\n${airQuality}`;

    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📊 бэнг Андрею или Обновить данные",
              callback_data: "get_info",
            },
            { text: "мем - тык", callback_data: "get_meme" },
          ],
        ],
      },
    });
  }
  if (query.data === "get_meme") {
    bot.sendMessage(chatId, "Загружаю...");
    const memeUrl = await getMeme();
    if (memeUrl) {
      bot.sendPhoto(chatId, memeUrl, {
        caption: "мем",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📊 бэнг Андрею или Обновить данные",
                callback_data: "get_info",
              },
              { text: "мем - тык", callback_data: "get_meme" },
            ],
          ],
        },
      });
    } else {
      bot.sendMessage(chatId, "❌ Мем не загрузился");
    }
  }
  bot.answerCallbackQuery(query.id);
});

console.log("Бот запущен!");
