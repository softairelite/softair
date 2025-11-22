#!/bin/bash
# Deploy Supabase Edge Function for Biometric Authentication

set -e  # Exit on error

echo "🚀 Deploying Supabase Edge Function: biometric-auth"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS: brew install supabase/tap/supabase"
    echo "  npm:   npm install -g supabase"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo ""
    echo "Please login first:"
    echo "  1. Generate a token at: https://app.supabase.com/account/tokens"
    echo "  2. Run: supabase login"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"

# Get project reference
echo ""
echo -e "${YELLOW}📋 Available projects:${NC}"
supabase projects list

echo ""
read -p "Enter your Project Reference ID (e.g., uyubwlukwemqcwropljl): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Project Reference ID is required${NC}"
    exit 1
fi

# Link project
echo ""
echo -e "${YELLOW}🔗 Linking to project: $PROJECT_REF${NC}"
supabase link --project-ref "$PROJECT_REF"

echo -e "${GREEN}✅ Project linked${NC}"

# Deploy function
echo ""
echo -e "${YELLOW}📦 Deploying biometric-auth function...${NC}"
supabase functions deploy biometric-auth

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo ""
echo -e "${YELLOW}📝 Function URL:${NC}"
echo "https://$PROJECT_REF.supabase.co/functions/v1/biometric-auth"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy the function URL above"
echo "2. Update webapp/js/lib/auth.js with this URL"
echo "3. Test Face ID on your device"
echo ""
echo -e "${GREEN}✨ All done!${NC}"
