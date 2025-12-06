# ☁️ Huawei Cloud Entegrasyon Kılavuzu

## 📋 Genel Bakış

Bu proje Huawei Cloud Container Engine (CCE) ile entegre edilmiştir. Gerçek Kubernetes pod verilerini çekmek ve analiz etmek için hazırdır.

---

## 🔧 Yapılandırma

### 1. Environment Variables

`.env` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# Huawei Cloud CCE Configuration
MOCK_CCE=false
CCE_ENDPOINT=https://cce.cn-north-1.myhuaweicloud.com
CCE_PROJECT_ID=your-project-id
CCE_CLUSTER_ID=your-cluster-id
CCE_TOKEN=your-token

# Huawei Cloud AK/SK Authentication (Alternatif)
HUAWEI_ACCESS_KEY=your-access-key
HUAWEI_SECRET_KEY=your-secret-key
HUAWEI_REGION=cn-north-1

# MongoDB
MONGODB_URI=mongodb://localhost:27017/autopatch

# API
API_PORT=3000
API_KEY=your-api-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Authentication Yöntemleri

#### Yöntem 1: Token-based Authentication
```env
CCE_TOKEN=your-token
```

#### Yöntem 2: AK/SK Authentication (Önerilen)
```env
HUAWEI_ACCESS_KEY=your-access-key
HUAWEI_SECRET_KEY=your-secret-key
HUAWEI_REGION=cn-north-1
```

---

## 🔌 Entegrasyon Detayları

### Mevcut Implementasyon

#### 1. RealCCEScanner (`src/scanner/RealCCEScanner.ts`)
- Huawei Cloud CCE API'sine bağlanır
- Pod bilgilerini çeker
- Image kullanımını analiz eder

#### 2. HuaweiCloudAuthService (`src/services/huaweiCloudAuthService.ts`)
- Token-based authentication
- AK/SK authentication
- Signature calculation
- Request headers oluşturma

#### 3. Configuration (`src/config/index.ts`)
- Environment variables'dan yapılandırma
- Default değerler
- Validation

---

## 🚀 Kullanım

### 1. Mock Mode (Test İçin)

Mock mode'u aktif etmek için:

```env
MOCK_CCE=true
```

Bu durumda gerçek CCE API'sine bağlanmaz, mock data kullanır.

### 2. Gerçek Entegrasyon

Gerçek Huawei Cloud CCE'ye bağlanmak için:

```env
MOCK_CCE=false
CCE_ENDPOINT=https://cce.cn-north-1.myhuaweicloud.com
CCE_PROJECT_ID=your-project-id
CCE_CLUSTER_ID=your-cluster-id
CCE_TOKEN=your-token
# VEYA
HUAWEI_ACCESS_KEY=your-access-key
HUAWEI_SECRET_KEY=your-secret-key
HUAWEI_REGION=cn-north-1
```

### 3. Scan Başlatma

Backend API'yi kullanarak scan başlatın:

```bash
curl -X POST http://localhost:3000/api/scan/start \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

---

## 📡 API Endpoints

### Scan Endpoints

#### Scan Başlat
```http
POST /api/scan/start
Headers:
  X-API-Key: your-api-key
```

#### Scan Durumu
```http
GET /api/scan/status
Headers:
  X-API-Key: your-api-key
```

### Image Endpoints

#### Tüm Images
```http
GET /api/images
Headers:
  X-API-Key: your-api-key
Query Parameters:
  clusterId?: string
  projectId?: string
```

#### Image Detayı
```http
GET /api/images/:imageName
Headers:
  X-API-Key: your-api-key
```

---

## 🔍 Troubleshooting

### 1. Bağlantı Hatası

**Problem:** CCE API'sine bağlanılamıyor

**Çözüm:**
- `CCE_ENDPOINT` doğru mu kontrol edin
- `CCE_TOKEN` veya `HUAWEI_ACCESS_KEY`/`HUAWEI_SECRET_KEY` geçerli mi kontrol edin
- Network bağlantısını kontrol edin
- Firewall kurallarını kontrol edin

### 2. Authentication Hatası

**Problem:** 401 Unauthorized

**Çözüm:**
- Token veya AK/SK bilgilerini kontrol edin
- Token'ın expire olup olmadığını kontrol edin
- Region bilgisinin doğru olduğundan emin olun

### 3. Cluster Bulunamadı

**Problem:** 404 Not Found

**Çözüm:**
- `CCE_CLUSTER_ID` doğru mu kontrol edin
- `CCE_PROJECT_ID` doğru mu kontrol edin
- Cluster'ın mevcut olduğundan emin olun

---

## 📝 Test Senaryoları

### 1. Mock Mode Test

```bash
# .env dosyasında
MOCK_CCE=true

# Backend'i başlat
npm run dev

# Scan başlat
curl -X POST http://localhost:3000/api/scan/start \
  -H "X-API-Key: your-api-key"
```

### 2. Gerçek Entegrasyon Test

```bash
# .env dosyasında
MOCK_CCE=false
CCE_ENDPOINT=https://cce.cn-north-1.myhuaweicloud.com
CCE_PROJECT_ID=your-project-id
CCE_CLUSTER_ID=your-cluster-id
CCE_TOKEN=your-token

# Backend'i başlat
npm run dev

# Scan başlat
curl -X POST http://localhost:3000/api/scan/start \
  -H "X-API-Key: your-api-key"
```

---

## 🔐 Güvenlik

### Best Practices:

1. **Credentials Güvenliği:**
   - `.env` dosyasını `.gitignore`'a ekleyin
   - Production'da secrets management kullanın
   - AK/SK bilgilerini asla commit etmeyin

2. **API Key Güvenliği:**
   - Güçlü API key'ler kullanın
   - API key'leri düzenli olarak rotate edin
   - Rate limiting uygulayın

3. **Network Güvenliği:**
   - HTTPS kullanın
   - VPN veya private network kullanın
   - Firewall kurallarını sıkılaştırın

---

## 📊 Monitoring

### Logs

Backend loglarını kontrol edin:

```bash
# Backend logları
tail -f logs/app.log

# Error logları
tail -f logs/error.log
```

### Metrics

API endpoint'lerini monitor edin:

- `/api/scan/status` - Scan durumu
- `/api/images` - Image sayısı
- `/api/stats` - İstatistikler

---

## 🎯 Sonraki Adımlar

1. ✅ Huawei Cloud credentials'ları `.env` dosyasına ekle
2. ✅ CCE endpoint ve cluster ID'yi yapılandır
3. ✅ Test bağlantısı yap
4. ✅ Gerçek pod verilerini çek
5. ✅ Production deployment

---

## 📞 Destek

Sorularınız için:
- Dokümantasyon: `README.md`
- API Dokümantasyonu: `http://localhost:3000/api-docs`
- Huawei Cloud Dokümantasyonu: https://support.huaweicloud.com/

---

**Son Güncelleme:** $(date)  
**Versiyon:** 1.0.0

