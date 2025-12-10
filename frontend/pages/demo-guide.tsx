import { GetServerSideProps } from "next";
import Head from "next/head";
import MainLayout from "../components/MainLayout";

interface DemoGuideProps {
  // Bu sayfa statik içerik gösteriyor
}

export default function DemoGuide() {
  return (
    <MainLayout>
      <Head>
        <title>Demo Rehberi - AutoPatch AI</title>
      </Head>

      <div
        style={{
          padding: "24px",
          maxWidth: "1200px",
          margin: "0 auto",
          color: "#E5E7EB",
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "32px", color: "white" }}>
          🎬 Demo Rehberi
        </h1>

        {/* Hızlı Başlangıç */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px", color: "#A78BFA" }}>
            🚀 Hızlı Başlangıç (3 Adım)
          </h2>
          
          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Adım 1: Demo Verisini Oluştur
            </h3>
            <pre style={{ 
              backgroundColor: "#111827", 
              padding: "16px", 
              borderRadius: "6px", 
              overflowX: "auto",
              color: "#10B981",
              fontSize: "14px",
            }}>
{`cd /home/emir/Masaüstü/Huawei
npm run generate-demo-data
# Veya kapsamlı veri için:
npm run generate-comprehensive-demo-data`}
            </pre>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Adım 2: Backend'i Başlat
            </h3>
            <pre style={{ 
              backgroundColor: "#111827", 
              padding: "16px", 
              borderRadius: "6px", 
              overflowX: "auto",
              color: "#10B981",
              fontSize: "14px",
            }}>
{`cd /home/emir/Masaüstü/Huawei
npm run dev`}
            </pre>
            <p style={{ marginTop: "12px", color: "#9CA3AF", fontSize: "14px" }}>
              ✅ Beklenen çıktı: "Server running on port 5001" ve "MongoDB connected"
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Adım 3: Frontend'i Başlat
            </h3>
            <pre style={{ 
              backgroundColor: "#111827", 
              padding: "16px", 
              borderRadius: "6px", 
              overflowX: "auto",
              color: "#10B981",
              fontSize: "14px",
            }}>
{`cd /home/emir/Masaüstü/Huawei/frontend
npm run dev`}
            </pre>
            <p style={{ marginTop: "12px", color: "#9CA3AF", fontSize: "14px" }}>
              ✅ Beklenen çıktı: "Ready on http://localhost:3000"
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Adım 4: Tarayıcıda Aç
            </h3>
            <p style={{ color: "#E5E7EB", fontSize: "16px", marginBottom: "8px" }}>
              <strong>http://localhost:3000</strong> adresine gidin
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Göreceğiniz: Ana dashboard, 40+ image listesi, risk seviyeleri, istatistikler
            </p>
          </div>
        </section>

        {/* Demo Senaryosu */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "24px", color: "#A78BFA" }}>
            🎯 Demo Senaryosu (5 Dakika)
          </h2>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              1. Ana Dashboard (30 saniye)
            </h3>
            <p style={{ color: "#E5E7EB", marginBottom: "8px" }}>
              <strong>Göster:</strong> Image listesi, risk seviyeleri, istatistikler
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              <strong>Söyle:</strong> "AutoPatch AI, container güvenliği için AI-powered platform. 40+ image analiz edildi."
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              2. AI Dashboard (1 dakika)
            </h3>
            <ol style={{ color: "#E5E7EB", paddingLeft: "20px", marginBottom: "8px" }}>
              <li>"🤖 AI Dashboard" butonuna tıkla</li>
              <li>Model durumunu göster (3 model hazır)</li>
              <li>Bir image seç (örn: <code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>nginx:latest</code>)</li>
              <li>"AI Analizi Yap" butonuna tıkla</li>
            </ol>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              <strong>Vurgu:</strong> "25+ AI özelliği ile en kapsamlı analiz. TensorFlow.js ile gerçek ML modelleri."
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              3. Intelligent Recommendations (1 dakika)
            </h3>
            <ol style={{ color: "#E5E7EB", paddingLeft: "20px", marginBottom: "8px" }}>
              <li>"💡 Recommendations" sayfasına git</li>
              <li>Önerileri göster (AI skoruna göre sıralı)</li>
              <li>Bir öneriyi aç (örn: "Versioned tag'e geç")</li>
            </ol>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              <strong>Vurgu:</strong> "ML-based priority scoring. AI reasoning ile neden bu öneriyi yaptığını açıklıyor."
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              4. Cost-Benefit Analysis (1 dakika)
            </h3>
            <p style={{ color: "#E5E7EB", marginBottom: "8px" }}>
              AI Dashboard'da "💰 Cost-Benefit" tab'ına geç ve analiz yap
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              <strong>Göster:</strong> ROI: 250%, Payback Period: 15 gün, Total Benefit: $8,750
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              5. Remediation Scripts (1 dakika)
            </h3>
            <ol style={{ color: "#E5E7EB", paddingLeft: "20px", marginBottom: "8px" }}>
              <li>"🔧 Remediation Scripts" sayfasına git</li>
              <li>Image seç (örn: <code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>nginx:latest</code>)</li>
              <li>Script'leri göster (Bash, kubectl, GitHub Actions)</li>
              <li>"Dry Run" butonuna tıkla</li>
            </ol>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              <strong>Vurgu:</strong> "Otomatik script generation. Bash, kubectl, CI/CD desteği. Dry-run ile güvenli test."
            </p>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              6. Sonuç ve Unique Selling Points (30 saniye)
            </h3>
            <ul style={{ color: "#E5E7EB", paddingLeft: "20px" }}>
              <li>"25+ AI özelliği ile en kapsamlı platform"</li>
              <li>"Tam otomasyon: Tespit + Çözüm"</li>
              <li>"Production-ready, gerçek kullanılabilir"</li>
              <li>"Huawei Cloud native entegrasyon"</li>
              <li>"40+ AI endpoint ile tam entegrasyon"</li>
            </ul>
          </div>
        </section>

        {/* Demo Checklist */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "24px", color: "#A78BFA" }}>
            ✅ Demo Öncesi Checklist
          </h2>
          
          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
            <ul style={{ color: "#E5E7EB", listStyle: "none", padding: 0 }}>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>MongoDB çalışıyor (<code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>docker ps | grep mongo</code>)</span>
              </li>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>Demo verisi oluşturuldu (<code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>npm run generate-demo-data</code>)</span>
              </li>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>Backend çalışıyor (Terminal 1: <code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>npm run dev</code>)</span>
              </li>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>Frontend çalışıyor (Terminal 2: <code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>cd frontend && npm run dev</code>)</span>
              </li>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>Tarayıcıda http://localhost:3000 açılıyor</span>
              </li>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>Image'ler görünüyor (40+ image)</span>
              </li>
              <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>☐</span>
                <span>Demo akışı prova edildi</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Önemli Noktalar */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "24px", color: "#A78BFA" }}>
            💡 Demo İpuçları
          </h2>
          
          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
            <ul style={{ color: "#E5E7EB", paddingLeft: "20px" }}>
              <li style={{ marginBottom: "12px" }}>
                <strong>3 Terminal Gerekli:</strong> Backend, Frontend, ve komutlar için
              </li>
              <li style={{ marginBottom: "12px" }}>
                <strong>Hız:</strong> Her adımı hızlıca geç, detaya girmeyin
              </li>
              <li style={{ marginBottom: "12px" }}>
                <strong>Vurgu:</strong> "25+ AI özelliği" vurgusunu yapın
              </li>
              <li style={{ marginBottom: "12px" }}>
                <strong>Backup:</strong> Ekran görüntüleri al (video kaydı için)
              </li>
              <li style={{ marginBottom: "12px" }}>
                <strong>Görsel:</strong> Dashboard'ları ve grafikleri göster
              </li>
            </ul>
          </div>
        </section>

        {/* AI Özellikleri */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "24px", color: "#A78BFA" }}>
            🤖 AI Özellikleri (25+)
          </h2>
          
          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Core AI Features
            </h3>
            <ul style={{ color: "#E5E7EB", paddingLeft: "20px" }}>
              <li>ML-Based Risk Prediction</li>
              <li>AI-Powered Anomaly Detection</li>
              <li>Intelligent Recommendation Scoring</li>
            </ul>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Advanced AI Features
            </h3>
            <ul style={{ color: "#E5E7EB", paddingLeft: "20px", columns: 2, columnGap: "20px" }}>
              <li>NLP-Based CVE Analysis</li>
              <li>Image Similarity Clustering</li>
              <li>Predictive Maintenance</li>
              <li>Risk Correlation Analysis</li>
              <li>Remediation Success Prediction</li>
              <li>Image Health Score</li>
              <li>Behavioral Pattern Analysis</li>
              <li>Smart Alert Prioritization</li>
              <li>Auto-Remediation Decision Engine</li>
              <li>Risk Propagation Analysis</li>
              <li>Cost-Benefit Analysis</li>
              <li>Security Posture Scoring</li>
              <li>Anomaly Root Cause Analysis</li>
              <li>Predictive Risk Modeling</li>
              <li>Intelligent Workload Optimization</li>
              <li>Zero-Day Detection</li>
              <li>Threat Intelligence Integration</li>
              <li>Intelligent Patch Prioritization</li>
              <li>Computer Vision Features</li>
              <li>Generative AI Features</li>
            </ul>
          </div>
        </section>

        {/* Sorun Giderme */}
        <section>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "24px", color: "#A78BFA" }}>
            🔧 Sorun Giderme
          </h2>
          
          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Backend başlamıyor
            </h3>
            <pre style={{ 
              backgroundColor: "#111827", 
              padding: "16px", 
              borderRadius: "6px", 
              overflowX: "auto",
              color: "#10B981",
              fontSize: "14px",
            }}>
{`# Port kontrolü
lsof -i :5001

# MongoDB kontrolü
docker ps | grep mongo

# Farklı port
PORT=5002 npm run dev`}
            </pre>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Frontend başlamıyor
            </h3>
            <pre style={{ 
              backgroundColor: "#111827", 
              padding: "16px", 
              borderRadius: "6px", 
              overflowX: "auto",
              color: "#10B981",
              fontSize: "14px",
            }}>
{`# Port kontrolü
lsof -i :3000

# Node modules temizle
rm -rf node_modules package-lock.json
npm install`}
            </pre>
          </div>

          <div style={{ backgroundColor: "#1F2937", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "#6366F1" }}>
              Veri görünmüyor
            </h3>
            <ol style={{ color: "#E5E7EB", paddingLeft: "20px" }}>
              <li>Demo verisini tekrar yükle: <code style={{ backgroundColor: "#111827", padding: "2px 6px", borderRadius: "4px" }}>npm run generate-demo-data</code></li>
              <li>Sayfayı yenile (F5)</li>
              <li>Backend loglarını kontrol et</li>
            </ol>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<DemoGuideProps> = async () => {
  return {
    props: {},
  };
};
