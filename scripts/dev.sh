#!/bin/bash
# Development mode: Local webhook testing
# Uses .env.dev for separator_bot with webhook mode on port 3001

set -e
cd "$(dirname "$0")"

echo "🚀 Starting development bot with webhook mode..."
echo "📝 Bot: separator_bot (webhook mode on port 3001)"
echo ""

# Full cleanup
docker-compose -f config/docker-compose.yml down 2>/dev/null || true
sleep 2

# Use .env.dev - copy to .env so Docker picks it up
cp .env.dev .env

# Add PORT=3001 to .env
echo "PORT=3001" >> .env

# Build
npm run build

# Start
docker-compose -f config/docker-compose.yml up -d

sleep 4

echo ""
echo "✅ Development bot started!"
echo "🤖 Bot: @separator_bot"
echo "🔌 Mode: Webhook (no polling)"
echo "🌐 Port: 3001"
echo ""
echo "📱 Test: Send /start to @separator_bot"
echo ""
echo "✅ API Status:"
sleep 2
curl -s http://localhost:3001/api/status 2>&1 | jq '.status, .message' || echo "⏳ Still starting..."


