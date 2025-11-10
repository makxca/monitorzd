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
nvm use
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

### База данных

Поднимитe какую-нибудь БД где-нибудь. Например так (поднимет docker контейнер с БД на порту 5432):

```Bash
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

### Запустите бота

#### Переменные окружения

Должен быть файл .env с переменными окружения:

```Bash
BOT_TOKEN= # Токен бота
PG_HOST= # Хост базы данных
PG_PORT= # Порт базы данных
PG_USER= # Пользователь базы данных
PG_PASSWORD= # Пароль базы данных
PG_DATABASE= # Название базы данных
IS_DEV= # В деве чистим БД перед стартом и добавляем тестовые данные
```

#### Запуск

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
