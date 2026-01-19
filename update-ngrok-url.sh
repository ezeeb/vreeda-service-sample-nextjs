#!/bin/bash

# Update ngrok URL in .env.local
# Usage: ./update-ngrok-url.sh

set -e

echo "🔍 Fetching ngrok URL..."

# Wait for ngrok to be ready
sleep 2

# Get ngrok URL from API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
  echo "❌ Error: Could not fetch ngrok URL. Is ngrok running?"
  echo "   Start ngrok with: yarn ngrok"
  exit 1
fi

echo "✅ ngrok URL: $NGROK_URL"

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

# Update NEXTAUTH_URL
if grep -q "^NEXTAUTH_URL=" .env.local; then
  # Use different delimiter for sed since URL contains /
  sed -i '' "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=\"$NGROK_URL\"|" .env.local
  echo "✅ Updated NEXTAUTH_URL"
else
  echo "NEXTAUTH_URL=\"$NGROK_URL\"" >> .env.local
  echo "✅ Added NEXTAUTH_URL"
fi

# Update OAUTH2_REDIRECT_URI
if grep -q "^OAUTH2_REDIRECT_URI=" .env.local; then
  sed -i '' "s|^OAUTH2_REDIRECT_URI=.*|OAUTH2_REDIRECT_URI=\"$NGROK_URL/api/consent/callback\"|" .env.local
  echo "✅ Updated OAUTH2_REDIRECT_URI"
else
  echo "OAUTH2_REDIRECT_URI=\"$NGROK_URL/api/consent/callback\"" >> .env.local
  echo "✅ Added OAUTH2_REDIRECT_URI"
fi

echo ""
echo "🎉 Done! Your .env.local has been updated."
echo ""
echo "📝 Don't forget to update these URLs in:"
echo "   1. Azure B2C App Registration → Redirect URIs:"
echo "      $NGROK_URL/api/auth/callback/azure-ad-b2c"
echo ""
echo "   2. ConsentService Client Configuration:"
echo "      $NGROK_URL/api/consent/callback"
echo ""
echo "🔄 Restart Next.js: yarn dev"