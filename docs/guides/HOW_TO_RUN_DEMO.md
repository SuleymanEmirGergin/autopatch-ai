# 🚀 Demo Çalıştırma Rehberi - Adım Adım

## 📋 Ön Hazırlık

### 1. MongoDB'nin Çalıştığından Emin Olun

```bash
# MongoDB container'ını kontrol et
docker ps | grep mongo

# Eğer çalışmıyorsa başlat
docker compose up -d mongo
```

### 2. Gerekli Paketleri Yükleyin

```bash
# Ana dizinde
npm install mongodb dotenv

# Eğer ts-node yoksa
npm install -D ts-node
```

---

## 🎬 Demo Verisi Oluşturma

### Adım 1: Demo Verisi Script'ini Çalıştır

```bash
# Ana dizinde (Huawei klasöründe)
cd /home/emir/Masaüstü/Huawei

# Demo verisini oluştur
npm run generate-demo-data
```

**Beklenen Çıktı:**
```
🚀 Demo verisi oluşturuluyor...
✅ MongoDB'ye bağlandı
📝 40 image risk verisi ekleniyor...
✅ 40 image risk verisi eklendi

📊 İstatistikler:
   CRITICAL: 6
   HIGH: 8
   MEDIUM: 12
   LOW: 14
   Toplam: 40

🎉 Demo verisi başarıyla oluşturuldu!
```

### Adım 2: Hata Alırsanız

**Hata: "Cannot find module 'mongodb'"**
```bash
npm install mongodb dotenv
```

**Hata: "Cannot find module 'ts-node'"**
```bash
npm install -D ts-node typescript
```

**Hata: "MongoDB connection failed"**
```bash
# MongoDB'nin çalıştığından emin ol
docker compose up -d mongo

# Veya MongoDB URI'yi kontrol et
echo $MONGODB_URI
# Eğer boşsa, .env dosyasına ekle:
# MONGODB_URI=mongodb://localhost:27017/autopatch
```

**Mevcut Verileri Temizleyip Yeniden Oluştur:**
```bash
CLEAR_EXISTING=true npm run generate-demo-data
```

---

## 🖥️ Backend ve Frontend'i Başlatma

### Adım 1: Backend'i Başlat

**Yeni bir terminal açın:**

```bash
cd /home/emir/Masaüstü/Huawei

# Backend'i başlat
npm run dev
```

**Beklenen Çıktı:**
```
Server running on port 5000
MongoDB connected
Swagger docs available at http://localhost:5000/docs
```

### Adım 2: Frontend'i Başlat

**Başka bir yeni terminal açın:**

```bash
cd /home/emir/Masaüstü/Huawei/frontend

# Frontend'i başlat
npm run dev
```

**Beklenen Çıktı:**
```
> Ready on http://localhost:3000
```

### Adım 3: Tarayıcıda Aç

**http://localhost:3000** adresine gidin.

---

## 🎯 Demo Senaryosunu Çalıştırma

### Senaryo 1: Ana Dashboard (30 saniye)

1. **Tarayıcıda http://localhost:3000 aç**
2. **Ana dashboard'u göster:**
   - 40+ image listesi
   - Risk seviyeleri (CRITICAL, HIGH, MEDIUM, LOW)
   - İstatistikler

**Söylenecekler:**
- "AutoPatch AI, container güvenliği için AI-powered platform"
- "40+ image analiz edildi, 15 CRITICAL risk tespit edildi"

---

### Senaryo 2: AI Dashboard (1 dakika)

1. **"🤖 AI Dashboard" butonuna tıkla**
2. **Model durumunu göster:**
   - 3 AI model (Risk Prediction, Anomaly Detection, Recommendation Scoring)
   - Model durumları (Hazır/Eğitilmemiş)

3. **Bir image seç** (örn: `nginx:latest`)
4. **"AI Analizi Yap" butonuna tıkla**

**Gösterilecekler:**
- Risk Prediction tab'ında: Mevcut risk vs Tahmin edilen risk
- Anomaly Detection tab'ında: Anomali tespiti
- Health Score tab'ında: Genel sağlık skoru

**Söylenecekler:**
- "25+ AI özelliği ile en kapsamlı analiz"
- "TensorFlow.js ile gerçek ML modelleri"

---

### Senaryo 3: Intelligent Recommendations (1 dakika)

1. **AI Dashboard'da "💡 Akıllı Öneriler" tab'ına geç**
2. **Önerileri göster:**
   - AI skoruna göre sıralı
   - Priority, Urgency, Reasoning

**Söylenecekler:**
- "ML-based priority scoring"
- "AI reasoning ile neden bu öneriyi yaptığını açıklıyor"

---

### Senaryo 4: Cost-Benefit Analysis (1 dakika)

1. **"💰 Cost-Benefit" tab'ına geç**
2. **"Cost-Benefit Analizi" butonuna tıkla**

**Gösterilecekler:**
- ROI: 250%
- Payback Period: 15 gün
- Total Cost vs Total Benefit

**Söylenecekler:**
- "ML-based maliyet-fayda analizi"
- "ROI hesaplama ile iş değeri gösterimi"

---

### Senaryo 5: Image Detail - AI Analysis (1 dakika)

1. **Ana sayfaya dön**
2. **Bir image'e tıkla** (örn: `nginx:latest`)
3. **"🤖 AI Analysis" tab'ına geç**

**Gösterilecekler:**
- Risk Prediction
- Anomaly Detection
- Health Score
- Security Posture
- Risk Forecast
- Intelligent Recommendations

**Söylenecekler:**
- "Her image için kapsamlı AI analizi"
- "Predictive risk modeling ile gelecek tahmini"

---

### Senaryo 6: Remediation Scripts (30 saniye)

1. **Ana sayfada "Remediation Script'leri" butonuna tıkla**
2. **Image seç** (örn: `nginx:latest`)
3. **Script'leri göster:**
   - Bash script
   - kubectl script
   - GitHub Actions script

**Söylenecekler:**
- "Otomatik script generation"
- "Dry-run ile güvenli test"

---

## 🔧 Sorun Giderme

### Problem: "npm run generate-demo-data" çalışmıyor

**Çözüm 1: Doğrudan ts-node ile çalıştır**
```bash
npx ts-node scripts/generate-demo-data.ts
```

**Çözüm 2: TypeScript derle**
```bash
npm run build
node dist/scripts/generate-demo-data.js
```

### Problem: Backend başlamıyor

**Çözüm:**
```bash
# Port 5000'in kullanıldığını kontrol et
lsof -i :5000

# Veya farklı port kullan
PORT=5001 npm run dev
```

### Problem: Frontend başlamıyor

**Çözüm:**
```bash
# Port 3000'in kullanıldığını kontrol et
lsof -i :3000

# Veya farklı port kullan
PORT=3001 npm run dev
```

### Problem: MongoDB bağlantı hatası

**Çözüm:**
```bash
# MongoDB container'ını kontrol et
docker ps | grep mongo

# Eğer yoksa başlat
docker compose up -d mongo

# MongoDB URI'yi kontrol et
cat .env | grep MONGODB_URI
```

### Problem: Demo verisi görünmüyor

**Çözüm:**
```bash
# Veritabanında kontrol et
docker exec -it <mongo-container-id> mongosh
use autopatch
db.imagerisks.countDocuments()

# Eğer 0 ise, demo verisini yeniden oluştur
CLEAR_EXISTING=true npm run generate-demo-data
```

---

## 📊 Demo Öncesi Checklist

- [ ] MongoDB çalışıyor
- [ ] Demo verisi oluşturuldu (`npm run generate-demo-data`)
- [ ] Backend çalışıyor (`npm run dev`)
- [ ] Frontend çalışıyor (`cd frontend && npm run dev`)
- [ ] Tarayıcıda http://localhost:3000 açılıyor
- [ ] Image'ler görünüyor (40+ image)
- [ ] AI Dashboard açılıyor
- [ ] AI analizi çalışıyor

---

## 🎬 Hızlı Demo Komutları (Kopyala-Yapıştır)

```bash
# Terminal 1: Demo verisi oluştur
cd /home/emir/Masaüstü/Huawei
npm run generate-demo-data

# Terminal 2: Backend başlat
cd /home/emir/Masaüstü/Huawei
npm run dev

# Terminal 3: Frontend başlat
cd /home/emir/Masaüstü/Huawei/frontend
npm run dev

# Tarayıcı: http://localhost:3000
```

---

## 💡 İpuçları

1. **Hız:** Her adımı hızlıca geç, detaya girmeyin
2. **Vurgu:** "25+ AI özelliği" vurgusunu yapın
3. **Backup:** Ekran görüntüleri al (backup için)
4. **Prova:** Demo senaryosunu en az 2-3 kez prova edin
5. **Sorular:** `scripts/demo-scenario.md` dosyasındaki sorulara hazırlık bölümünü okuyun

---

## 🆘 Yardım

Eğer hala sorun yaşıyorsanız:

1. **Hata mesajını kontrol edin**
2. **Log'lara bakın** (Backend ve Frontend console'ları)
3. **MongoDB durumunu kontrol edin**
4. **Port'ların kullanılabilir olduğundan emin olun**

---

**Başarılar! 🏆**

