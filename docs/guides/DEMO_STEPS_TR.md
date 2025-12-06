# 🎬 Demo Adımları - Türkçe Rehber

## 🚀 Hızlı Başlangıç (3 Adım)

### Adım 1: Demo Verisini Oluştur

**Terminal'de şu komutu çalıştır:**

```bash
cd /home/emir/Masaüstü/Huawei
npm run generate-demo-data
```

**Veya otomatik script:**
```bash
./QUICK_START_DEMO.sh
```

**Beklenen çıktı:**
```
🚀 Demo verisi oluşturuluyor...
✅ MongoDB'ye bağlandı
📝 40 image risk verisi ekleniyor...
✅ 40 image risk verisi eklendi
🎉 Demo verisi başarıyla oluşturuldu!
```

---

### Adım 2: Backend'i Başlat

**Yeni bir terminal penceresi aç ve:**

```bash
cd /home/emir/Masaüstü/Huawei
npm run dev
```

**Beklenen çıktı:**
```
Server running on port 5000
MongoDB connected
```

**Bu terminali açık bırak!**

---

### Adım 3: Frontend'i Başlat

**Başka bir yeni terminal penceresi aç ve:**

```bash
cd /home/emir/Masaüstü/Huawei/frontend
npm run dev
```

**Beklenen çıktı:**
```
> Ready on http://localhost:3000
```

**Bu terminali de açık bırak!**

---

### Adım 4: Tarayıcıda Aç

**Tarayıcıda şu adresi aç:**
```
http://localhost:3000
```

**Göreceğiniz:**
- Ana dashboard
- 40+ image listesi
- Risk seviyeleri
- İstatistikler

---

## 🎯 Demo Senaryosu (5 Dakika)

### 1. Ana Dashboard (30 saniye)

**Göster:**
- Image listesi
- Risk seviyeleri
- İstatistikler

**Söyle:**
- "AutoPatch AI, container güvenliği için AI-powered platform"
- "40+ image analiz edildi"

---

### 2. AI Dashboard (1 dakika)

**Yap:**
1. "🤖 AI Dashboard" butonuna tıkla
2. Model durumunu göster
3. Bir image seç (örn: `nginx:latest`)
4. "AI Analizi Yap" butonuna tıkla

**Göster:**
- Risk Prediction
- Anomaly Detection
- Health Score

**Söyle:**
- "25+ AI özelliği ile en kapsamlı analiz"
- "TensorFlow.js ile gerçek ML"

---

### 3. Intelligent Recommendations (1 dakika)

**Yap:**
1. "💡 Akıllı Öneriler" tab'ına geç
2. Önerileri göster

**Söyle:**
- "ML-based priority scoring"
- "AI reasoning ile açıklama"

---

### 4. Cost-Benefit Analysis (1 dakika)

**Yap:**
1. "💰 Cost-Benefit" tab'ına geç
2. "Cost-Benefit Analizi" butonuna tıkla

**Göster:**
- ROI: 250%
- Payback Period: 15 gün

**Söyle:**
- "ML-based maliyet-fayda analizi"

---

### 5. Image Detail - AI Analysis (1 dakika)

**Yap:**
1. Ana sayfaya dön
2. Bir image'e tıkla
3. "🤖 AI Analysis" tab'ına geç

**Göster:**
- Risk Prediction
- Health Score
- Security Posture
- Risk Forecast

---

## 🔧 Sorun Giderme

### "npm run generate-demo-data" çalışmıyor

**Çözüm:**
```bash
# Doğrudan ts-node ile çalıştır
npx ts-node scripts/generate-demo-data.ts
```

### Backend başlamıyor

**Çözüm:**
```bash
# Port kontrolü
lsof -i :5000

# Farklı port
PORT=5001 npm run dev
```

### Frontend başlamıyor

**Çözüm:**
```bash
# Port kontrolü
lsof -i :3000

# Farklı port
PORT=3001 npm run dev
```

### MongoDB hatası

**Çözüm:**
```bash
# MongoDB'yi başlat
docker compose up -d mongo

# 5 saniye bekle
sleep 5

# Tekrar dene
npm run generate-demo-data
```

---

## 📋 Demo Öncesi Checklist

- [ ] MongoDB çalışıyor (`docker ps | grep mongo`)
- [ ] Demo verisi oluşturuldu (`npm run generate-demo-data`)
- [ ] Backend çalışıyor (`npm run dev` - Terminal 1)
- [ ] Frontend çalışıyor (`cd frontend && npm run dev` - Terminal 2)
- [ ] Tarayıcıda http://localhost:3000 açılıyor
- [ ] Image'ler görünüyor (40+ image)

---

## 💡 İpuçları

1. **3 Terminal Gerekli:**
   - Terminal 1: Backend (`npm run dev`)
   - Terminal 2: Frontend (`cd frontend && npm run dev`)
   - Terminal 3: Komutlar için

2. **Hız:** Her adımı hızlıca geç, detaya girmeyin

3. **Vurgu:** "25+ AI özelliği" vurgusunu yapın

4. **Backup:** Ekran görüntüleri al

---

## 🆘 Yardım

**Detaylı rehber:** `HOW_TO_RUN_DEMO.md`

**Demo senaryosu:** `scripts/demo-scenario.md`

---

**Başarılar! 🏆**

