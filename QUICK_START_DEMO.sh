#!/bin/bash

# 🚀 Quick Start Demo Script
# Bu script demo'yu hızlıca başlatır

set -e

echo "🚀 AutoPatch AI - Demo Başlatılıyor..."
echo ""

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. MongoDB kontrolü
echo -e "${YELLOW}1. MongoDB kontrol ediliyor...${NC}"
if docker ps | grep -q mongo; then
    echo -e "${GREEN}✅ MongoDB çalışıyor${NC}"
else
    echo -e "${RED}❌ MongoDB çalışmıyor, başlatılıyor...${NC}"
    docker compose up -d mongo
    sleep 5
fi

# 2. Paket kontrolü
echo -e "${YELLOW}2. Gerekli paketler kontrol ediliyor...${NC}"
if ! npm list mongodb dotenv > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Paketler yükleniyor...${NC}"
    npm install mongodb dotenv
fi

if ! command -v ts-node &> /dev/null; then
    echo -e "${YELLOW}📦 ts-node yükleniyor...${NC}"
    npm install -D ts-node typescript
fi

# 3. Demo verisi oluştur
echo -e "${YELLOW}3. Demo verisi oluşturuluyor...${NC}"
if npm run generate-demo-data; then
    echo -e "${GREEN}✅ Demo verisi oluşturuldu${NC}"
else
    echo -e "${RED}❌ Demo verisi oluşturulamadı${NC}"
    echo -e "${YELLOW}Manuel olarak deneyin: npx ts-node scripts/generate-demo-data.ts${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Demo hazır!${NC}"
echo ""
echo "📋 Sonraki Adımlar:"
echo ""
echo "1. Backend'i başlat (yeni terminal):"
echo "   cd /home/emir/Masaüstü/Huawei"
echo "   npm run dev"
echo ""
echo "2. Frontend'i başlat (başka bir terminal):"
echo "   cd /home/emir/Masaüstü/Huawei/frontend"
echo "   npm run dev"
echo ""
echo "3. Tarayıcıda aç:"
echo "   http://localhost:3000"
echo ""
echo "📖 Detaylı rehber: HOW_TO_RUN_DEMO.md"
echo ""

