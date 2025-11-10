./src/scripts/pre.sh
# Starts the bot
echo "Print the bot token..."
read BOT_TOKEN
export BOT_TOKEN
echo "\nStarting the bot..."
ts-node ./src/index.ts
