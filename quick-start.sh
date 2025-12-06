#!/bin/bash

# AutoPatch AI - Quick Start Script
# Hackathon demo için hızlı kurulum

set -e

echo "🚀 AutoPatch AI - Quick Start"
echo "=============================="
echo ""

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# .env dosyası kontrolü
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı, oluşturuluyor...${NC}"
    cat > .env << 'EOF'
PORT=5000
MONGODB_URI=mongodb://localhost:27017/autopatch-scanner-service
MOCK_CCE=true
ADMIN_API_KEY=super-secure-admin-key
EOF
    echo -e "${GREEN}✅ .env dosyası oluşturuldu${NC}"
fi

# MongoDB kontrolü
echo "📦 MongoDB kontrol ediliyor..."
if ! docker ps | grep -q autopatch-mongo; then
    echo "🐳 MongoDB container'ı başlatılıyor..."
    docker compose up -d mongo
    sleep 3
    echo -e "${GREEN}✅ MongoDB başlatıldı${NC}"
else
    echo -e "${GREEN}✅ MongoDB zaten çalışıyor${NC}"
fi

# Backend dependencies
echo ""
echo "📦 Backend dependencies kontrol ediliyor..."
if [ ! -d "node_modules" ]; then
    echo "📥 Backend dependencies yükleniyor..."
    npm install
    echo -e "${GREEN}✅ Backend dependencies yüklendi${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies mevcut${NC}"
fi

# Frontend dependencies
echo ""
echo "📦 Frontend dependencies kontrol ediliyor..."
if [ ! -d "frontend/node_modules" ]; then
    echo "📥 Frontend dependencies yükleniyor..."
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ Frontend dependencies yüklendi${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies mevcut${NC}"
fi

# Nginx kontrolü
echo ""
echo "🌐 Nginx kontrol ediliyor..."
if ! docker ps | grep -q autopatch-nginx; then
    echo "🐳 Nginx container'ı başlatılıyor..."
    docker compose up -d nginx
    sleep 2
    echo -e "${GREEN}✅ Nginx başlatıldı${NC}"
else
    echo -e "${GREEN}✅ Nginx zaten çalışıyor${NC}"
fi

echo ""
echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
echo ""
echo "📋 Sonraki adımlar:"
echo "   1. Backend'i başlat:  npm run dev"
echo "   2. Frontend'i başlat: cd frontend && npm run dev"
echo "   3. Tarayıcıda aç:     http://localhost:3000"
echo ""
echo "📖 Detaylı bilgi için DEMO_GUIDE.md dosyasına bakın"
echo ""

