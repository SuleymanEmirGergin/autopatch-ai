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

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7+ (veya Docker)
- npm veya yarn

### Installation

```bash
# 1. Repository'yi klonlayın
git clone https://github.com/SuleymanEmirGergin/autopatch-ai.git
cd autopatch-ai

# 2. Dependencies'leri yükleyin
npm install
cd frontend && npm install && cd ..

# 3. Environment variables'ı ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin

# 4. MongoDB'yi başlatın (Docker ile)
docker compose up -d mongo

# 5. Demo verisini oluşturun (opsiyonel)
npm run generate-demo-data

# 6. Backend'i başlatın (Terminal 1)
npm run dev

# 7. Frontend'i başlatın (Terminal 2)
cd frontend && npm run dev
```

**Tarayıcıda açın:** http://localhost:3000

### 🎬 Demo Modu (Hackathon İçin)

Hızlı demo için:

```bash
# Otomatik demo script'i
./QUICK_START_DEMO.sh

# Veya manuel
npm install mongodb dotenv
npm run generate-demo-data
npm run dev  # Backend
cd frontend && npm run dev  # Frontend (yeni terminal)
```

📖 **Detaylı Demo Rehberi:** [Demo Guide](docs/guides/DEMO_GUIDE.md)

### 🐳 Docker ile Kurulum

Tüm servisleri Docker ile çalıştırmak için:

```bash
docker compose up --build
```

Bu komut MongoDB, Backend ve Frontend'i birlikte başlatır.

### ⚙️ Geliştirme Modu

Ayrı portlarda çalıştırmak için:

```bash
# 1. MongoDB'yi başlat
docker compose up -d mongo

# 2. Backend (port 5000)
PORT=5000 npm run dev

# 3. Frontend (port 3002 - yeni terminal)
cd frontend
PORT=3002 npm run dev
```

Erişim:
- Frontend: http://localhost:3002
- Backend: http://localhost:5000
- API Docs: http://localhost:5000/docs

## 🧪 Testing

```bash
# Tüm testleri çalıştır
npm test

# Coverage ile
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📡 API Documentation

### REST API Endpoints

#### Core Endpoints
- `GET /health` - Health check
- `POST /scan` - Trigger scan
- `GET /images` - List all images with risk scores
- `GET /images/:imageName` - Get image details
- `GET /images/:imageName/history` - Get scan history
- `GET /images/top` - Get top N risky images
- `GET /docs` - Swagger UI documentation

#### Allowlist Management
- `GET /allowlist` - List all allowlist entries
- `POST /allowlist` - Add/update allowlist entry
- `DELETE /allowlist/:imageName` - Delete allowlist entry

**📖 Full API Documentation:** Visit `http://localhost:5000/docs` for interactive Swagger UI

## ☁️ Huawei Cloud CCE Integration

Proje Huawei Cloud CCE (Container Engine) ile entegre çalışabilir.

### Configuration

1. **Environment Variables** ayarlayın:

```bash
MOCK_CCE=false
CCE_ENDPOINT=https://cce.cn-north-1.myhuaweicloud.com
CCE_PROJECT_ID=your-project-id
CCE_CLUSTER_ID=your-cluster-id
```

2. **Authentication** yöntemi seçin:

**Option 1: Token-based (Recommended)**
```bash
CCE_TOKEN=your-huawei-cloud-token
```

**Option 2: AK/SK (Access Key / Secret Key)**
```bash
HUAWEI_ACCESS_KEY=your-access-key
HUAWEI_SECRET_KEY=your-secret-key
HUAWEI_REGION=cn-north-1
```

3. **Test Connection**: Backend başlatıldığında otomatik olarak bağlanmayı dener.

📖 **Detaylı Rehber:** [Huawei Cloud Integration Guide](HUAWEI_CLOUD_INTEGRATION_GUIDE.md)

**Note:** RBAC permissions'ların yapılandırıldığından emin olun.

## 📁 Project Structure

```
autopatch-ai/
├── src/                    # Backend source code
│   ├── api/               # Express routes & controllers
│   ├── config/            # Configuration management
│   ├── persistence/       # MongoDB models & repositories
│   ├── risk/              # Risk scoring engine
│   ├── scanner/           # CCE scanner implementations
│   ├── services/          # Business logic services
│   └── types/             # TypeScript type definitions
├── frontend/              # Next.js frontend application
│   ├── pages/             # Next.js pages
│   ├── lib/               # API client functions
│   └── styles/            # Global CSS styles
├── tests/                 # Jest test files
├── docs/                  # Documentation
│   ├── guides/            # User guides
│   ├── hackathon-evaluation/  # Hackathon docs
│   └── video/             # Video scripts
├── .github/                # GitHub workflows & templates
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Backend Docker image
└── README.md               # This file
```

## 📚 Documentation

- [AI Features](AI_FEATURES.md) - Complete list of 28+ AI features
- [Demo Guide](docs/guides/DEMO_GUIDE.md) - Hackathon demo scenarios
- [Usage Guide](docs/guides/USAGE_GUIDE.md) - Detailed usage guide
- [Huawei Cloud Integration](HUAWEI_CLOUD_INTEGRATION_GUIDE.md) - Cloud setup guide
- [Security Improvements](SECURITY_IMPROVEMENTS.md) - Security features
- [Contributing](CONTRIBUTING.md) - Contribution guidelines

## 🎯 Hackathon Notes

- **Mock Mode**: Set `MOCK_CCE=true` to run without real Huawei Cloud connection
- **Quick Setup**: Use `./QUICK_START_DEMO.sh` for fast demo setup
- **API Docs**: Available at `http://localhost:5000/docs` (Swagger UI)
- **Demo Scenarios**: See [Demo Guide](docs/guides/DEMO_GUIDE.md)

## 📞 Support

- **Health Check**: `http://localhost:5000/health`
- **API Documentation**: `http://localhost:5000/docs`
- **Issues**: [GitHub Issues](https://github.com/SuleymanEmirGergin/autopatch-ai/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


