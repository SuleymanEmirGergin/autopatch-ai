# 🤖 AI Features - AutoPatch AI

## Genel Bakış

AutoPatch AI, **Machine Learning**, **Computer Vision**, **NLP**, ve **Generative AI** teknolojileri kullanarak container image risk analizini geliştirir. **28+ AI özelliği** sunar:

### Core AI Features
1. **ML-Based Risk Prediction** - Historical data'dan risk skoru tahmini
2. **AI-Powered Anomaly Detection** - Anormal pattern tespiti
3. **Intelligent Recommendation Scoring** - ML-based öneri önceliklendirme

### Advanced AI Features
4. **NLP-Based CVE Analysis** - CVE description'larından risk analizi
5. **Image Similarity Clustering** - Benzer image'leri gruplama (K-means)
6. **Predictive Maintenance** - Image güncelleme zamanı tahmini
7. **Risk Correlation Analysis** - Risk faktörleri arasındaki korelasyon
8. **Remediation Success Prediction** - Script başarı tahmini
9. **Image Health Score** - ML-based genel sağlık skoru
10. **Behavioral Pattern Analysis** - Kullanım pattern analizi
11. **Smart Alert Prioritization** - AI-based alert önceliklendirme
12. **Auto-Remediation Decision Engine** - Otomatik remediation karar motoru
13. **Risk Propagation Analysis** - Risk yayılım analizi ve dependency graph
14. **Cost-Benefit Analysis** - ML-based maliyet-fayda analizi ve ROI hesaplama
15. **Security Posture Scoring** - Güvenlik duruş skorlama (5 kategori)
16. **Anomaly Root Cause Analysis** - Kök neden analizi ve timeline
17. **Predictive Risk Modeling** - Gelecek risk modelleme ve forecast
18. **Intelligent Workload Optimization** - İş yükü optimizasyonu ve maliyet tasarrufu
19. **Zero-Day Detection** - Sıfır gün açık tespiti ve risk analizi
20. **Threat Intelligence Integration** - Threat intelligence entegrasyonu ve eşleştirme
21. **Intelligent Patch Prioritization** - Akıllı patch önceliklendirme ve scheduling

### Computer Vision Features
22. **Image Layer Analysis** - Container image layer'larının görsel analizi
23. **Visual Vulnerability Detection** - Görsel pattern recognition ile güvenlik açığı tespiti
24. **Visual Feature Extraction** - Image similarity için visual features çıkarma

### Generative AI Features
25. **LLM-Based Script Generation** - Remediation script'leri için doğal dil işleme
26. **Natural Language Report Generation** - Otomatik rapor oluşturma (executive, technical, compliance)
27. **CVE Description Generation** - CVE açıklamaları için generative AI

### IoT Integration Features
28. **IoT Device Container Monitoring** - Edge device'ların container image'lerini tarama
29. **IoT Gateway Scanning** - IoT gateway'lerin container analizi
30. **Edge Computing Analysis** - Edge computing container'larının risk analizi

---

## 1. ML-Based Risk Prediction

### Açıklama

Historical scan data'dan öğrenen bir **neural network modeli** ile gelecekteki risk skorlarını tahmin eder.

### Özellikler

- **TensorFlow.js** ile eğitilmiş deep learning modeli
- **Feature Engineering**: Risk faktörleri, pod sayısı, image yaşı, namespace kullanımı
- **Trend Analysis**: Risk trend'i (INCREASING, STABLE, DECREASING)
- **Confidence Scoring**: Tahmin güven skoru (0-1)
- **Factor Impact Analysis**: Her risk faktörünün etkisini hesaplar

### API Endpoint'leri

#### Model Eğitimi
```http
POST /ai/train?clusterId=xxx
```

**Response:**
```json
{
  "success": true,
  "message": "AI modelleri başarıyla eğitildi",
  "models": {
    "riskPrediction": true,
    "anomalyDetection": true,
    "recommendationScoring": true
  }
}
```

#### Risk Tahmini
```http
GET /ai/predict/:imageName?clusterId=xxx
```

**Response:**
```json
{
  "success": true,
  "imageName": "registry.example.com/app:latest",
  "currentRisk": {
    "score": 65,
    "level": "HIGH"
  },
  "prediction": {
    "predictedRiskScore": 72,
    "predictedRiskLevel": "HIGH",
    "confidence": 0.85,
    "factors": [
      {
        "name": "Uses latest tag",
        "impact": 20
      }
    ],
    "trend": "INCREASING",
    "predictionDate": "2024-01-15T10:30:00Z"
  }
}
```

#### Toplu Risk Tahmini
```http
POST /ai/predict/bulk
Content-Type: application/json

{
  "imageNames": ["image1:latest", "image2:v1.0"],
  "clusterId": "cluster-123"
}
```

---

## 2. AI-Powered Anomaly Detection

### Açıklama

**Autoencoder** (unsupervised learning) modeli ile anormal pattern'leri tespit eder. Normal pattern'leri öğrenir ve bunlardan sapmaları anomali olarak işaretler.

### Özellikler

- **Autoencoder Model**: Encoder-decoder architecture ile reconstruction error hesaplama
- **Pattern Recognition**: Historical data'dan normal pattern'leri öğrenir
- **Anomaly Scoring**: 0-1 arası anomali skoru
- **Severity Classification**: CRITICAL, HIGH, MEDIUM, LOW
- **Suggested Actions**: Anomali için önerilen aksiyonlar

### API Endpoint'leri

#### Anomali Tespiti
```http
GET /ai/anomaly/:imageName?clusterId=xxx
```

**Response:**
```json
{
  "success": true,
  "imageName": "registry.example.com/app:latest",
  "currentRisk": {
    "score": 85,
    "level": "CRITICAL"
  },
  "anomaly": {
    "isAnomaly": true,
    "anomalyScore": 0.87,
    "anomalyType": "AI_DETECTED_PATTERN",
    "severity": "CRITICAL",
    "explanation": "AI modeli anormal pattern tespit etti (reconstruction error: 0.234). Etkileyen faktörler: yüksek risk skoru, çok sayıda risk faktörü.",
    "confidence": 0.95,
    "suggestedActions": [
      "Acil inceleme yapılmalı",
      "Remediation script'leri uygulanmalı",
      "Versioned tag'e geçilmeli"
    ]
  }
}
```

#### Tüm Anomalileri Tespit Et
```http
GET /ai/anomalies?clusterId=xxx&limit=50
```

---

## 3. Intelligent Recommendation Scoring

### Açıklama

**ML-based priority scoring** ile önerileri akıllıca önceliklendirir. Historical data'dan öğrenerek hangi önerilerin daha etkili olacağını tahmin eder.

### Özellikler

- **Priority Prediction**: ML modeli ile öncelik skoru (0-10)
- **Impact Prediction**: Tahmini risk azalması
- **Urgency Classification**: CRITICAL, HIGH, MEDIUM, LOW
- **AI Reasoning**: Neden bu öneriyi yaptığını açıklar
- **Confidence Scoring**: ML model güven skoru

### API Endpoint'leri

#### Intelligent Recommendations
```http
GET /ai/recommendations/:imageName?clusterId=xxx
```

**Response:**
```json
{
  "success": true,
  "imageName": "registry.example.com/app:latest",
  "currentRisk": {
    "score": 75,
    "level": "HIGH"
  },
  "recommendations": [
    {
      "id": "latest-tag-app",
      "type": "CRITICAL",
      "priority": 10,
      "aiScore": 9.2,
      "mlConfidence": 0.88,
      "predictedImpact": 45,
      "urgency": "CRITICAL",
      "reasoning": "AI önerisi: Yüksek öncelikli öneri, Kritik risk seviyesi, Yüksek etki potansiyeli (40 puan risk azalması)",
      "title": "Latest Tag Kullanımını Kaldır",
      "description": "Bu image 'latest' tag'i kullanıyor...",
      "riskFactor": "Uses latest tag",
      "action": "Image'i belirli bir versiyon tag'i ile kullanın",
      "impact": "Risk skoru ~40 puan azalır",
      "effort": "LOW",
      "estimatedRiskReduction": 40
    }
  ],
  "summary": {
    "total": 5,
    "critical": 2,
    "high": 2,
    "avgAIScore": 8.5
  }
}
```

---

## Model Durumu

### Model Status Endpoint

```http
GET /ai/status
```

**Response:**
```json
{
  "success": true,
  "models": {
    "riskPrediction": {
      "ready": true,
      "name": "ML Risk Prediction Model",
      "description": "Historical data'dan risk skoru tahmini yapar"
    },
    "anomalyDetection": {
      "ready": true,
      "name": "AI Anomaly Detection Model",
      "description": "Autoencoder ile anormal pattern tespiti yapar"
    },
    "recommendationScoring": {
      "ready": true,
      "name": "Intelligent Recommendation Scoring",
      "description": "ML-based priority scoring ile öneri önceliklendirme"
    }
  }
}
```

---

## Kullanım Senaryoları

### Senaryo 1: Risk Tahmini

1. **Model Eğitimi**: Historical data ile modeli eğit
2. **Risk Tahmini**: Image için gelecekteki risk skorunu tahmin et
3. **Trend Analizi**: Risk'in artıp azaldığını gör
4. **Proaktif Aksiyon**: Risk artıyorsa önceden müdahale et

### Senaryo 2: Anomali Tespiti

1. **Normal Pattern Öğrenme**: Historical data'dan normal pattern'leri öğren
2. **Anomali Tespiti**: Yeni scan'lerde anormal pattern'leri yakala
3. **Otomatik Alert**: Anomali tespit edildiğinde bildirim gönder
4. **Suggested Actions**: AI'ın önerdiği aksiyonları uygula

### Senaryo 3: Intelligent Recommendations

1. **Öneri Üretimi**: Normal recommendation service ile öneriler üret
2. **AI Scoring**: ML modeli ile her öneriye priority score ver
3. **Önceliklendirme**: AI score'a göre önerileri sırala
4. **Reasoning**: AI'ın neden bu öneriyi yaptığını gör
5. **Uygulama**: En yüksek AI score'lu önerileri önce uygula

---

## Teknik Detaylar

### Model Mimarisi

#### Risk Prediction Model
- **Type**: Regression (Sequential Neural Network)
- **Layers**: 
  - Dense (64 units, ReLU)
  - Dropout (0.2)
  - Dense (32 units, ReLU)
  - Dropout (0.2)
  - Dense (16 units, ReLU)
  - Dense (1 unit, Linear)
- **Optimizer**: Adam (0.001 learning rate)
- **Loss**: Mean Squared Error
- **Metrics**: Mean Absolute Error

#### Anomaly Detection Model
- **Type**: Autoencoder (Unsupervised Learning)
- **Architecture**:
  - Encoder: Dense(32) → Dense(16) → Dense(8)
  - Decoder: Dense(16) → Dense(32) → Dense(input_size)
- **Optimizer**: Adam (0.001 learning rate)
- **Loss**: Mean Squared Error
- **Anomaly Threshold**: 0.15 (reconstruction error)

#### Recommendation Scoring Model
- **Type**: Binary Classification (Priority Score)
- **Layers**:
  - Dense (32 units, ReLU)
  - Dropout (0.2)
  - Dense (16 units, ReLU)
  - Dense (1 unit, Sigmoid)
- **Optimizer**: Adam (0.001 learning rate)
- **Loss**: Binary Crossentropy

### Feature Engineering

#### Risk Prediction Features
- Risk faktörleri (8 binary flags)
- Pod sayısı (normalize edilmiş)
- Image yaşı (gün cinsinden, normalize edilmiş)
- Risk level encoding (LOW=0.25, MEDIUM=0.5, HIGH=0.75, CRITICAL=1.0)
- Namespace sayısı (normalize edilmiş)

#### Anomaly Detection Features
- Risk skoru (normalize edilmiş)
- Risk level encoding
- Risk faktör sayısı (normalize edilmiş)
- Pod sayısı (normalize edilmiş)
- Namespace sayısı (normalize edilmiş)
- Image yaşı (normalize edilmiş)
- Risk faktörleri (8 binary flags)

### Model Eğitimi

- **Minimum Data**: 10-20 örnek (model türüne göre)
- **Epochs**: 30-50
- **Batch Size**: 16-32
- **Validation Split**: 0.2
- **Shuffle**: True

---

## Frontend Entegrasyonu

### API Functions

```typescript
// Model eğitimi
await trainAIModels(clusterId);

// Model durumu
const status = await getAIModelStatus();

// Risk tahmini
const prediction = await predictRisk(imageName, clusterId);

// Anomali tespiti
const anomaly = await detectAIAnomaly(imageName, clusterId);

// Intelligent recommendations
const recommendations = await getIntelligentRecommendations(imageName, clusterId);
```

---

## Best Practices

1. **Model Eğitimi**: Yeterli historical data olduğunda (20+ scan) modeli eğit
2. **Regular Retraining**: Yeni data geldikçe modeli yeniden eğit
3. **Confidence Threshold**: Düşük confidence (<0.6) tahminlerde dikkatli ol
4. **Anomaly Review**: Anomali tespit edildiğinde manuel review yap
5. **A/B Testing**: AI önerileri ile normal önerileri karşılaştır

---

## Gelecek Geliştirmeler

- [ ] **Real-time Learning**: Online learning ile sürekli model güncelleme
- [ ] **Transfer Learning**: Pre-trained model'lerden öğrenme
- [ ] **Ensemble Methods**: Birden fazla model kombinasyonu
- [ ] **Explainable AI**: Model kararlarını daha detaylı açıklama
- [ ] **CVE Integration**: CVE verileri ile risk prediction iyileştirme
- [ ] **Multi-cluster Learning**: Farklı cluster'lardan öğrenme

---

## Notlar

- AI modelleri **opsiyonel**dir. Model eğitilmemişse rule-based fallback kullanılır.
- Model eğitimi **zaman alabilir** (1-5 dakika, data miktarına göre).
- **TensorFlow.js** Node.js'te çalışır, external dependency yok.
- Model'ler **memory'de** tutulur (restart'ta yeniden eğitilmeli).

