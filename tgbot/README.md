# Телеграм-бот для мониторинг RZD

## Запуск

### [Установите NodeJS](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs). Рекомендуемый способ — с использованием nvm:

1. Установите nvm
```Bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
Или
```Bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
2. Установите NodeJS
```Bash
nvm install 20
nvm use 20
```
3. Проверьте результат
```Bash
node -v # 20.11.0
npm -v  # 10.2.4
```
4. Установите зависимости
```Bash
npm install
```

### Запустите бота

```Bash
npm start
```

Запустить бота в режиме разработки

```Bash
npm run dev
```

## Технологии

- Node.JS
- [Библиотека telegraf](https://github.com/telegraf/telegraf)
- [Telegram BOT API](https://core.telegram.org/bots/api)
