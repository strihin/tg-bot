#!/bin/bash

# Development bot runner with webhook mode
set -a
source .env.dev
set +a

echo "🚀 Starting development bot with webhook mode..."
echo "🤖 Bot: $BOT_USERNAME"
echo "🔌 Mode: WEBHOOK"

npm run dev
