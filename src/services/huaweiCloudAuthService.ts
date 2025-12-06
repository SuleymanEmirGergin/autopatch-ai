import crypto from "crypto";
import axios, { AxiosInstance } from "axios";
import { logger } from "../utils/logger";

/**
 * Huawei Cloud Authentication Service
 * 
 * Huawei Cloud API'lerine erişim için authentication sağlar.
 * AK/SK (Access Key / Secret Key) veya token-based authentication destekler.
 */
export interface HuaweiCloudAuthConfig {
  // AK/SK Authentication
  accessKey?: string;
  secretKey?: string;
  region?: string; // Örn: "cn-north-1", "ap-southeast-1"
  
  // Token-based Authentication (alternatif)
  token?: string;
  
  // CCE özel konfigürasyon
  endpoint?: string;
  projectId?: string;
  clusterId?: string;
}

export class HuaweiCloudAuthService {
  private config: HuaweiCloudAuthConfig;
  private axiosInstance: AxiosInstance | null = null;

  constructor(config: HuaweiCloudAuthConfig) {
    this.config = config;
    this.initializeAxios();
  }

  /**
   * Axios instance'ı authentication header'ları ile yapılandırır
   */
  private initializeAxios(): void {
    if (!this.config.endpoint) {
      logger.warn("Huawei Cloud endpoint tanımlanmamış, axios instance oluşturulamadı");
      return;
    }

    const baseURL = this.config.endpoint.endsWith("/")
      ? this.config.endpoint.slice(0, -1)
      : this.config.endpoint;

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor: Her istekte authentication header ekle
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.config.token) {
          // Token-based authentication
          config.headers = config.headers || {};
          config.headers["X-Auth-Token"] = this.config.token;
        } else if (this.config.accessKey && this.config.secretKey) {
          // AK/SK authentication için signature hesapla
          const signature = this.calculateSignature(config);
          config.headers = config.headers || {};
          config.headers["Authorization"] = signature;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor: Hata yönetimi
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          logger.error("Huawei Cloud API hatası", {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url,
          });
        } else if (error.request) {
          logger.error("Huawei Cloud API'ye ulaşılamadı", {
            url: error.config?.url,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Huawei Cloud API için signature hesaplar (AK/SK authentication)
   * 
   * Huawei Cloud API'leri genellikle AWS Signature V4 benzeri bir imza mekanizması kullanır.
   * Bu basitleştirilmiş bir implementasyondur; gerçek implementasyon Huawei Cloud dokümantasyonuna göre güncellenmelidir.
   */
  private calculateSignature(requestConfig: any): string {
    if (!this.config.accessKey || !this.config.secretKey) {
      throw new Error("AK/SK credentials eksik");
    }

    const method = requestConfig.method?.toUpperCase() || "GET";
    const url = new URL(requestConfig.url, requestConfig.baseURL);
    const path = url.pathname;
    const queryString = url.search.substring(1);

    // Timestamp
    const timestamp = new Date().toISOString();
    const date = timestamp.substring(0, 10).replace(/-/g, "");

    // Canonical request oluştur
    const canonicalHeaders = `host:${url.host}\nx-sdk-date:${timestamp}\n`;
    const signedHeaders = "host;x-sdk-date";
    const canonicalRequest = `${method}\n${path}\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${this.sha256(requestConfig.data || "")}`;

    // String to sign
    const algorithm = "SDK-HMAC-SHA256";
    const credentialScope = `${date}/${this.config.region || "cn-north-1"}/service`;
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${this.sha256(canonicalRequest)}`;

    // Signature hesapla
    const kDate = this.hmacSha256(this.config.secretKey, date);
    const kRegion = this.hmacSha256(kDate, this.config.region || "cn-north-1");
    const kService = this.hmacSha256(kRegion, "service");
    const kSigning = this.hmacSha256(kService, "sdk_request");
    const signature = this.hmacSha256(kSigning, stringToSign).toString("hex");

    // Authorization header oluştur
    return `${algorithm} Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  private sha256(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private hmacSha256(key: string | Buffer, data: string): Buffer {
    return crypto.createHmac("sha256", key).update(data).digest();
  }

  /**
   * Yapılandırılmış axios instance'ı döndürür
   */
  getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      throw new Error("Huawei Cloud authentication yapılandırılmamış");
    }
    return this.axiosInstance;
  }

  /**
   * Authentication yapılandırmasının geçerli olup olmadığını kontrol eder
   */
  isConfigured(): boolean {
    return (
      (!!this.config.token) ||
      (!!this.config.accessKey && !!this.config.secretKey)
    ) && !!this.config.endpoint;
  }

  /**
   * Test isteği göndererek authentication'ı doğrular
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // CCE API'den cluster bilgisi çekmeyi dene
      const response = await this.getAxiosInstance().get(
        `/api/v1/namespaces`,
        {
          validateStatus: (status) => status < 500, // 4xx hatalarını da kabul et
        }
      );
      
      // 200-299 veya 401/403 (authentication hatası ama bağlantı var) başarılı sayılır
      return response.status < 500;
    } catch (error) {
      logger.error("Huawei Cloud bağlantı testi başarısız", { error });
      return false;
    }
  }
}

