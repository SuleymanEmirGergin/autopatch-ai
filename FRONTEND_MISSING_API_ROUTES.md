# Frontend'de Eksik Olan API Route'ları

## Backend'de Olup Frontend'de API Route OLMAYAN Endpoint'ler

### 1. Notifications API Routes
**Backend Endpoints:**
- `GET /api/notifications` - Aktif bildirimler
- `POST /api/notifications/:id/acknowledge` - Bildirimi onaylama
- `POST /api/notifications/:id/dismiss` - Bildirimi reddetme

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/alerts` sayfası var ama API route yok

---

### 2. Anomalies API Routes
**Backend Endpoints:**
- `GET /api/anomalies` - Çözülmemiş anomaliler
- `GET /api/anomalies/image/:imageName` - Image anomalileri
- `POST /api/anomalies/:id/resolve` - Anomali çözme

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/anomalies` sayfası var ama API route yok

---

### 3. Recommendations API Routes
**Backend Endpoints:**
- `GET /api/recommendations` - Bulk öneriler
- `GET /api/recommendations/priority` - Öncelikli öneriler
- `GET /api/recommendations/patches` - Patch önerileri
- `GET /api/images/:imageName/recommendations` - Image önerileri
- `GET /api/images/:imageName/patch-recommendations` - Image patch önerileri

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/recommendations` sayfası var ama API route yok

---

### 4. Remediation Scripts API Routes
**Backend Endpoints:**
- `GET /api/images/:imageName/remediation-scripts` - Script listesi
- `POST /api/images/:imageName/remediation-scripts/:scriptId/execute` - Script çalıştırma
- `POST /api/remediation/batch-execute` - Toplu script çalıştırma
- `POST /api/remediation/batch-generate-execute` - Toplu script oluştur ve çalıştır

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/remediation-scripts` sayfası var ama API route yok

---

### 5. Auto Actions API Routes
**Backend Endpoints:**
- `GET /api/auto-actions/policies` - Policy listesi
- `POST /api/auto-actions/policies` - Policy oluşturma
- `PUT /api/auto-actions/policies/:id` - Policy güncelleme
- `DELETE /api/auto-actions/policies/:id` - Policy silme
- `POST /api/auto-actions/policies/:id/execute` - Policy çalıştırma

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/auto-actions` sayfası var ama API route yok

---

### 6. SBOM API Routes
**Backend Endpoints:**
- `GET /api/sbom/image/:imageName` - Image SBOM'u
- `POST /api/sbom/image/:imageName/rescan` - SBOM yeniden tarama
- `GET /api/sbom/cves` - Tüm CVE'ler
- `GET /api/sbom/package/:packageName` - Paket bilgisi

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/sbom` sayfası var ama API route yok

---

### 7. Widgets API Routes
**Backend Endpoints:**
- `GET /api/widgets` - Widget listesi
- `GET /api/widgets/:id/data` - Widget verisi
- `POST /api/widgets` - Widget oluşturma
- `PUT /api/widgets/:id` - Widget güncelleme
- `DELETE /api/widgets/:id` - Widget silme
- `POST /api/widgets/positions` - Widget pozisyonları

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/widgets` sayfası var ama API route yok

---

### 8. Reports API Routes
**Backend Endpoints:**
- `GET /api/reports/risk-summary` - Risk özet raporu
- `GET /api/reports/executive-summary` - Executive özet
- `GET /api/reports/compliance` - Compliance raporu
- `GET /api/reports/detailed` - Detaylı rapor
- `GET /api/reports/compliance/export/excel` - Excel export
- `GET /api/reports/risk-summary/html` - HTML format
- `GET /api/reports/executive-summary/html` - HTML format
- `GET /api/reports/compliance/html` - HTML format
- `GET /api/reports/detailed/html` - HTML format
- `GET /api/reports/risk-summary/markdown` - Markdown format
- `GET /api/reports/executive-summary/markdown` - Markdown format
- `GET /api/reports/compliance/markdown` - Markdown format
- `GET /api/reports/detailed/markdown` - Markdown format

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/reports` sayfası var ama API route yok

---

### 9. Scheduled Reports API Routes
**Backend Endpoints:**
- `GET /api/scheduled-reports` - Zamanlanmış raporlar
- `GET /api/scheduled-reports/:id` - Rapor detayı
- `POST /api/scheduled-reports` - Rapor oluşturma
- `PUT /api/scheduled-reports/:id` - Rapor güncelleme
- `DELETE /api/scheduled-reports/:id` - Rapor silme
- `POST /api/scheduled-reports/:id/run-now` - Hemen çalıştır
- `POST /api/scheduled-reports/:id/toggle` - Aktif/Pasif

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/scheduled-reports` sayfası var ama API route yok

---

### 10. Report Templates API Routes
**Backend Endpoints:**
- `GET /api/report-templates` - Şablon listesi
- `GET /api/report-templates/categories` - Kategoriler
- `GET /api/report-templates/tags` - Tag'ler
- `GET /api/report-templates/default` - Varsayılan şablon
- `GET /api/report-templates/:id` - Şablon detayı
- `GET /api/report-templates/:id/preview` - Şablon önizleme
- `POST /api/report-templates` - Şablon oluşturma
- `PUT /api/report-templates/:id` - Şablon güncelleme
- `POST /api/report-templates/:id/upload-logo` - Logo yükleme
- `POST /api/report-templates/:id/copy` - Şablon kopyalama
- `GET /api/report-templates/:id/export` - Şablon export
- `POST /api/report-templates/import` - Şablon import
- `GET /api/report-templates/:id/versions` - Versiyonlar
- `GET /api/report-templates/:id/versions/:version` - Versiyon detayı
- `POST /api/report-templates/:id/versions/:version/restore` - Versiyon geri yükleme
- `DELETE /api/report-templates/:id` - Şablon silme
- `POST /api/report-templates/:id/set-default` - Varsayılan yap
- `POST /api/report-templates/initialize` - Şablonları başlat

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/report-templates` sayfası var ama API route yok

---

### 11. Report History API Routes
**Backend Endpoints:**
- `GET /api/report-history` - Rapor geçmişi
- `GET /api/report-history/statistics` - İstatistikler
- `GET /api/report-history/:id` - Rapor detayı
- `POST /api/report-history` - Rapor kaydetme
- `DELETE /api/report-history/:id` - Rapor silme

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/report-history` sayfası var ama API route yok

---

### 12. AI API Routes
**Backend Endpoints:**
- `POST /api/ai/train` - Model eğitimi
- `GET /api/ai/status` - Model durumu
- `GET /api/ai/predict/:imageName` - Risk tahmini
- `POST /api/ai/predict/bulk` - Toplu tahmin
- `GET /api/ai/anomaly/:imageName` - Anomali tespiti
- `GET /api/ai/anomalies` - Tüm anomaliler
- `GET /api/ai/recommendations/:imageName` - AI önerileri
- `GET /api/ai/nlp/:imageName` - CVE NLP analizi
- `GET /api/ai/similarity/clusters` - Benzer image cluster'ları
- `GET /api/ai/similarity/:imageName` - Benzer image'ler
- `GET /api/ai/maintenance/schedule` - Bakım planı
- `GET /api/ai/correlation` - Korelasyon analizi
- `POST /api/ai/remediation/predict-success` - Remediation başarı tahmini
- `GET /api/ai/health/:imageName` - Health score
- `POST /api/ai/alerts/prioritize` - Alert önceliklendirme
- `GET /api/ai/behavior/:imageName` - Davranış analizi
- `GET /api/ai/behavior/cluster/:clusterId` - Cluster davranış analizi
- `POST /api/ai/remediation/decision` - Remediation kararı
- `GET /api/ai/propagation/:imageName` - Risk yayılımı
- `POST /api/ai/cost-benefit` - Maliyet-fayda analizi
- `GET /api/ai/security-posture/:imageName` - Güvenlik duruşu
- `GET /api/ai/security-posture/cluster/:clusterId` - Cluster güvenlik duruşu
- `GET /api/ai/root-cause/:anomalyId` - Kök neden analizi
- `GET /api/ai/forecast/:imageName` - Risk tahmini
- `GET /api/ai/forecast/cluster/:clusterId` - Cluster risk tahmini
- `GET /api/ai/optimization/:imageName` - Workload optimizasyonu
- `GET /api/ai/optimization/cluster/:clusterId` - Cluster optimizasyonu
- `GET /api/ai/zero-day/:imageName` - Zero-day tespiti
- `GET /api/ai/threats/:imageName` - Tehdit analizi
- `POST /api/ai/patches/prioritize` - Patch önceliklendirme
- `POST /api/ai/generate/script` - Script oluşturma (Generative AI)
- `POST /api/ai/generate/report` - Rapor oluşturma (Generative AI)
- `POST /api/ai/generate/cve-description` - CVE açıklama oluşturma

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/ai-dashboard` sayfası var ama API route yok

---

### 13. Dependency Graph API Routes
**Backend Endpoints:**
- `GET /api/dependency-graph` - Bağımlılık grafiği
- `GET /api/dependency-graph/image/:imageName` - Image bağımlılıkları

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/dependency-graph` sayfası var ama API route yok

---

### 14. Image Comparison API Routes
**Backend Endpoints:**
- `GET /api/images/compare` - Image karşılaştırma
- `GET /api/images/:imageName/history/analyze` - Geçmiş analizi

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/image-comparison` sayfası var ama API route yok

---

### 15. Scorecard API Routes
**Backend Endpoints:**
- `GET /api/scorecard/:imageName` - Image scorecard

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/scorecard` sayfası var ama API route yok

---

### 16. Runbooks API Routes
**Backend Endpoints:**
- `GET /api/runbooks` - Tüm runbook mapping'leri
- `GET /api/runbooks/:riskFactor` - Risk faktörü runbook'u

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/runbooks` sayfası var ama API route yok

---

### 17. Clusters API Routes
**Backend Endpoints:**
- `GET /api/clusters` - Cluster listesi
- `GET /api/clusters/:clusterId/stats` - Cluster istatistikleri

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/clusters` sayfası var ama API route yok

---

### 18. Compliance API Routes
**Backend Endpoints:**
- `GET /api/compliance` - Compliance listesi
- `GET /api/compliance/:standard` - Standart detayı
- `POST /api/compliance/:standard/assess` - Compliance değerlendirmesi

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/compliance-new` sayfası var ama API route yok

---

### 19. IoT API Routes
**Backend Endpoints:**
- `POST /api/iot/scan` - IoT cihaz tarama
- `POST /api/iot/scan/bulk` - Toplu IoT tarama
- `GET /api/iot/images` - IoT image'leri
- `GET /api/iot/statistics` - IoT istatistikleri

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/iot` sayfası var ama API route yok

---

### 20. Computer Vision API Routes
**Backend Endpoints:**
- `GET /api/cv/analyze/:imageName` - Image analizi
- `GET /api/cv/features/:imageName` - Feature extraction

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/computer-vision` sayfası var ama API route yok

---

### 21. Stats Trends API Routes
**Backend Endpoints:**
- `GET /api/stats/trends` - İstatistik trendleri

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ⚠️ Overview sayfasında kullanılıyor olabilir ama API route yok

---

### 22. Image Export API Routes (CSV/Excel/JSON)
**Backend Endpoints:**
- `GET /api/images/export` - CSV/Excel/JSON export (PDF hariç)

**Durum:** ⚠️ Sadece PDF export var (`/api/images/export/pdf.ts`)
**Sayfa:** ⚠️ Images sayfasında export butonları var ama CSV/Excel/JSON route'ları yok

---

### 23. Repositories API Routes
**Backend Endpoints:**
- `GET /api/repositories` - Repository listesi

**Durum:** ❌ Frontend'de API route yok
**Sayfa:** ✅ `/repositories` sayfası var ama API route yok

---

## Özet

**Toplam Eksik API Route Kategorisi:** 23 kategori
**Toplam Eksik Endpoint Sayısı:** ~100+ endpoint

**En Kritik Eksikler:**
1. Notifications API Routes
2. Anomalies API Routes
3. Recommendations API Routes
4. Remediation Scripts API Routes
5. Auto Actions API Routes
6. SBOM API Routes
7. Widgets API Routes
8. Reports API Routes (tüm formatlar)
9. Scheduled Reports API Routes
10. Report Templates API Routes
11. Report History API Routes
12. AI API Routes (30+ endpoint)
13. Dependency Graph API Routes
14. Image Comparison API Routes
15. Scorecard API Routes
16. Runbooks API Routes
17. Clusters API Routes
18. Compliance API Routes
19. IoT API Routes
20. Computer Vision API Routes
21. Stats Trends API Routes
22. Image Export API Routes (CSV/Excel/JSON)
23. Repositories API Routes

**Not:** Tüm sayfalar oluşturuldu ama backend API'lerine bağlanmak için Next.js API route'ları (proxy'ler) eksik. Bu route'lar frontend sayfalarının backend'e istek yapabilmesi için gerekli.
