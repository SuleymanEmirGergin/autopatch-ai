# 📜 Scripts

Bu dizinde hackathon demo'su için yardımcı script'ler bulunur.

## 📊 Demo Verisi Oluşturma

### `generate-demo-data.ts`

Hackathon demo'su için gerçekçi image risk verileri oluşturur.

**Kullanım:**
```bash
# Temel kullanım
npm run generate-demo-data

# Mevcut demo verilerini temizleyip yeniden oluştur
CLEAR_EXISTING=true npm run generate-demo-data

# Scan run da oluştur
CREATE_SCAN_RUN=true npm run generate-demo-data
```

**Oluşturulan Veriler:**
- 40+ gerçekçi image risk verisi
- Farklı risk seviyeleri (CRITICAL, HIGH, MEDIUM, LOW)
- Gerçekçi pod dağılımları
- Production ve non-production namespace'ler
- Farklı cluster ID'ler

**İstatistikler:**
- CRITICAL: ~15% (6 image)
- HIGH: ~20% (8 image)
- MEDIUM: ~30% (12 image)
- LOW: ~35% (14 image)

---

## 🎬 Demo Senaryosu

### `demo-scenario.md`

5 dakikalık hackathon demo akışı ve senaryosu.

**İçerik:**
- Demo akışı (adım adım)
- Gösterilecek özellikler
- Söylenecekler
- Sorulara hazırlık
- Demo checklist

**Kullanım:**
Demo öncesi bu dosyayı okuyun ve prova yapın.

---

## 📋 Diğer Script'ler

### `quick-start.sh`

Otomatik kurulum script'i (MongoDB, Nginx, Backend, Frontend).

**Kullanım:**
```bash
chmod +x quick-start.sh
./quick-start.sh
```

---

## 💡 İpuçları

1. **Demo Verisi:** Demo öncesi mutlaka demo verisini oluşturun
2. **Prova:** Demo senaryosunu en az 2-3 kez prova edin
3. **Backup:** Video demo hazırlayın (opsiyonel ama önerilir)
4. **Hız:** Her adımı hızlıca geçin, detaya girmeyin
5. **Vurgu:** "25+ AI özelliği" vurgusunu yapın

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Demo verisini oluştur
npm run generate-demo-data

# 2. Backend'i başlat
cd backend && npm run dev

# 3. Frontend'i başlat (yeni terminal)
cd frontend && npm run dev

# 4. Tarayıcıda aç
# http://localhost:3000
```

---

**Başarılar! 🏆**

