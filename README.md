# AutoPatch AI — Container Security & Risk Intelligence

AutoPatch AI is a container-security platform built for the Huawei Developer Competition Europe 2025. It connects to **Huawei Cloud CCE**, discovers running pods and container images, evaluates operational risk, persists scan history, and exposes the results through a web dashboard and API.

## Engineering focus

The project combines cloud integration, backend architecture, security-oriented risk analysis, ML-assisted scoring, persistence, and observability rather than acting as a single vulnerability-check script.

## Core stack

- **Backend:** TypeScript, Node.js, Express
- **Cloud:** Huawei Cloud CCE / Kubernetes APIs
- **Data:** MongoDB, Mongoose
- **ML / Analytics:** TensorFlow.js
- **Frontend:** Next.js
- **Quality:** Jest, integration/performance tests
- **Ops:** Docker, Swagger/OpenAPI

## Key capabilities

- Real Huawei Cloud CCE scanner with token-based and AK/SK authentication.
- Pod and container-image discovery across configured regions.
- Deterministic risk engine for operational factors such as tags, namespaces, root usage, age, and environment signals.
- ML-assisted risk prediction and anomaly-detection services implemented with TensorFlow.js.
- Scan-history persistence, trend analysis, allowlists, filtering, export, and top-risk reporting.
- Mock CCE mode for local development and reproducible demos without a live Huawei account.
- Next.js dashboard for searching, filtering, and drilling into image-level risk details.

## Architecture

```text
Huawei Cloud CCE
      │
      ▼
RealCCEScanner ──> Scan Service ──> Risk Engine / ML Services
      │                               │
      └──────────────> MongoDB <──────┘
                              │
                         Express API
                              │
                        Next.js Dashboard
```

## Evidence in the repository

- `src/scanner/RealCCEScanner.ts` — real Huawei CCE integration.
- `src/services/mlRiskPredictionService.ts` — TensorFlow.js risk prediction service.
- `tests/` — unit, integration, and performance coverage for risk and AI workflows.
- `frontend/` — dashboard application.
- `HUAWEI_CLOUD_INTEGRATION_GUIDE.md` — integration and authentication details.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Run the frontend separately from `frontend/` and use `MOCK_CCE=true` when a Huawei Cloud account is not available.

## Interview discussion points

- How I separated real cloud integration from mock/demo behavior behind a scanner interface.
- Why deterministic risk scoring and ML-based prediction are complementary rather than interchangeable.
- How I would evolve the scanner from hackathon-scale polling into a production event-driven security service.
- Where cloud credentials, retries, rate limits, and failure isolation matter in a Kubernetes-connected product.
