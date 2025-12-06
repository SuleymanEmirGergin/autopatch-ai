import { CCEScanner, PodSummary } from "../types/cce";
import { HuaweiCloudAuthService, HuaweiCloudAuthConfig } from "../services/huaweiCloudAuthService";
import { logger } from "../utils/logger";
import axios, { AxiosInstance } from "axios";

/**
 * Kubernetes Pod API Response Types
 */
interface KubernetesPod {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    containers: Array<{
      name: string;
      image: string;
    }>;
  };
  status?: {
    phase?: string;
  };
}

interface KubernetesPodListResponse {
  items: KubernetesPod[];
}

/**
 * Gerçek Huawei Cloud CCE entegrasyonu.
 * 
 * Huawei Cloud CCE (Container Engine) Kubernetes API'sine bağlanarak
 * cluster'daki pod'ları ve container image'lerini çeker.
 */
export class RealCCEScanner implements CCEScanner {
  private authService: HuaweiCloudAuthService;
  private axiosInstance: AxiosInstance | null = null;

  constructor(
    private readonly options: {
      endpoint: string;
      projectId: string;
      clusterId: string;
      token?: string;
      // AK/SK Authentication (alternatif)
      accessKey?: string;
      secretKey?: string;
      region?: string;
    }
  ) {
    // Authentication servisini yapılandır
    const authConfig: HuaweiCloudAuthConfig = {
      endpoint: this.options.endpoint,
      projectId: this.options.projectId,
      clusterId: this.options.clusterId,
      token: this.options.token,
      accessKey: this.options.accessKey,
      secretKey: this.options.secretKey,
      region: this.options.region,
    };

    this.authService = new HuaweiCloudAuthService(authConfig);

    // Eğer authentication yapılandırılmışsa axios instance'ı al
    if (this.authService.isConfigured()) {
      try {
        this.axiosInstance = this.authService.getAxiosInstance();
      } catch (error) {
        logger.error("Huawei Cloud authentication yapılandırılamadı", error as Error);
      }
    }
  }

  /**
   * Huawei Cloud CCE cluster'ındaki tüm pod'ları çeker
   */
  async fetchPods(): Promise<PodSummary[]> {
    if (!this.axiosInstance) {
      throw new Error(
        "Huawei Cloud CCE bağlantısı yapılandırılmamış. Lütfen endpoint, token veya AK/SK bilgilerini kontrol edin."
      );
    }

    try {
      // Kubernetes API endpoint'i: /api/v1/pods
      // Huawei Cloud CCE'de genellikle cluster endpoint'i şu formatta olur:
      // https://{endpoint}/api/v1/namespaces/{namespace}/pods
      // veya tüm namespace'ler için: https://{endpoint}/api/v1/pods

      const podsUrl = `/api/v1/pods`;
      
      logger.info("Huawei Cloud CCE'den pod'lar çekiliyor", {
        endpoint: this.options.endpoint,
        clusterId: this.options.clusterId,
        url: podsUrl,
      });

      const response = await this.axiosInstance.get<KubernetesPodListResponse>(
        podsUrl,
        {
          timeout: 30000,
          validateStatus: (status) => status < 500, // 4xx hatalarını da handle et
        }
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Huawei Cloud CCE authentication hatası (${response.status}). Lütfen token veya AK/SK bilgilerini kontrol edin.`
        );
      }

      if (response.status !== 200) {
        throw new Error(
          `Huawei Cloud CCE API hatası: ${response.status} - ${JSON.stringify(response.data)}`
        );
      }

      const pods = response.data?.items || [];

      logger.info("Huawei Cloud CCE'den pod'lar başarıyla çekildi", {
        podCount: pods.length,
      });

      // Kubernetes pod formatını PodSummary formatına dönüştür
      const podSummaries: PodSummary[] = pods
        .filter((pod) => {
          // Sadece çalışan pod'ları al (opsiyonel: status kontrolü)
          // Eğer status yoksa veya Running ise dahil et
          return (
            !pod.status ||
            pod.status.phase === "Running" ||
            pod.status.phase === "Pending"
          );
        })
        .map((pod) => ({
          namespace: pod.metadata.namespace,
          name: pod.metadata.name,
          containers: pod.spec.containers.map((container) => ({
            name: container.name,
            image: container.image,
          })),
        }));

      return podSummaries;
    } catch (error: any) {
      logger.error("Huawei Cloud CCE pod çekme hatası", error as Error);

      // Daha anlaşılır hata mesajları
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        throw new Error(
          `Huawei Cloud CCE endpoint'ine ulaşılamadı: ${this.options.endpoint}. Lütfen endpoint ve network bağlantısını kontrol edin.`
        );
      }

      if (error.response) {
        throw new Error(
          `Huawei Cloud CCE API hatası: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }

      throw error;
    }
  }

  /**
   * Belirli bir namespace'deki pod'ları çeker
   */
  async fetchPodsByNamespace(namespace: string): Promise<PodSummary[]> {
    if (!this.axiosInstance) {
      throw new Error("Huawei Cloud CCE bağlantısı yapılandırılmamış");
    }

    try {
      const podsUrl = `/api/v1/namespaces/${namespace}/pods`;

      const response = await this.axiosInstance.get<KubernetesPodListResponse>(
        podsUrl,
        {
          timeout: 30000,
        }
      );

      const pods = response.data?.items || [];

      return pods.map((pod) => ({
        namespace: pod.metadata.namespace,
        name: pod.metadata.name,
        containers: pod.spec.containers.map((container) => ({
          name: container.name,
          image: container.image,
        })),
      }));
    } catch (error: any) {
      logger.error(`Namespace pod çekme hatası: ${namespace}`, error as Error);
      throw error;
    }
  }

  /**
   * Bağlantıyı test eder
   */
  async testConnection(): Promise<boolean> {
    return this.authService.testConnection();
  }
}


