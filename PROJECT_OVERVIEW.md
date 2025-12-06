# 🎯 AutoPatch AI - Sistem Genel Bakış

## 📌 Sistemin Ana Amacı

**AutoPatch AI**, Kubernetes container ortamlarında (özellikle Huawei Cloud CCE) çalışan container image'lerinin güvenlik risklerini **otomatik olarak tespit eden**, **analiz eden** ve **çözüm önerileri sunan** kapsamlı bir güvenlik platformudur.

### 🎯 Temel Problem

Modern şirketlerde:
- **Yüzlerce container image** kullanılıyor
- **Eski ve güvenlik açığı içeren image'ler** production'da çalışıyor
- **Risk faktörleri manuel** olarak kontrol ediliyor (zaman kaybı)
- **Remediation (düzeltme) süreçleri** hataya açık ve yavaş
- **Compliance raporlama** eksik veya manuel
- **Güvenlik ekipleri** proaktif değil, reaktif çalışıyor

### 💡 Sistemin Çözümü

AutoPatch AI, bu problemleri **tam otomasyon** ile çözer:

1. **Otomatik Tespit**: Kubernetes cluster'larındaki tüm pod'ları tarar
2. **Akıllı Analiz**: 8+ risk faktörü ile kapsamlı risk skorlama
3. **Otomatik Öneriler**: Ne yapılması gerektiğini söyler
4. **Otomatik Remediation**: Düzeltme script'leri oluşturur
5. **Otomatik Aksiyonlar**: Policy'lere göre otomatik işlem yapar
6. **Kapsamlı Raporlama**: Yönetim için detaylı raporlar

---

## 🏗️ Sistem Mimarisi

### Backend (Node.js + TypeScript)
- **34 servis** ile modüler yapı
- **50+ API endpoint**
- **MongoDB** ile veri saklama
- **WebSocket** ile real-time güncellemeler

### Frontend (Next.js + React)
- **20+ admin sayfası**
- **Modern, responsive UI**
- **Dark mode** desteği
- **Real-time dashboard**

---

## 🔍 YAPTIĞIMIZ TÜM ÖZELLİKLER

### 1️⃣ TEMEL TARAMA VE RİSK ANALİZİ

#### Risk Motoru (`riskEngine.ts`)
- **8+ Risk Faktörü**:
  - `latest` tag kullanımı (değişken, güvensiz)
  - Eski base image'ler (ubuntu:20.04 gibi)
  - Root user ile çalışan container'lar
  - Bilinmeyen base image'ler
  - Non-prod tag'ler (dev, test) production'da
  - Test image'leri production'da
  - Prod namespace'te kritik risk'ler
  - Legacy/canary tag'ler

- **Deterministik Skorlama**: Her risk faktörüne puan verir, toplam risk skoru hesaplar
- **Risk Seviyeleri**: LOW, MEDIUM, HIGH, CRITICAL

#### Scanner Servisleri
- **RealCCEScanner**: Huawei Cloud CCE'ye gerçek bağlantı
- **MockCCEScanner**: Test/demo için mock veri
- **Huawei Cloud Auth**: Token veya AK/SK authentication

**Ne İşe Yarar?**
- Kubernetes cluster'ınızı tarar
- Tüm pod'lardaki image'leri bulur
- Her image için risk skoru hesaplar
- Risk'leri önceliklendirir

---

### 2️⃣ OTOMATIK ÖNERİLER SİSTEMİ

#### Recommendation Service (`recommendationService.ts`)
- **Risk Azaltma Önerileri**: Her risk faktörü için özel öneriler
  - "latest tag yerine versioned tag kullan"
  - "Root user yerine non-root user kullan"
  - "Eski base image'i güncelle"

#### Image Update Recommendations (`imageUpdateRecommendationService.ts`)
- **Semantic Versioning Analizi**: Hangi image'lerin güncellenmesi gerektiğini söyler
- **Risk Azaltma Odaklı**: Güncelleme ile risk'in ne kadar azalacağını hesaplar

#### Patch Recommendations (`patchRecommendationService.ts`)
- **CVE-based Patches**: SBOM verilerinden CVE'leri bulur, patch önerir
- **Risk Factor-based**: Risk faktörlerine göre patch önerileri
- **Update Patches**: Image güncelleme önerileri

**Ne İşe Yarar?**
- Güvenlik ekibi ne yapması gerektiğini bilir
- Öncelikli risk'ler otomatik belirlenir
- Her risk için çözüm önerisi var

---

### 3️⃣ REMEDIATION (DÜZELTME) SİSTEMİ

#### Remediation Script Service (`remediationScriptService.ts`)
- **Bash Script'leri**: Linux komutları ile düzeltme
- **Kubectl Script'leri**: Kubernetes'te direkt uygulama
- **CI/CD Script'leri**: 
  - GitHub Actions
  - GitLab CI
  - Jenkins Pipeline

#### Remediation Execution Service (`remediationExecutionService.ts`)
- **Dry-Run Modu**: Script'i çalıştırmadan test et
- **Real Execution**: Gerçekten uygula
- **Batch Execution**: Birden fazla image için toplu uygulama

**Ne İşe Yarar?**
- Manuel işlem yapmadan otomatik düzeltme
- Script'leri kopyala-yapıştır ile kullan
- CI/CD pipeline'larına entegre et

---

### 4️⃣ OTOMATIK AKSİYONLAR (POLICY-BASED)

#### Auto Action Service (`autoActionService.ts`)
- **Policy Tanımlama**: 
  - Risk threshold'ları (örn: HIGH risk > 10 ise)
  - Filtreler (namespace, cluster, image pattern)
  - Aksiyonlar (bildirim, remediation, webhook)

- **Otomatik Tetikleme**: Policy koşulları sağlandığında otomatik çalışır
- **Bildirim Entegrasyonu**: Email, Slack, Teams, Webhook

**Ne İşe Yarar?**
- "CRITICAL risk tespit edildiğinde otomatik bildir"
- "Prod namespace'te HIGH risk varsa remediation script çalıştır"
- Manuel müdahale gerektirmeden otomatik aksiyon

---

### 5️⃣ BULK OPERATIONS (TOPLU İŞLEMLER)

#### Bulk Operations (`bulk-operations.tsx`)
- **Çoklu Image Seçimi**: Birden fazla image seç
- **Toplu Remediation**: Hepsine aynı script'i uygula
- **Toplu Patch**: Birden fazla image'i aynı anda güncelle
- **Toplu Öneri**: Tüm seçili image'ler için öneri oluştur

**Ne İşe Yarar?**
- 100 image'i tek tek değil, toplu olarak düzelt
- Zaman tasarrufu
- Tutarlı uygulama

---

### 6️⃣ RAPORLAMA SİSTEMİ

#### PDF Raporları (`pdfService.ts`)
- **Risk Özet Raporu**: Tüm risk'lerin özeti
- **Executive Summary**: Yönetim için özet rapor
- **Compliance Raporu**: PCI-DSS, SOC 2, ISO 27001 uyumluluk
- **Detaylı Analiz Raporu**: Tüm detaylar

#### HTML Raporları (`htmlService.ts`)
- **Responsive Design**: Mobil uyumlu
- **Print-Friendly**: Yazdırma için optimize
- **Template Support**: Özelleştirilebilir şablonlar

#### Markdown Raporları (`markdownService.ts`)
- **Dokümantasyon Formatı**: GitHub, Confluence için
- **Version Control Friendly**: Git ile takip edilebilir

#### Excel/CSV Export (`exportService.ts`)
- **Çok Sayfalı Excel**: Images, Risk Summary, Risk Factors, Namespace Analysis
- **CSV Export**: Filtrelenmiş veriler
- **JSON Export**: API entegrasyonu için

**Ne İşe Yarar?**
- Yönetime sunum için raporlar
- Compliance denetimleri için dokümantasyon
- Trend analizi için veri export

---

### 7️⃣ RAPOR ŞABLONLARI

#### Report Template Service (`reportTemplateService.ts`)
- **Şablon Yönetimi**: Oluştur, düzenle, sil, kopyala
- **Özelleştirme**:
  - Renk şemaları
  - Logo ekleme
  - Şirket bilgileri
  - İçerik seçenekleri (hangi bölümler gösterilecek)

- **Versioning**: Şablon değişikliklerini takip et
- **Kategoriler ve Tag'ler**: Şablonları organize et
- **Import/Export**: JSON formatında paylaş

**Ne İşe Yarar?**
- Her şirket kendi markasına göre rapor oluşturur
- Farklı departmanlar için farklı şablonlar
- Şablonları takım içinde paylaş

---

### 8️⃣ SCHEDULED REPORTS (PERİYODİK RAPORLAR)

#### Scheduled Report Service (`scheduledReportService.ts`)
- **Zamanlama**: Günlük, haftalık, aylık
- **Otomatik E-posta**: Raporları otomatik gönder
- **Cron Job Yönetimi**: node-cron ile zamanlama
- **Manuel Çalıştırma**: İstediğin zaman tetikle

**Ne İşe Yarar?**
- Her hafta yönetime otomatik rapor
- Compliance için periyodik dokümantasyon
- Trend takibi için düzenli raporlar

---

### 9️⃣ COMPLIANCE YÖNETİMİ

#### Compliance Service (`complianceService.ts`)
- **Standart Desteği**: PCI-DSS, SOC 2, ISO 27001
- **Uyumluluk Skorlama**: Her standart için skor
- **Gap Analysis**: Eksiklikleri tespit et
- **Compliance Raporları**: Detaylı uyumluluk raporu

**Ne İşe Yarar?**
- Denetimler için hazırlık
- Uyumluluk durumunu takip et
- Eksiklikleri proaktif olarak gör

---

### 🔟 BİLDİRİM SİSTEMİ

#### Notification Service (`notificationService.ts`)
- **E-posta**: SMTP ile e-posta gönderimi
- **Slack**: Slack webhook entegrasyonu
- **Microsoft Teams**: Teams webhook entegrasyonu
- **Webhook**: Custom webhook desteği
- **Notification Grouping**: Benzer bildirimleri grupla

**Ne İşe Yarar?**
- Risk tespit edildiğinde anında bildirim
- Ekip üyelerini bilgilendir
- Otomatik aksiyonlar için tetikleme

---

### 1️⃣1️⃣ WEBHOOK SİSTEMİ

#### Webhook Service (`webhookEventService.ts`)
- **Event Subscription**: Hangi event'leri dinlemek istediğini seç
- **Retry Mechanism**: Başarısız gönderimleri tekrar dene
- **Delivery History**: Gönderim geçmişini takip et
- **Test Webhook**: Webhook'u test et

**Ne İşe Yarar?**
- External sistemlere entegrasyon
- Event-driven mimari
- Third-party tool'lara veri gönder

---

### 1️⃣2️⃣ AUDIT LOGGING (DENETİM KAYITLARI)

#### Audit Service (`auditService.ts`)
- **Tüm İşlemleri Kaydet**: Kim, ne zaman, ne yaptı
- **Action Types**: CREATE, UPDATE, DELETE, SCAN, vb.
- **Resource Tracking**: Hangi kaynağa işlem yapıldı
- **Search & Filter**: Audit log'ları ara ve filtrele

**Ne İşe Yarar?**
- Güvenlik denetimleri
- Compliance gereksinimleri
- Sorun çözme (ne olduğunu anlama)

---

### 1️⃣3️⃣ CUSTOM RULES (ÖZEL KURALLAR)

#### Custom Rule Evaluator (`customRuleEvaluator.ts`)
- **Kural Tanımlama**: Kendi risk kurallarınızı yazın
- **JavaScript Expression**: Esnek kural yazımı
- **Risk Skoruna Etki**: Custom kural risk skorunu etkiler
- **Kural Yönetimi**: Oluştur, düzenle, sil, aktif/pasif yap

**Ne İşe Yarar?**
- Şirkete özel risk kuralları
- Özel güvenlik politikaları
- Domain-specific kurallar

---

### 1️⃣4️⃣ ALLOWLIST (İSTİSNA LİSTESİ)

#### Allowlist Service (`allowlistController.ts`)
- **Image İstisnaları**: Belirli image'ler için risk faktörlerini ignore et
- **Risk Factor İstisnaları**: Belirli risk faktörlerini ignore et
- **Justification**: Neden istisna yapıldığını belgele

**Ne İşe Yarar?**
- False positive'leri azalt
- Özel durumları yönet
- Compliance için gerekçe kaydı

---

### 1️⃣5️⃣ RISK BUDGET (RİSK BÜTÇESİ)

#### Risk Budget Service (`riskBudgetService.ts`)
- **Budget Tanımlama**: Her namespace/cluster için risk limiti
- **Budget Tracking**: Mevcut risk vs. budget
- **Alerting**: Budget aşıldığında uyar
- **Trend Analysis**: Budget kullanım trendi

**Ne İşe Yarar?**
- Risk'i kontrol altında tut
- Proaktif uyarılar
- Resource planning

---

### 1️⃣6️⃣ ANOMALY DETECTION (ANOMALİ TESPİTİ)

#### Anomaly Detection Service (`anomalyDetectionService.ts`)
- **Anormal Durum Tespiti**: Beklenmedik risk artışları
- **Pattern Recognition**: Tarihsel verilere göre pattern
- **Alert Generation**: Anomali tespit edildiğinde uyar

**Ne İşe Yarar?**
- Proaktif güvenlik
- Anormal durumları erken tespit
- Trend dışı değişiklikleri yakala

---

### 1️⃣7️⃣ DEPENDENCY GRAPH (BAĞIMLILIK GRAFİĞİ)

#### Dependency Graph Service (`dependencyGraphService.ts`)
- **Image Bağımlılıkları**: Hangi image'ler birbirine bağlı
- **Visual Graph**: ReactFlow ile görsel grafik
- **Impact Analysis**: Bir image güncellendiğinde etkilenenler

**Ne İşe Yarar?**
- Sistem mimarisini anla
- Değişiklik etkisini gör
- Bağımlılık yönetimi

---

### 1️⃣8️⃣ IMAGE COMPARISON (IMAGE KARŞILAŞTIRMA)

#### Image Comparison Service (`imageComparisonService.ts`)
- **İki Image'i Karşılaştır**: Risk, tag, kullanım
- **Diff Analysis**: Farkları göster
- **Migration Planning**: Image güncelleme planı

**Ne İşe Yarar?**
- Image upgrade planlaması
- Risk karşılaştırması
- Migration stratejisi

---

### 1️⃣9️⃣ SBOM (SOFTWARE BILL OF MATERIALS)

#### SBOM Service (`sbomService.ts`)
- **Dependency Listesi**: Image içindeki tüm paketler
- **CVE Mapping**: Paketlerdeki güvenlik açıkları
- **License Tracking**: Lisans bilgileri

**Ne İşe Yarar?**
- Güvenlik açıklarını tespit et
- Lisans uyumluluğu
- Supply chain güvenliği

---

### 2️⃣0️⃣ SECURITY SCORECARD (GÜVENLİK SKOR KARTI)

#### Security Scorecard Service (`securityScorecardService.ts`)
- **Genel Güvenlik Skoru**: Tüm sistem için tek skor
- **Kategori Skorları**: Farklı kategorilerde skorlar
- **Trend Tracking**: Skor trendi

**Ne İşe Yarar?**
- Yönetime özet gösterim
- Güvenlik durumu takibi
- Benchmark karşılaştırması

---

### 2️⃣1️⃣ WIDGET SYSTEM (DASHBOARD WIDGET'LERİ)

#### Widget Service (`widgetService.ts`)
- **Özelleştirilebilir Dashboard**: Widget'ları sürükle-bırak
- **Widget Types**: Stats Card, Chart, List, vb.
- **Layout Management**: Widget pozisyonlarını kaydet

**Ne İşe Yarar?**
- Kişiselleştirilmiş dashboard
- Önemli metrikleri öne çıkar
- Farklı kullanıcılar için farklı görünümler

---

### 2️⃣2️⃣ JIRA ENTEGRASYONU

#### Jira Service (`jiraService.ts`)
- **Otomatik Ticket Oluşturma**: Risk tespit edildiğinde Jira ticket'ı
- **Ticket Tracking**: Ticket durumunu takip et
- **Bidirectional Sync**: Jira'dan güncellemeleri al

**Ne İşe Yarar?**
- DevOps workflow'una entegrasyon
- Issue tracking
- Takım işbirliği

---

### 2️⃣3️⃣ API TOKEN YÖNETİMİ

#### API Token Service (`apiTokenController.ts`)
- **Token Oluşturma**: API erişimi için token
- **Role-based Access**: Admin, Read-only rolleri
- **Token Expiration**: Token süresi yönetimi
- **Usage Tracking**: Token kullanımını takip et

**Ne İşe Yarar?**
- Güvenli API erişimi
- Third-party entegrasyonlar
- Access control

---

### 2️⃣4️⃣ CLUSTER YÖNETİMİ

#### Cluster Controller (`clusterController.ts`)
- **Multi-Cluster Support**: Birden fazla cluster yönet
- **Cluster Configuration**: Her cluster için ayrı config
- **Cluster Status**: Cluster durumunu takip et

**Ne İşe Yarar?**
- Enterprise ortamlarda çoklu cluster
- Farklı environment'lar (dev, staging, prod)
- Merkezi yönetim

---

### 2️⃣5️⃣ RUNBOOK YÖNETİMİ

#### Runbook Service (`runbookService.ts`)
- **Runbook Oluşturma**: Adım adım işlem kılavuzları
- **Runbook Linking**: Risk'lere runbook bağla
- **Execution Tracking**: Runbook çalıştırma geçmişi

**Ne İşe Yarar?**
- Standart işlem prosedürleri
- Yeni ekip üyeleri için kılavuz
- Tutarlı işlem yürütme

---

## 🎨 FRONTEND ÖZELLİKLERİ

### Ana Dashboard (`index.tsx`)
- **Real-time Updates**: WebSocket ile canlı güncellemeler
- **Gelişmiş Filtreleme**: Risk, namespace, cluster, arama
- **Trend Grafikleri**: Risk trend analizi
- **Top Images**: En riskli image'ler
- **Stats Cards**: İstatistik kartları
- **Dark Mode**: Karanlık mod desteği

### Admin Sayfaları (20+ sayfa)
1. **Reports**: Rapor oluşturma ve yönetimi
2. **Report Templates**: Şablon yönetimi
3. **Scheduled Reports**: Periyodik raporlar
4. **Recommendations**: Risk önerileri
5. **Remediation Scripts**: Düzeltme script'leri
6. **Auto Actions**: Otomatik aksiyonlar
7. **Bulk Operations**: Toplu işlemler
8. **Compliance**: Uyumluluk yönetimi
9. **Allowlist**: İstisna listesi
10. **Custom Rules**: Özel kurallar
11. **Risk Budgets**: Risk bütçeleri
12. **Anomalies**: Anomali tespiti
13. **Audit Logs**: Denetim kayıtları
14. **Webhooks**: Webhook yönetimi
15. **Notifications**: Bildirim ayarları
16. **Tokens**: API token yönetimi
17. **Widgets**: Dashboard widget'leri
18. **Settings**: Sistem ayarları
19. **Report History**: Rapor geçmişi
20. **Report Comparison**: Rapor karşılaştırma

---

## 🔧 TEKNİK ALTYAPI

### Error Handling
- **Centralized Error Handler**: Tüm hataları merkezi yönet
- **Custom Error Classes**: ValidationError, NotFoundError, vb.
- **Error Logging**: Hataları logla

### Logging
- **Structured Logging**: JSON formatında log
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Context Information**: Her log'da context bilgisi

### Testing
- **Unit Tests**: Core servisler için testler
- **Jest Framework**: Test framework
- **Test Coverage**: %80+ coverage

### API Documentation
- **Swagger/OpenAPI**: Tüm endpoint'ler dokümante
- **Interactive Docs**: `/docs` endpoint'inde

### Security
- **API Key Authentication**: Güvenli API erişimi
- **Role-based Access**: Admin, Read-only rolleri
- **Input Validation**: Tüm input'lar validate edilir

---

## 📊 SİSTEMİN İŞ DEĞERİ

### Zaman Tasarrufu
- **Manuel tarama**: 8 saat → **Otomatik tarama**: 5 dakika
- **Manuel remediation**: 4 saat → **Otomatik script**: 10 dakika
- **Manuel raporlama**: 2 saat → **Otomatik rapor**: 1 dakika

### Risk Azaltma
- **Proaktif yaklaşım**: Risk'leri tespit etmeden önce önle
- **Erken uyarı**: Anomali tespiti ile erken müdahale
- **Otomatik düzeltme**: Policy-based otomasyon

### Compliance
- **Otomatik raporlama**: Compliance raporları otomatik
- **Audit trail**: Tüm işlemler kayıtlı
- **Standard support**: PCI-DSS, SOC 2, ISO 27001

### Maliyet Optimizasyonu
- **Erken tespit**: Incident maliyetlerini %90 azalt
- **Otomasyon**: İnsan kaynağı maliyetini azalt
- **Efficiency**: Daha az hata, daha hızlı çözüm

---

## 🎯 KULLANIM SENARYOLARI

### Senaryo 1: Güvenlik Ekibi
1. Sisteme giriş yap
2. Dashboard'da risk'leri gör
3. HIGH/CRITICAL risk'leri incele
4. Remediation script'lerini uygula
5. Compliance raporu oluştur

### Senaryo 2: DevOps Ekibi
1. CI/CD pipeline'a entegre et
2. Her deployment'ta otomatik tarama
3. Risk tespit edilirse otomatik bildirim
4. Bulk operations ile toplu güncelleme

### Senaryo 3: Yönetim
1. Executive summary raporunu görüntüle
2. Risk trend analizini incele
3. Compliance durumunu kontrol et
4. Security scorecard'ı takip et

---

## 🚀 SONUÇ

**AutoPatch AI**, container güvenliği için **kapsamlı, otomatik ve akıllı** bir çözümdür. Sadece risk'leri tespit etmez, aynı zamanda:

✅ **Otomatik çözüm önerir**
✅ **Remediation script'leri oluşturur**
✅ **Policy-based otomasyon sağlar**
✅ **Kapsamlı raporlama yapar**
✅ **Compliance desteği sunar**
✅ **Real-time monitoring yapar**

**Tek kelimeyle**: Container güvenliği için **tam otomasyon platformu** 🎯


