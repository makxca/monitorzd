./src/scripts/pre.sh
# Starts the bot in development mode
echo "Print the bot token..."
read BOT_TOKEN
export BOT_TOKEN
nodemon ./src/index.ts -w *.ts
