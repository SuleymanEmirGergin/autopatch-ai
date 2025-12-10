# Test Rehberi 🧪

Bu doküman, projeyi nasıl test edeceğinizi adım adım açıklar.

## 📋 İçindekiler

1. [Temel Test Komutları](#temel-test-komutları)
2. [Test Türleri](#test-türleri)
3. [Test Sonuçlarını Okuma](#test-sonuçlarını-okuma)
4. [Belirli Testleri Çalıştırma](#belirli-testleri-çalıştırma)
5. [Test Coverage (Kapsam) Raporu](#test-coverage-kapsam-raporu)
6. [Watch Mode (İzleme Modu)](#watch-mode-izleme-modu)
7. [Hata Ayıklama](#hata-ayıklama)

---

## 🚀 Temel Test Komutları

### Tüm Testleri Çalıştırma

```bash
npm test
```

Bu komut tüm test dosyalarını çalıştırır ve sonuçları gösterir.

**Beklenen Çıktı:**
```
PASS  tests/riskEngine.test.ts
PASS  tests/patchRecommendationService.test.ts
PASS  tests/remediationScriptService.test.ts
...

Test Suites: 13 passed, 13 total
Tests:       72 passed, 72 total
```

---

## 📊 Test Türleri

Projede farklı türde testler bulunmaktadır:

### 1. Unit Testler (Birim Testleri)
Tek bir fonksiyon veya servisi test eder:

```bash
# Örnek: Risk Engine testi
npm test -- tests/riskEngine.test.ts
```

**Test Dosyaları:**
- `tests/riskEngine.test.ts` - Risk hesaplama motoru
- `tests/patchRecommendationService.test.ts` - Patch önerileri servisi
- `tests/remediationScriptService.test.ts` - Remediation script servisi
- `tests/autoActionService.test.ts` - Otomatik aksiyon servisi

### 2. AI Servis Testleri
AI/ML servislerini test eder:

```bash
# Sadece AI testlerini çalıştır
npm run test:ai
```

**Test Dosyaları:**
- `tests/mlRiskPredictionService.test.ts` - ML risk tahmin servisi
- `tests/aiAnomalyDetectionService.test.ts` - AI anomali tespit servisi
- `tests/intelligentRecommendationService.test.ts` - Akıllı öneri servisi

### 3. Integration Testler (Entegrasyon Testleri)
Birden fazla servisin birlikte çalışmasını test eder:

```bash
# Integration testleri
npm test -- tests/integration/aiWorkflow.test.ts
```

**Test Dosyaları:**
- `tests/integration/aiWorkflow.test.ts` - Tam AI workflow testi
- `tests/e2e/demo.test.ts` - End-to-end demo testi

### 4. Security Testler (Güvenlik Testleri)
Güvenlik açıklarını test eder:

```bash
# Security testleri
npm test -- tests/security/aiSecurity.test.ts
```

**Test Dosyaları:**
- `tests/security/aiSecurity.test.ts` - AI servis güvenlik testleri

### 5. Performance Testler (Performans Testleri)
Performans ve ölçeklenebilirliği test eder:

```bash
# Performance testleri
npm test -- tests/performance/aiPerformance.test.ts
```

**Test Dosyaları:**
- `tests/performance/aiPerformance.test.ts` - AI performans testleri

---

## 📈 Test Sonuçlarını Okuma

### Başarılı Test Örneği

```
PASS  tests/riskEngine.test.ts (5.633 s)
  ✓ Risk skoru hesaplar
  ✓ Risk seviyesini belirler
  ✓ Risk faktörlerini analiz eder

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Başarısız Test Örneği

```
FAIL  tests/example.test.ts
  ✗ should calculate risk correctly
    expect(received).toBe(expected)
    
    Expected: 75
    Received: 50
    
    at Object.<anonymous> (tests/example.test.ts:15:25)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
```

**Hata Analizi:**
- `Expected: 75` - Beklenen değer
- `Received: 50` - Gerçek değer
- `at Object.<anonymous> (tests/example.test.ts:15:25)` - Hatanın olduğu satır

---

## 🎯 Belirli Testleri Çalıştırma

### Tek Bir Test Dosyası

```bash
npm test -- tests/riskEngine.test.ts
```

### Birden Fazla Test Dosyası

```bash
npm test -- tests/riskEngine.test.ts tests/patchRecommendationService.test.ts
```

### Belirli Bir Test Case'i

```bash
# Test adına göre filtreleme
npm test -- -t "should calculate risk correctly"
```

### Pattern ile Filtreleme

```bash
# "risk" içeren tüm testleri çalıştır
npm test -- -t "risk"
```

---

## 📊 Test Coverage (Kapsam) Raporu

Kodunuzun ne kadarının test edildiğini görmek için:

```bash
npm run test:coverage
```

Bu komut şunları gösterir:
- **Lines**: Satır kapsamı (%)
- **Functions**: Fonksiyon kapsamı (%)
- **Branches**: Dal kapsamı (%)
- **Statements**: İfade kapsamı (%)

**Örnek Çıktı:**
```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   85.23 |    78.45 |   82.10 |   85.23 |
 src/services      |   90.12 |    85.67 |   88.45 |   90.12 |
 src/controllers   |   80.45 |    75.23 |   78.90 |   80.45 |
-------------------|---------|----------|---------|---------|
```

**Coverage Threshold (Eşik Değerleri):**
- Branches: %70
- Functions: %70
- Lines: %70
- Statements: %70

Eğer bu değerlerin altına düşerseniz test başarısız olur.

---

## 👀 Watch Mode (İzleme Modu)

Kod değişikliklerini otomatik test etmek için:

```bash
npm run test:watch
```

**Özellikler:**
- Dosya değiştiğinde otomatik test çalıştırır
- Sadece değişen dosyalarla ilgili testleri çalıştırır
- `a` tuşu: Tüm testleri çalıştır
- `f` tuşu: Sadece başarısız testleri çalıştır
- `q` tuşu: Çıkış

**Kullanım Senaryosu:**
1. `npm run test:watch` çalıştır
2. Bir dosyayı düzenle
3. Testler otomatik çalışır
4. Sonuçları görüntüle

---

## 🐛 Hata Ayıklama

### Detaylı Hata Mesajları

```bash
# Verbose mod (daha detaylı çıktı)
npm test -- --verbose
```

### Belirli Bir Testi Debug Etme

```bash
# Sadece başarısız testleri göster
npm test -- --onlyFailures
```

### Test Timeout Artırma

Eğer testler zaman aşımına uğruyorsa, `tests/setup.ts` dosyasında timeout değerini artırabilirsiniz:

```typescript
jest.setTimeout(60000); // 60 saniye
```

### Console.log Çıktılarını Gösterme

```bash
# Console.log çıktılarını göster
npm test -- --verbose --no-coverage
```

---

## 📝 Test Yazma Örnekleri

### Basit Test Örneği

```typescript
describe("MyService", () => {
  it("should do something", () => {
    const result = myService.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### Async Test Örneği

```typescript
describe("MyService", () => {
  it("should handle async operations", async () => {
    const result = await myService.asyncOperation();
    expect(result).toBeDefined();
  });
});
```

### Mock Kullanımı

```typescript
jest.mock("../src/persistence/model");

describe("MyService", () => {
  it("should use mocked model", async () => {
    (Model.find as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockData),
    });
    
    const result = await service.getData();
    expect(result).toEqual(mockData);
  });
});
```

---

## 🎓 Pratik Örnekler

### Senaryo 1: Yeni Bir Özellik Eklediniz

```bash
# 1. İlgili testi çalıştırın
npm test -- tests/myNewFeature.test.ts

# 2. Coverage'ı kontrol edin
npm run test:coverage

# 3. Tüm testlerin hala geçtiğinden emin olun
npm test
```

### Senaryo 2: Bir Bug Düzelttiniz

```bash
# 1. İlgili testi çalıştırın
npm test -- tests/bugFix.test.ts

# 2. Watch mode'da test edin
npm run test:watch

# 3. Değişiklikleri yaparken testlerin geçtiğini kontrol edin
```

### Senaryo 3: CI/CD Pipeline'da Test

```bash
# CI/CD'de genellikle şu komutlar kullanılır:
npm ci              # Temiz kurulum
npm test            # Tüm testleri çalıştır
npm run test:coverage  # Coverage raporu oluştur
```

---

## 🔍 Test Dosyalarının Yapısı

```
tests/
├── setup.ts                    # Global test setup
├── riskEngine.test.ts          # Risk engine testleri
├── patchRecommendationService.test.ts
├── remediationScriptService.test.ts
├── autoActionService.test.ts
├── mlRiskPredictionService.test.ts
├── aiAnomalyDetectionService.test.ts
├── intelligentRecommendationService.test.ts
├── aiController.test.ts
├── e2e/
│   └── demo.test.ts           # End-to-end testler
├── integration/
│   └── aiWorkflow.test.ts     # Integration testler
├── performance/
│   └── aiPerformance.test.ts  # Performans testleri
└── security/
    └── aiSecurity.test.ts     # Güvenlik testleri
```

---

## ✅ Test Checklist

Kod değişikliği yaptıktan sonra:

- [ ] İlgili testleri çalıştırdım: `npm test -- tests/myTest.test.ts`
- [ ] Tüm testler geçiyor: `npm test`
- [ ] Coverage eşiklerini kontrol ettim: `npm run test:coverage`
- [ ] Yeni testler ekledim (eğer yeni özellik eklediysem)
- [ ] Test dokümantasyonunu güncelledim

---

## 🆘 Sorun Giderme

### Testler Çok Yavaş Çalışıyor

```bash
# Paralel çalıştırmayı kapat (daha yavaş ama daha stabil)
npm test -- --runInBand
```

### Memory Hatası

```bash
# Node memory limitini artır
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### Mock'lar Çalışmıyor

- `jest.clearAllMocks()` kullanın
- Mock'ları `beforeEach` içinde sıfırlayın
- Mock'ların doğru import edildiğinden emin olun

### TypeScript Hataları

```bash
# TypeScript kontrolü
npx tsc --noEmit
```

---

## 📚 Daha Fazla Bilgi

- [Jest Dokümantasyonu](https://jestjs.io/docs/getting-started)
- [TypeScript Jest](https://jestjs.io/docs/getting-started#using-typescript)
- [Testing Best Practices](https://jestjs.io/docs/snapshot-testing)

---

## 🎉 Başarılı Test Sonucu

Tüm testler geçtiğinde şunu göreceksiniz:

```
✅ Test Suites: 13 passed, 13 total
✅ Tests:       72 passed, 72 total
✅ Snapshots:   0 total
⏱️ Time:        ~9.7s
```

**Tebrikler! Projeniz test edilebilir durumda! 🎊**
