# Frontend'de Eksik Olan Backend Özellikleri

## Yeni Tasarımda Mevcut Sayfalar
1. ✅ Overview (`/overview`)
2. ✅ Clusters & Pods (`/clusters`)
3. ✅ Images & Risk (`/images-risk`)
4. ✅ Scan Runs (`/scan-runs`)
5. ✅ Compliance (`/compliance-new`)
6. ✅ Alerts & Notifications (`/alerts`)
7. ✅ Settings (`/settings-new`)

---

## Backend'de Olup Frontend'de OLMAYAN Özellikler

### 1. Image Detay Sayfası
**Backend Endpoints:**
- `GET /api/images/:imageName` - Image detayı
- `GET /api/images/:imageName/breakdown` - Risk breakdown
- `GET /api/images/:imageName/tags` - Image tag'leri
- `GET /api/images/:imageName/history` - Scan geçmişi
- `GET /api/images/:imageName/recommendations` - Öneriler
- `GET /api/images/:imageName/patch-recommendations` - Patch önerileri
- `GET /api/images/:imageName/remediation-scripts` - Remediation script'leri
- `POST /api/images/:imageName/remediation-scripts/:scriptId/execute` - Script çalıştırma

**Durum:** ❌ Yeni tasarımda yok (eski `images/[imageName].tsx` var ama yeni tasarıma uygun değil)

---

### 2. Recommendations (Risk Önerileri)
**Backend Endpoints:**
- `GET /api/recommendations` - Bulk öneriler
- `GET /api/recommendations/priority` - Öncelikli öneriler
- `GET /api/recommendations/patches` - Patch önerileri
- `GET /api/images/:imageName/update-recommendations` - Güncelleme önerileri
- `GET /api/recommendations/updates` - Güncelleme önerileri listesi

**Durum:** ❌ Yeni tasarımda yok (eski `admin/recommendations.tsx` var)

---

### 3. Remediation Scripts
**Backend Endpoints:**
- `GET /api/images/:imageName/remediation-scripts` - Script listesi
- `POST /api/images/:imageName/remediation-scripts/:scriptId/execute` - Script çalıştırma
- `POST /api/remediation/batch-execute` - Toplu script çalıştırma
- `POST /api/remediation/batch-generate-execute` - Toplu script oluştur ve çalıştır

**Durum:** ❌ Yeni tasarımda yok (eski `admin/remediation-scripts.tsx` var)

---

### 4. Auto Actions (Otomatik Aksiyonlar)
**Backend Endpoints:**
- `GET /api/auto-actions/policies` - Policy listesi
- `POST /api/auto-actions/policies` - Policy oluşturma
- `PUT /api/auto-actions/policies/:id` - Policy güncelleme
- `DELETE /api/auto-actions/policies/:id` - Policy silme
- `POST /api/auto-actions/policies/:id/execute` - Policy çalıştırma

**Durum:** ❌ Yeni tasarımda yok (eski `admin/auto-actions.tsx` var)

---

### 5. Risk Budgets
**Backend Endpoints:**
- `GET /api/risk-budgets` - Budget listesi
- `GET /api/risk-budgets/:id` - Budget detayı
- `POST /api/risk-budgets` - Budget oluşturma
- `PUT /api/risk-budgets/:id` - Budget güncelleme
- `DELETE /api/risk-budgets/:id` - Budget silme
- `POST /api/risk-budgets/:id/check` - Budget kontrolü
- `POST /api/risk-budgets/check-all` - Tüm budget'ları kontrol et

**Durum:** ❌ Yeni tasarımda yok (eski `admin/risk-budgets.tsx` var)

---

### 6. SBOM (Software Bill of Materials)
**Backend Endpoints:**
- `GET /api/sbom/image/:imageName` - Image SBOM'u
- `POST /api/sbom/image/:imageName/rescan` - SBOM yeniden tarama
- `GET /api/sbom/cves` - Tüm CVE'ler
- `GET /api/sbom/package/:packageName` - Paket bilgisi

**Durum:** ❌ Yeni tasarımda yok

---

### 7. Anomalies (Anomaliler)
**Backend Endpoints:**
- `GET /api/anomalies` - Çözülmemiş anomaliler
- `GET /api/anomalies/image/:imageName` - Image anomalileri
- `POST /api/anomalies/:id/resolve` - Anomali çözme

**Durum:** ❌ Yeni tasarımda yok (eski `admin/anomalies.tsx` var)

---

### 8. Notifications (Bildirimler - Alerts'ten farklı)
**Backend Endpoints:**
- `GET /api/notifications` - Aktif bildirimler
- `POST /api/notifications/:id/acknowledge` - Bildirimi onaylama
- `POST /api/notifications/:id/dismiss` - Bildirimi reddetme

**Durum:** ⚠️ Alerts sayfasında var ama ayrı bir sayfa yok

---

### 9. Webhooks
**Backend Endpoints:**
- `GET /api/webhooks` - Webhook listesi
- `GET /api/webhooks/:id` - Webhook detayı
- `POST /api/webhooks` - Webhook oluşturma
- `PUT /api/webhooks/:id` - Webhook güncelleme
- `DELETE /api/webhooks/:id` - Webhook silme
- `POST /api/webhooks/:id/test` - Webhook test

**Durum:** ❌ Yeni tasarımda yok (eski `admin/webhooks.tsx` var)

---

### 10. Widgets
**Backend Endpoints:**
- `GET /api/widgets` - Widget listesi
- `GET /api/widgets/:id/data` - Widget verisi
- `POST /api/widgets` - Widget oluşturma
- `PUT /api/widgets/:id` - Widget güncelleme
- `DELETE /api/widgets/:id` - Widget silme
- `POST /api/widgets/positions` - Widget pozisyonları

**Durum:** ❌ Yeni tasarımda yok (eski `admin/widgets.tsx` var)

---

### 11. Image Comparison (Image Karşılaştırma)
**Backend Endpoints:**
- `GET /api/images/compare` - Image karşılaştırma
- `GET /api/images/:imageName/history/analyze` - Geçmiş analizi

**Durum:** ❌ Yeni tasarımda yok (eski `compare.tsx` var)

---

### 12. Reports (Raporlar)
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

**Durum:** ❌ Yeni tasarımda yok (eski `admin/reports.tsx` var)

---

### 13. Scheduled Reports
**Backend Endpoints:**
- `GET /api/scheduled-reports` - Zamanlanmış raporlar
- `GET /api/scheduled-reports/:id` - Rapor detayı
- `POST /api/scheduled-reports` - Rapor oluşturma
- `PUT /api/scheduled-reports/:id` - Rapor güncelleme
- `DELETE /api/scheduled-reports/:id` - Rapor silme
- `POST /api/scheduled-reports/:id/run-now` - Hemen çalıştır
- `POST /api/scheduled-reports/:id/toggle` - Aktif/Pasif

**Durum:** ❌ Yeni tasarımda yok (eski `admin/scheduled-reports.tsx` var)

---

### 14. Report Templates
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

**Durum:** ❌ Yeni tasarımda yok (eski `admin/report-templates.tsx` var)

---

### 15. Report History
**Backend Endpoints:**
- `GET /api/report-history` - Rapor geçmişi
- `GET /api/report-history/statistics` - İstatistikler
- `GET /api/report-history/:id` - Rapor detayı
- `POST /api/report-history` - Rapor kaydetme
- `DELETE /api/report-history/:id` - Rapor silme

**Durum:** ❌ Yeni tasarımda yok (eski `admin/report-history.tsx` var)

---

### 16. Report Comparison
**Backend Endpoints:**
- (Report history üzerinden karşılaştırma yapılıyor)

**Durum:** ❌ Yeni tasarımda yok (eski `admin/report-comparison.tsx` var)

---

### 17. AI Dashboard & AI Features
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

**Durum:** ❌ Yeni tasarımda yok (eski `admin/ai-dashboard.tsx` var)

---

### 18. Dependency Graph
**Backend Endpoints:**
- `GET /api/dependency-graph` - Bağımlılık grafiği
- `GET /api/dependency-graph/image/:imageName` - Image bağımlılıkları

**Durum:** ❌ Yeni tasarımda yok (eski `dependency-graph.tsx` var)

---

### 19. Repositories
**Backend Endpoints:**
- `GET /api/repositories` - Repository listesi

**Durum:** ❌ Yeni tasarımda yok (eski `repositories/index.tsx` var)

---

### 20. Scorecard
**Backend Endpoints:**
- `GET /api/scorecard/:imageName` - Image scorecard

**Durum:** ❌ Yeni tasarımda yok

---

### 21. Runbooks
**Backend Endpoints:**
- `GET /api/runbooks` - Tüm runbook mapping'leri
- `GET /api/runbooks/:riskFactor` - Risk faktörü runbook'u

**Durum:** ❌ Yeni tasarımda yok

---

### 22. IoT Features
**Backend Endpoints:**
- `POST /api/iot/scan` - IoT cihaz tarama
- `POST /api/iot/scan/bulk` - Toplu IoT tarama
- `GET /api/iot/images` - IoT image'leri
- `GET /api/iot/statistics` - IoT istatistikleri

**Durum:** ❌ Yeni tasarımda yok

---

### 23. Computer Vision
**Backend Endpoints:**
- `GET /api/cv/analyze/:imageName` - Image analizi
- `GET /api/cv/features/:imageName` - Feature extraction

**Durum:** ❌ Yeni tasarımda yok

---

### 24. Alert Rules (Alerts'ten farklı)
**Backend Endpoints:**
- `GET /api/alerts` - Alert kuralları listesi
- `POST /api/alerts` - Alert kuralı oluşturma
- `PUT /api/alerts/:id` - Alert kuralı güncelleme
- `DELETE /api/alerts/:id` - Alert kuralı silme

**Durum:** ❌ Yeni tasarımda yok (Alerts sayfası sadece bildirimleri gösteriyor, kuralları değil)

---

### 25. Custom Rules
**Backend Endpoints:**
- `GET /api/custom-rules` - Özel kurallar listesi
- `GET /api/custom-rules/:id` - Kural detayı
- `POST /api/custom-rules` - Kural oluşturma
- `PUT /api/custom-rules/:id` - Kural güncelleme
- `DELETE /api/custom-rules/:id` - Kural silme
- `POST /api/custom-rules/:id/toggle` - Kural aktif/pasif

**Durum:** ❌ Yeni tasarımda yok (eski `admin/custom-rules.tsx` var)

---

### 26. Allowlist
**Backend Endpoints:**
- `GET /api/allowlist` - Allowlist listesi
- `POST /api/allowlist` - Allowlist ekleme/güncelleme
- `DELETE /api/allowlist/:imageName` - Allowlist'ten çıkarma

**Durum:** ❌ Yeni tasarımda yok (eski `admin/allowlist.tsx` var)

---

### 27. Audit Logs
**Backend Endpoints:**
- `GET /api/audit-logs` - Audit log listesi
- `GET /api/audit-logs/action/:action` - Action'a göre loglar
- `GET /api/audit-logs/resource/:resourceType/:resourceId` - Resource'a göre loglar

**Durum:** ❌ Yeni tasarımda yok (eski `admin/audit-logs.tsx` var)

---

### 28. API Tokens
**Backend Endpoints:**
- `GET /api/tokens` - Token listesi
- `POST /api/tokens` - Token oluşturma
- `DELETE /api/tokens/:id` - Token silme

**Durum:** ❌ Yeni tasarımda yok (eski `admin/tokens.tsx` var)

---

### 29. Jira Integration
**Backend Endpoints:**
- `POST /api/tickets/jira` - Jira ticket oluşturma

**Durum:** ❌ Yeni tasarımda yok

---

### 30. Bulk Operations
**Backend Endpoints:**
- (Çeşitli bulk endpoint'ler var ama özel bir sayfa yok)

**Durum:** ❌ Yeni tasarımda yok (eski `admin/bulk-operations.tsx` var)

---

### 31. Image Creation
**Backend Endpoints:**
- `POST /api/images` - Image oluşturma
- `POST /api/images/bulk` - Toplu image oluşturma

**Durum:** ❌ Yeni tasarımda yok

---

### 32. Image Export
**Backend Endpoints:**
- `GET /api/images/export` - CSV/Excel/JSON export
- `GET /api/images/export/pdf` - PDF export

**Durum:** ⚠️ Overview'da export butonları var ama detaylı export sayfası yok

---

## Özet

**Toplam Backend Endpoint Sayısı:** ~178 endpoint
**Yeni Tasarımda Mevcut Sayfa Sayısı:** 7 sayfa
**Eksik Özellik Sayısı:** ~32 ana özellik kategorisi

**En Kritik Eksikler:**
1. Image Detay Sayfası
2. AI Dashboard (30+ AI endpoint'i)
3. Reports & Report Management (Reports, Scheduled Reports, Templates, History)
4. Remediation Scripts
5. Recommendations
6. Risk Budgets
7. SBOM
8. Anomalies
9. Webhooks
10. Widgets
11. Custom Rules
12. Allowlist
13. Audit Logs
14. API Tokens
15. Dependency Graph
16. Repositories
17. Image Comparison
18. Auto Actions
19. IoT Features
20. Computer Vision
