# 🚀 Hackathon Demo Rehberi

Bu rehber, hackathon yarışmasında projeyi demo etmek için hazırlanmıştır.

## ⚡ Hızlı Başlangıç (5 Dakika)

### 1. Projeyi Başlat

```bash
# MongoDB ve Nginx'i başlat
docker compose up -d mongo nginx

# Backend'i başlat (yeni terminal)
npm install
PORT=5000 npm run dev

# Frontend'i başlat (yeni terminal)
cd frontend
npm install
PORT=3002 npm run dev
```

### 2. Tarayıcıda Aç

**http://localhost:3000** adresine gidin.

### 3. İlk Taramayı Başlat

1. Ana sayfada **"Scan Başlat"** butonuna tıklayın
2. Mock modda çalıştığı için gerçek Huawei Cloud bağlantısı gerekmez
3. Tarama tamamlandığında otomatik olarak sonuçlar görünecek

## 🎯 Demo Senaryosu (10 Dakika)

### Senaryo 1: Risk Tespiti ve Analizi (3 dk)

1. **Ana Dashboard'u Göster**
   - Risk skorlarına göre sıralanmış image'ler
   - Filtreleme özellikleri (risk seviyesi, namespace, arama)
   - İstatistikler (toplam image, HIGH/CRITICAL sayısı)

2. **Image Detay Sayfası**
   - Bir HIGH veya CRITICAL risk'li image'e tıklayın
   - Risk faktörlerini gösterin (latest tag, root user, vb.)
   - Pod kullanımını gösterin
   - Scan geçmişini gösterin

### Senaryo 2: Otomatik Öneriler ve Remediation (3 dk)

1. **Risk Önerileri Sayfası** (`/admin/recommendations`)
   - Otomatik risk azaltma önerilerini gösterin
   - Update önerilerini gösterin
   - Patch önerilerini gösterin

2. **Remediation Script'leri** (`/admin/remediation-scripts`)
   - Oluşturulan script'leri gösterin
   - Script preview'ını gösterin
   - Copy/Download özelliklerini gösterin

### Senaryo 3: Otomatik Aksiyonlar ve Bulk Operations (2 dk)

1. **Otomatik Aksiyonlar** (`/admin/auto-actions`)
   - Policy tanımlarını gösterin
   - Risk threshold'larına göre otomatik tetikleme

2. **Bulk Operations** (`/admin/bulk-operations`)
   - Çoklu image seçimi
   - Toplu remediation uygulaması

### Senaryo 4: Raporlama ve Compliance (2 dk)

1. **Raporlar** (`/admin/reports`)
   - PDF/HTML/Markdown format seçenekleri
   - Executive Summary raporu
   - Compliance raporu

2. **Compliance Dashboard** (`/compliance`)
   - Compliance durumu
   - Trend analizi

## 🎨 Öne Çıkan Özellikler

### Teknik Özellikler
- ✅ **Huawei Cloud CCE Entegrasyonu**: Gerçek Kubernetes cluster'larından pod bilgisi çekme
- ✅ **Deterministik Risk Skorlama**: 8+ risk faktörü ile kapsamlı analiz
- ✅ **Otomatik Remediation**: Bash/kubectl/CI-CD script'leri
- ✅ **Real-time Updates**: WebSocket ile canlı güncellemeler
- ✅ **Multi-format Raporlama**: PDF, HTML, Markdown, Excel

### İş Değeri
- ✅ **Proaktif Güvenlik**: Risk'leri tespit etmeden önce önleme
- ✅ **Otomasyon**: Manuel işlemleri azaltma
- ✅ **Compliance**: Güvenlik standartlarına uyum
- ✅ **Görselleştirme**: Kapsamlı dashboard ve grafikler

## 📊 Demo İçin Hazır Veriler

Mock modda (`MOCK_CCE=true`) çalıştığında otomatik olarak şu senaryolar oluşturulur:

- **Düşük Risk**: `registry.example.com/frontend-app:latest`
- **Orta Risk**: `registry.example.com/backend-api:2024-01-01`
- **Yüksek Risk**: `ubuntu:20.04` (eski base image)
- **Kritik Risk**: `registry.example.com/critical-api-root-debug:2023-01-01` (root user, debug tag, prod namespace)

## 🛠️ Sorun Giderme

### Backend başlamıyor
```bash
# MongoDB'nin çalıştığından emin olun
docker ps | grep mongo

# Port'un kullanılmadığından emin olun
lsof -i :5000
```

### Frontend başlamıyor
```bash
# Node modules'ları temizleyin
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Veri görünmüyor
1. `/scan` endpoint'ine POST isteği gönderin (API key gerekebilir)
2. Tarama tamamlanana kadar bekleyin (genellikle 5-10 saniye)
3. Sayfayı yenileyin

## 💡 Jüri İçin Önemli Noktalar

1. **Gerçek Dünya Uygulanabilirliği**: Huawei Cloud CCE ile gerçek entegrasyon
2. **Kapsamlı Özellik Seti**: Sadece tespit değil, otomatik çözüm önerileri
3. **Kullanıcı Dostu Arayüz**: Modern, responsive, karanlık mod desteği
4. **Ölçeklenebilir Mimari**: Multi-cluster desteği, bulk operations
5. **Production Ready**: Error handling, logging, test coverage

## 🎬 Sunum İçin Öneriler

1. **Giriş (1 dk)**: Problem tanımı - Container güvenliği
2. **Demo (7 dk)**: Yukarıdaki senaryoları takip edin
3. **Teknik Detaylar (1 dk)**: Mimari, teknoloji stack
4. **Sonuç (1 dk)**: İş değeri, gelecek planları

## 📞 Destek

Demo sırasında sorun yaşarsanız:
- Health check: `http://localhost:3000/health`
- Swagger docs: `http://localhost:3000/docs`
- Backend logs: Terminal'de görünecek
- Frontend logs: Browser console (F12)

