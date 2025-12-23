#!/bin/bash
# Local development bot with webhook mode
# No VPS involved - purely local testing with @separator_bot

set -e

echo "🚀 Starting local development bot..."
echo "🤖 Bot: @separator_bot (webhook mode)"
echo ""

# Clean up old containers
docker-compose -f config/docker-compose.yml down 2>/dev/null || true
sleep 2

# Build and start with .env.dev
npm run build
export $(cat .env.dev | xargs)
docker-compose -f config/docker-compose.yml up -d

sleep 3

echo ""
echo "✅ Development bot started!"
echo "🔌 Mode: Webhook (Telegram pushes updates to your local server)"
echo ""
echo "Recent logs:"
docker-compose -f config/docker-compose.yml logs app | tail -15
