import { CCEScanner, PodSummary } from "../types/cce";

export class MockCCEScanner implements CCEScanner {
  async fetchPods(): Promise<PodSummary[]> {
    // Sentetik pod ve image listesi:
    // - default: düşük/orta risk
    // - dev: non-prod tag, test imajları
    // - prod: yüksek/critical risk senaryoları
    return [
      {
        namespace: "default",
        name: "web-frontend-1",
        containers: [
          {
            name: "frontend",
            image: "registry.example.com/frontend-app:latest",
          },
        ],
      },
      {
        namespace: "default",
        name: "api-backend-1",
        containers: [
          {
            name: "backend",
            image: "registry.example.com/backend-api:2024-01-01",
          },
        ],
      },
      {
        namespace: "security",
        name: "scanner-job-1",
        containers: [
          {
            name: "scanner",
            image: "ubuntu:20.04",
          },
        ],
      },
      // Dev ortamı: non-prod tag ve test image kullanımı
      {
        namespace: "dev",
        name: "dev-api-1",
        containers: [
          {
            name: "api",
            image: "registry.example.com/backend-api:dev",
          },
        ],
      },
      {
        namespace: "dev",
        name: "dev-worker-test-1",
        containers: [
          {
            name: "worker",
            image: "registry.example.com/worker-test:1.0.0",
          },
        ],
      },
      // Prod ortamı: yüksek/critical risk için örnekler
      {
        namespace: "prod",
        name: "prod-frontend-1",
        containers: [
          {
            name: "frontend",
            image: "registry.example.com/frontend-app:latest",
          },
        ],
      },
      {
        namespace: "prod-critical",
        name: "prod-critical-api-1",
        containers: [
          {
            name: "api",
            image: "registry.example.com/critical-api-root-debug:2023-01-01",
          },
        ],
      },
    ];
  }
}


