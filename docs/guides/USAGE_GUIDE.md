# AutoPatch AI - Kullanım Kılavuzu

Bu dokümantasyon, AutoPatch AI Scanner Service'in yeni özelliklerini ve kullanımını açıklar.

## İçindekiler

1. [Otomatik Risk Azaltma Önerileri](#otomatik-risk-azaltma-önerileri)
2. [Otomatik Image Güncelleme Önerileri](#otomatik-image-güncelleme-önerileri)
3. [Remediation Script'leri](#remediation-scriptleri)
4. [Otomatik Patch Önerileri](#otomatik-patch-önerileri)
5. [Risk Skoruna Göre Otomatik Aksiyonlar](#risk-skoruna-göre-otomatik-aksiyonlar)
6. [Bulk Operations](#bulk-operations)

---

## Otomatik Risk Azaltma Önerileri

### Açıklama
Image'lerin risk faktörlerine göre otomatik olarak risk azaltma önerileri üretir.

### API Endpoint'leri

#### Tüm Image'ler İçin Öneriler
```http
GET /recommendations
```

**Query Parametreleri:**
- `clusterId` (opsiyonel): Cluster ID filtresi
- `projectId` (opsiyonel): Project ID filtresi
- `riskLevel` (opsiyonel): Risk seviyesi filtresi (CRITICAL, HIGH, MEDIUM, LOW)

**Örnek:**
```bash
curl -X GET "http://localhost:5000/recommendations?riskLevel=HIGH" \
  -H "X-API-Key: your-api-key"
```

#### Öncelikli Öneriler
```http
GET /recommendations/priority
```

**Query Parametreleri:**
- `clusterId` (opsiyonel): Cluster ID filtresi
- `projectId` (opsiyonel): Project ID filtresi
- `minPriority` (opsiyonel): Minimum öncelik (1-10, varsayılan: 7)

**Örnek:**
```bash
curl -X GET "http://localhost:5000/recommendations/priority?minPriority=8" \
  -H "X-API-Key: your-api-key"
```

#### Belirli Image İçin Öneriler
```http
GET /images/{imageName}/recommendations
```

**Örnek:**
```bash
curl -X GET "http://localhost:5000/images/registry.example.com/app:latest/recommendations" \
  -H "X-API-Key: your-api-key"
```

### Frontend Kullanımı
1. Ana sayfadan "Risk Önerileri" sayfasına gidin
2. Filtreler bölümünden risk seviyesi, cluster, project seçin
3. "Öncelikli" veya "Tümü" görünümünü seçin
4. Önerileri görüntüleyin ve uygulayın

---

## Otomatik Image Güncelleme Önerileri

### Açıklama
Eski image versiyonları için güncelleme önerileri üretir (semantic versioning bazlı).

### API Endpoint'leri

#### Toplu Güncelleme Önerileri
```http
GET /recommendations/updates
```

**Query Parametreleri:**
- `clusterId` (opsiyonel): Cluster ID filtresi
- `projectId` (opsiyonel): Project ID filtresi
- `minPriority` (opsiyonel): Minimum öncelik (1-10)

**Örnek:**
```bash
curl -X GET "http://localhost:5000/recommendations/updates?minPriority=7" \
  -H "X-API-Key: your-api-key"
```

#### Belirli Image İçin Güncelleme Önerileri
```http
GET /images/{imageName}/update-recommendations
```

### Güncelleme Tipleri
- **PATCH**: Küçük hata düzeltmeleri (örn: 1.0.0 → 1.0.1)
- **MINOR**: Yeni özellikler, geriye uyumlu (örn: 1.0.0 → 1.1.0)
- **MAJOR**: Büyük değişiklikler, geriye uyumsuz (örn: 1.0.0 → 2.0.0)
- **LATEST**: Latest tag'den belirli versiyona geçiş

---

## Remediation Script'leri

### Açıklama
Risk faktörlerine göre hazır remediation script'leri üretir (Bash, kubectl, GitHub Actions, GitLab CI).

### API Endpoint'leri

#### Image İçin Script'ler
```http
GET /images/{imageName}/remediation-scripts
```

**Query Parametreleri:**
- `clusterId` (opsiyonel): Cluster ID filtresi
- `projectId` (opsiyonel): Project ID filtresi
- `scriptTypes` (opsiyonel): Script tipleri (bash, kubectl, github-actions, gitlab-ci)

**Örnek:**
```bash
curl -X GET "http://localhost:5000/images/registry.example.com/app:latest/remediation-scripts?scriptTypes=bash,kubectl" \
  -H "X-API-Key: your-api-key"
```

#### Script Çalıştırma
```http
POST /images/{imageName}/remediation-scripts/{scriptId}/execute
```

**Body:**
```json
{
  "dryRun": true,
  "namespace": "default",
  "parameters": {}
}
```

**Örnek:**
```bash
curl -X POST "http://localhost:5000/images/registry.example.com/app:latest/remediation-scripts/script-id/execute" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "namespace": "default"}'
```

#### Toplu Script Çalıştırma
```http
POST /remediation/batch-execute
```

**Body:**
```json
{
  "imageNames": ["image1:tag1", "image2:tag2"],
  "scriptIds": ["script-id-1", "script-id-2"],
  "dryRun": true,
  "namespace": "default"
}
```

### Script Tipleri

#### Bash Script'leri
- Doğrudan kubectl komutları içerir
- Manuel çalıştırma için uygundur

#### Kubectl Script'leri
- Kubernetes deployment güncellemeleri için optimize edilmiş
- SecurityContext, image tag güncellemeleri

#### GitHub Actions
- CI/CD pipeline'ına entegre edilebilir
- Otomatik deployment için hazır

#### GitLab CI
- GitLab CI/CD pipeline'ına entegre edilebilir
- `.gitlab-ci.yml` formatında

### Frontend Kullanımı
1. "Remediation Script'leri" sayfasına gidin
2. Image seçin
3. Script tipi filtresini uygulayın
4. Script'i görüntüleyin, kopyalayın veya indirin
5. Dry-run veya gerçek çalıştırma yapın

---

## Otomatik Patch Önerileri

### Açıklama
CVE ve risk faktörlerine göre otomatik patch önerileri üretir.

### API Endpoint'leri

#### Toplu Patch Önerileri
```http
GET /recommendations/patches
```

**Query Parametreleri:**
- `clusterId` (opsiyonel): Cluster ID filtresi
- `projectId` (opsiyonel): Project ID filtresi
- `minPriority` (opsiyonel): Minimum öncelik (1-10)
- `severity` (opsiyonel): Severity filtresi (CRITICAL, HIGH, MEDIUM, LOW)

**Örnek:**
```bash
curl -X GET "http://localhost:5000/recommendations/patches?severity=CRITICAL&minPriority=8" \
  -H "X-API-Key: your-api-key"
```

#### Belirli Image İçin Patch Önerileri
```http
GET /images/{imageName}/patch-recommendations
```

### Patch Tipleri
- **SECURITY**: Güvenlik açıkları için patch'ler
- **BUGFIX**: Hata düzeltmeleri için patch'ler
- **FEATURE**: Yeni özellikler için patch'ler
- **UPDATE**: Genel güncellemeler için patch'ler

### CVE Bazlı Patch'ler
SBOM verilerinden CVE bilgileri kullanılarak otomatik patch önerileri üretilir:
- CVE ID
- Package bilgisi (name, version)
- Fixed version
- Severity (CRITICAL, HIGH, MEDIUM, LOW)
- Patch script'leri

---

## Risk Skoruna Göre Otomatik Aksiyonlar

### Açıklama
Risk skoruna göre otomatik aksiyonlar tanımlayabilir ve çalıştırabilirsiniz.

### Policy Oluşturma

#### API Endpoint
```http
POST /auto-actions/policies
```

**Body:**
```json
{
  "name": "High Risk Auto Action",
  "description": "Yüksek riskli image'ler için otomatik bildirim",
  "enabled": true,
  "riskScoreThreshold": 70,
  "riskLevels": ["HIGH", "CRITICAL"],
  "actionType": "NOTIFY",
  "maxActionsPerRun": 5,
  "dryRun": true,
  "clusterId": "cluster-1",
  "projectId": "project-1",
  "namespaceFilter": "prod",
  "riskFactorFilter": ["Uses latest tag"]
}
```

**Aksiyon Tipleri:**
- `NOTIFY`: Bildirim gönderir
- `REMEDIATE_DRY_RUN`: Remediation script'lerini dry-run modunda çalıştırır
- `REMEDIATE_EXECUTE`: Remediation script'lerini gerçekten çalıştırır (dikkatli kullanın!)

### Policy Çalıştırma
```http
POST /auto-actions/policies/{policyId}/execute
```

**Body (opsiyonel):**
```json
{
  "maxActions": 10,
  "dryRunOverride": false
}
```

### Policy Yönetimi

#### Listeleme
```http
GET /auto-actions/policies
```

#### Güncelleme
```http
PUT /auto-actions/policies/{policyId}
```

#### Silme
```http
DELETE /auto-actions/policies/{policyId}
```

### Frontend Kullanımı
1. "Otomatik Aksiyonlar" sayfasına gidin
2. "Yeni Policy Oluştur" butonuna tıklayın
3. Policy ayarlarını yapın:
   - Risk skoru threshold'u
   - Risk seviyeleri
   - Aksiyon tipi
   - Filtreler (namespace, risk faktörü)
4. Policy'yi kaydedin
5. "Çalıştır" butonuna tıklayarak policy'yi manuel olarak tetikleyin

---

## Bulk Operations

### Açıklama
Birden fazla image için toplu remediation işlemleri yapabilirsiniz.

### API Endpoint
```http
POST /remediation/batch-generate-execute
```

**Body:**
```json
{
  "imageNames": ["image1:tag1", "image2:tag2"],
  "scriptType": "bash",
  "riskFactor": "Uses latest tag",
  "dryRun": true,
  "namespace": "default"
}
```

**Parametreler:**
- `imageNames` (zorunlu): İşlem yapılacak image'lerin listesi
- `scriptType` (opsiyonel): Script tipi filtresi (bash, kubectl, github-actions, gitlab-ci)
- `riskFactor` (opsiyonel): Risk faktörü filtresi
- `dryRun` (varsayılan: true): Dry-run modu
- `namespace` (opsiyonel): Hedef namespace

**Örnek:**
```bash
curl -X POST "http://localhost:5000/remediation/batch-generate-execute" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "imageNames": ["registry.example.com/app:latest", "registry.example.com/app2:dev"],
    "scriptType": "bash",
    "riskFactor": "Uses latest tag",
    "dryRun": true
  }'
```

### Frontend Kullanımı
1. "Bulk Operations" sayfasına gidin
2. İşlem yapmak istediğiniz image'leri seçin
3. Script tipi ve risk faktörü filtrelerini uygulayın
4. Dry-run modunu seçin
5. Namespace belirtin (opsiyonel)
6. "Toplu Çalıştır" butonuna tıklayın
7. Sonuçları görüntüleyin

---

## Güvenlik Notları

1. **Dry-Run Modu**: İlk testler için her zaman dry-run modunu kullanın
2. **Production Ortamı**: Production'da otomatik remediation kullanmadan önce dikkatli test edin
3. **API Keys**: Tüm endpoint'ler API key gerektirir, admin işlemleri için admin key gerekir
4. **Rate Limiting**: Çok fazla istek göndermekten kaçının

## Hata Yönetimi

Tüm API endpoint'leri standart hata formatı döner:

```json
{
  "success": false,
  "error": {
    "message": "Hata mesajı",
    "code": "ERROR_CODE"
  }
}
```

**Yaygın Hata Kodları:**
- `VALIDATION_ERROR`: Geçersiz parametreler
- `NOT_FOUND`: Kaynak bulunamadı
- `UNAUTHORIZED`: Yetkisiz erişim
- `FORBIDDEN`: Bu işlem için yetki yok
- `RATE_LIMIT_EXCEEDED`: Çok fazla istek
- `INTERNAL_SERVER_ERROR`: Sunucu hatası

---

## Örnek Senaryolar

### Senaryo 1: Latest Tag Kullanan Image'leri Düzeltme
1. Risk önerileri sayfasından "Uses latest tag" faktörüne sahip image'leri bulun
2. Remediation script'leri sayfasına gidin
3. Her image için "latest tag" script'ini seçin
4. Dry-run modunda test edin
5. Başarılı olursa gerçek çalıştırma yapın

### Senaryo 2: Kritik CVE'leri Otomatik Patch'leme
1. Patch önerileri sayfasına gidin
2. Severity filtresini "CRITICAL" yapın
3. Kritik patch'leri görüntüleyin
4. Bulk operations ile toplu patch uygulayın

### Senaryo 3: Production Ortamı İçin Otomatik Aksiyon
1. Otomatik aksiyonlar sayfasına gidin
2. Yeni policy oluşturun:
   - Risk skoru: 70+
   - Risk seviyesi: HIGH, CRITICAL
   - Namespace: prod
   - Aksiyon: NOTIFY
3. Policy'yi aktif edin
4. Düzenli olarak çalıştırın veya zamanlayın

---

## Destek

Sorularınız için:
- GitHub Issues: [Proje Repository]
- Dokümantasyon: `/docs` endpoint'i (Swagger UI)
- API Referansı: Bu dokümantasyon

