# AutoPatch AI - Container Image Risk Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

**Enterprise Container Security Platform** - Huawei Cloud CCE entegrasyonlu container güvenlik platformu

AutoPatch AI, Huawei Cloud CCE (veya MOCK modu) üzerinde çalışan pod'ları tarayıp container imajlarını çıkarır, deterministik bir risk skoru hesaplar ve sonuçları MongoDB'ye kaydeder. Otomatik remediation önerileri, patch yönetimi ve kapsamlı raporlama özellikleri sunar.

### Özellikler

#### 🤖 AI-Powered Features (28+)
- **ML-Based Risk Prediction**: TensorFlow.js ile eğitilmiş neural network modeli ile risk skoru tahmini
- **AI-Powered Anomaly Detection**: Autoencoder ile anormal pattern tespiti
- **Intelligent Recommendation Scoring**: ML-based priority scoring ile akıllı öneri önceliklendirme
- **Computer Vision**: Image layer analysis, visual vulnerability detection, pattern recognition
- **Generative AI**: LLM-based script generation, natural language reports, CVE description generation
- **IoT Integration**: Edge device container monitoring, IoT gateway scanning
- **NLP-Based CVE Analysis**: Text analysis, sentiment analysis
- **Predictive Analytics**: Time-series forecasting, trend detection
- **Historical Learning**: Historical data'dan öğrenen modeller
- **Confidence Scoring**: AI tahminlerinin güven skorları

See [AI_FEATURES.md](AI_FEATURES.md) for complete list of 28+ AI features.

#### Backend (Scanner Service)
- **CCE Scanner Katmanı**: `RealCCEScanner` ve `MockCCEScanner` (interface tabanlı).
  - **Huawei Cloud CCE Entegrasyonu**: Gerçek Huawei Cloud CCE Kubernetes API'sine bağlanarak pod'ları çeker.
  - **Authentication**: Token-based veya AK/SK (Access Key/Secret Key) authentication desteği.
  - **Multi-Region**: Farklı region'lar için yapılandırma desteği.
- **Risk Motoru**: Deterministik, saf TypeScript ile yazılmış ve Jest ile test edilmiştir.
  - Risk faktörleri: latest tag, eski imajlar, root user, bilinmeyen base, non-prod tag'ler, test imajları, prod namespace, legacy/canary tag'ler.
- **Persistence**: MongoDB + Mongoose, repository katmanı ile.
- **HTTP API**: Express tabanlı, iş mantığından arındırılmış controller'lar.
- **MOCK Modu**: `MOCK_CCE=true` ile gerçek CCE çağrıları olmadan sentetik pod verisiyle çalışır.
- **Swagger**: `/docs` altında OpenAPI dokümantasyonu.
- **Scan Geçmişi**: Her tarama kaydedilir, image bazında trend analizi yapılabilir.
- **Risk Allowlist**: Belirli image'ler için risk faktörlerini ignore etme desteği.
- **Top Images Endpoint**: En riskli N imajı prod-only filtresiyle çekme.

#### Frontend (Next.js Dashboard)
- **Ana Dashboard**: Tüm image'leri risk skorlarıyla listeleme, filtreleme, arama.
- **Risk Seviyesi Filtresi**: LOW/MEDIUM/HIGH/CRITICAL'e göre filtreleme.
- **Namespace Filtresi**: Belirli namespace'lerdeki image'leri görüntüleme.
- **Image Arama**: Image adına göre canlı arama.
- **Top N En Riskli**: En riskli N imajı öne çıkarma (backend endpoint'inden).
- **Otomatik Yenileme**: 30 saniyede bir otomatik veri güncelleme.
- **Prod Vurgusu**: Prod namespace'inde çalışan pod sayısını vurgulama.
- **Prod Risk Raporu**: Sadece prod ortamındaki HIGH/CRITICAL image'leri gösteren özel sayfa.
- **Image Detay Sayfası**: Tek bir image için detaylı bilgi, pod listesi, risk faktörleri, scan geçmişi.
- **CSV/JSON Export**: Filtrelenmiş listeyi CSV veya JSON olarak indirme.

## Kurulum

### ⚡ Hızlı Başlangıç (Hackathon Demo İçin)

#### 🎬 Demo'yu Çalıştırma (3 Adım)

**1. Demo Verisini Oluştur:**
```bash
# Otomatik script (önerilen)
./QUICK_START_DEMO.sh

# Veya manuel
npm install mongodb dotenv
npm run generate-demo-data
```

**2. Backend'i Başlat (Yeni Terminal):**
```bash
npm run dev
```

**3. Frontend'i Başlat (Başka Bir Terminal):**
```bash
cd frontend
npm run dev
```

**4. Tarayıcıda Aç:**
```
http://localhost:3000
```

**📖 Detaylı Rehber:** [Demo Guide](docs/guides/DEMO_GUIDE.md)

#### Otomatik Kurulum (İlk Kurulum İçin)

En hızlı kurulum için otomatik script kullanın:

```bash
./quick-start.sh
```

Script otomatik olarak:
- `.env` dosyası oluşturur (yoksa)
- MongoDB ve Nginx container'larını başlatır
- Dependencies'leri yükler

Sonra manuel olarak:
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

**Demo için detaylı rehber**: `DEMO_GUIDE.md` dosyasına bakın.

### Hızlı Başlangıç (Tek Port - Önerilen)

Tüm servisleri tek bir localhost portu (3000) üzerinden çalıştırmak için:

1. MongoDB ve Nginx'i başlatın:
```bash
docker compose up -d mongo nginx
```

2. Backend'i başlatın (port 5000):
```bash
npm install
PORT=5000 npm run dev
```

3. Frontend'i başlatın (port 3002):
```bash
cd frontend
npm install
PORT=3002 npm run dev
```

4. Tarayıcıda açın: **http://localhost:3000**

**Not:** Nginx reverse proxy tüm trafiği yönlendirir:
- `http://localhost:3000` → Frontend
- `http://localhost:3000/api` → Backend API
- `http://localhost:3000/docs` → Swagger Docs
- `http://localhost:3000/socket.io` → WebSocket

### Geliştirme Modu (Ayrı Portlar)

Eğer nginx kullanmak istemiyorsanız:

1. `.env` dosyası oluştur:

```bash
cp .env.example .env
# .env dosyasını düzenleyin ve gerekli değerleri girin
```

2. MongoDB yoksa Docker ile başlat:

```bash
docker compose up -d mongo
```

3. Backend'i dev modda çalıştır:

```bash
PORT=5000 npm run dev
```

4. Frontend'i başlat:

```bash
cd frontend
npm install
PORT=3002 npm run dev
```

5. Erişim:
- Frontend: http://localhost:3002
- Backend: http://localhost:5000

Frontend için `.env.local` oluşturun (opsiyonel):

```bash
cd frontend
cat > .env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=/api
BACKEND_ADMIN_API_KEY=your-admin-api-key
NEXT_PUBLIC_READONLY=false
EOF
```

### Production Modu (Docker Compose ile)

```bash
docker compose up --build
```

Bu komut hem MongoDB'yi hem de Scanner Service’i MOCK modda ayağa kaldırır.

### Testler

```bash
npm test
```

### REST API Uç Noktaları

#### Temel Endpoint'ler
- **GET `/health`** – Health check  
- **POST `/scan`** – Taramayı tetikler  
- **GET `/images`** – Tüm imajları risk skorları ile listeler  
- **GET `/images/:imageName`** – Tek bir imaj için detay  
- **GET `/images/:imageName/history?limit=10`** – Bir imajın scan geçmişi  
- **GET `/images/top?limit=5&prodOnly=false`** – En riskli N imaj  
- **GET `/docs`** – Swagger UI

#### Allowlist Yönetimi
- **GET `/allowlist`** – Tüm allowlist kayıtlarını listele  
- **POST `/allowlist`** – Yeni allowlist kaydı ekle/güncelle  
- **DELETE `/allowlist/:imageName`** – Allowlist kaydını sil

### Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

Frontend varsayılan olarak `http://localhost:3001` (veya bir sonraki boş port) üzerinde çalışır.

### Huawei Cloud CCE Entegrasyonu

Proje, Huawei Cloud CCE (Container Engine) ile entegre çalışabilir. Gerçek Huawei Cloud bağlantısı için:

1. **Environment Variables Ayarlayın**:
   - `MOCK_CCE=false` olarak ayarlayın
   - `CCE_ENDPOINT`: Huawei Cloud CCE endpoint URL'i (örn: `https://cce.cn-north-1.myhuaweicloud.com`)
   - `CCE_PROJECT_ID`: Huawei Cloud proje ID'si
   - `CCE_CLUSTER_ID`: CCE cluster ID'si

2. **Authentication Yöntemi Seçin**:

   **Yöntem 1: Token-based (Önerilen)**
   ```bash
   CCE_TOKEN=your-huawei-cloud-token
   ```

   **Yöntem 2: AK/SK (Access Key / Secret Key)**
   ```bash
   HUAWEI_ACCESS_KEY=your-access-key
   HUAWEI_SECRET_KEY=your-secret-key
   HUAWEI_REGION=cn-north-1  # veya kullandığınız region
   ```

3. **Bağlantıyı Test Edin**:
   Backend başlatıldığında, `RealCCEScanner` otomatik olarak Huawei Cloud CCE'ye bağlanmayı dener. Hata durumunda log'larda detaylı bilgi bulunur.

**Not**: Huawei Cloud CCE Kubernetes API'sine erişim için gerekli izinlerin (RBAC) yapılandırıldığından emin olun.

### Proje Yapısı

```
Huawei/
├── src/                    # Backend kaynak kodları
│   ├── api/               # Express routes & controllers
│   ├── config/             # Konfigürasyon yönetimi
│   ├── persistence/        # MongoDB modelleri & repository'ler
│   ├── risk/               # Risk skorlama motoru
│   ├── scanner/            # CCE scanner implementasyonları
│   ├── services/           # Business logic servisleri
│   └── types/              # TypeScript tip tanımları
├── frontend/               # Next.js frontend uygulaması
│   ├── pages/              # Next.js sayfaları
│   ├── lib/                # API client fonksiyonları
│   └── styles/             # Global CSS stilleri
├── tests/                  # Jest test dosyaları
├── docker-compose.yml      # Docker Compose konfigürasyonu
├── Dockerfile              # Backend Docker image tanımı
├── README.md               # Bu dosya
├── DEMO_GUIDE.md           # Hackathon demo rehberi
├── PROJECT_SUMMARY.md      # Proje özeti
└── quick-start.sh          # Hızlı kurulum script'i
```

## 📚 Ek Dokümantasyon

- **DEMO_GUIDE.md**: Hackathon demo rehberi ve senaryoları
- **PROJECT_SUMMARY.md**: Proje özeti ve jüri için bilgiler
- **USAGE_GUIDE.md**: Detaylı kullanım kılavuzu
- **CHANGELOG.md**: Değişiklik geçmişi

## 🎯 Hackathon İçin Önemli Notlar

1. **Mock Modu**: `MOCK_CCE=true` ile gerçek Huawei Cloud bağlantısı olmadan demo yapabilirsiniz
2. **Hızlı Kurulum**: `./quick-start.sh` script'i ile 5 dakikada hazır
3. **Demo Senaryoları**: `DEMO_GUIDE.md` dosyasında detaylı senaryolar var
4. **API Dokümantasyonu**: `http://localhost:3000/docs` adresinde Swagger UI

## 📞 Destek

- Health Check: `http://localhost:3000/health`
- API Docs: `http://localhost:3000/docs`
- Demo Rehberi: `DEMO_GUIDE.md`


