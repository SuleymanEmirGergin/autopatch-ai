import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { parseImageName } from "../utils/imageParser";

export type ScriptType = "bash" | "kubectl" | "github-actions" | "gitlab-ci";

export interface RemediationScript {
  id: string;
  scriptType: ScriptType;
  title: string;
  description: string;
  riskFactor: string;
  script: string;
  language: string; // "bash", "yaml", etc.
  estimatedRiskReduction: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  prerequisites?: string[];
  warnings?: string[];
}

export interface RemediationScriptsResponse {
  image: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
  };
  scripts: RemediationScript[];
  totalScripts: number;
}

export class RemediationScriptService {
  /**
   * Image için remediation script'leri üretir
   */
  generateScripts(
    image: ImageRiskDocument,
    scriptTypes: ScriptType[] = ["bash", "kubectl", "github-actions", "gitlab-ci"]
  ): RemediationScript[] {
    const scripts: RemediationScript[] = [];

    image.riskFactors.forEach((factor) => {
      scriptTypes.forEach((scriptType) => {
        const script = this.generateScriptForFactor(image, factor, scriptType);
        if (script) {
          scripts.push(script);
        }
      });
    });

    return scripts;
  }

  /**
   * Belirli bir risk faktörü için script üretir
   */
  private generateScriptForFactor(
    image: ImageRiskDocument,
    factor: string,
    scriptType: ScriptType
  ): RemediationScript | null {
    const parsed = parseImageName(image.imageName);
    const namespace = image.pods.length > 0 ? image.pods[0].namespace : "default";

    if (factor === "Uses latest tag") {
      return this.generateLatestTagRemediation(image, parsed, namespace, scriptType);
    }

    if (factor === "Uses root user") {
      return this.generateRootUserRemediation(image, parsed, namespace, scriptType);
    }

    if (factor === "Uses non-production tag") {
      return this.generateNonProdTagRemediation(image, parsed, namespace, scriptType);
    }

    if (factor === "Legacy image tag") {
      return this.generateLegacyTagRemediation(image, parsed, namespace, scriptType);
    }

    if (factor.includes("older than")) {
      return this.generateOldImageRemediation(image, parsed, namespace, scriptType);
    }

    return null;
  }

  /**
   * Latest tag remediation script'i üretir
   */
  private generateLatestTagRemediation(
    image: ImageRiskDocument,
    parsed: ReturnType<typeof parseImageName>,
    namespace: string,
    scriptType: ScriptType
  ): RemediationScript {
    const baseName = parsed.baseName;
    const suggestedTag = "v1.0.0"; // Varsayılan tag önerisi

    if (scriptType === "bash") {
      return {
        id: `latest-tag-bash-${image.imageName}`,
        scriptType: "bash",
        title: "Latest Tag'i Belirli Versiyon ile Değiştir (Bash)",
        description: "Latest tag yerine belirli bir versiyon tag'i kullanın",
        riskFactor: "Uses latest tag",
        script: `#!/bin/bash
# Latest tag'i belirli versiyon ile değiştir
# Image: ${image.imageName}
# Önerilen tag: ${suggestedTag}

IMAGE_NAME="${baseName}"
NEW_TAG="${suggestedTag}"
NAMESPACE="${namespace}"

# Tüm deployment'ları bul ve güncelle
kubectl get deployments -n $NAMESPACE -o json | \\
  jq -r '.items[] | select(.spec.template.spec.containers[].image | contains("$IMAGE_NAME:latest")) | .metadata.name' | \\
  while read deployment; do
    echo "Updating deployment: $deployment"
    kubectl set image deployment/$deployment -n $NAMESPACE \\
      \$(kubectl get deployment $deployment -n $NAMESPACE -o json | \\
        jq -r '.spec.template.spec.containers[] | select(.image | contains("$IMAGE_NAME:latest")) | .name'):$IMAGE_NAME:$NEW_TAG
  done

# StatefulSet'leri güncelle
kubectl get statefulsets -n $NAMESPACE -o json | \\
  jq -r '.items[] | select(.spec.template.spec.containers[].image | contains("$IMAGE_NAME:latest")) | .metadata.name' | \\
  while read statefulset; do
    echo "Updating statefulset: $statefulset"
    kubectl set image statefulset/$statefulset -n $NAMESPACE \\
      \$(kubectl get statefulset $statefulset -n $NAMESPACE -o json | \\
        jq -r '.spec.template.spec.containers[] | select(.image | contains("$IMAGE_NAME:latest")) | .name'):$IMAGE_NAME:$NEW_TAG
  done

# DaemonSet'leri güncelle
kubectl get daemonsets -n $NAMESPACE -o json | \\
  jq -r '.items[] | select(.spec.template.spec.containers[].image | contains("$IMAGE_NAME:latest")) | .metadata.name' | \\
  while read daemonset; do
    echo "Updating daemonset: $daemonset"
    kubectl set image daemonset/$daemonset -n $NAMESPACE \\
      \$(kubectl get daemonset $daemonset -n $NAMESPACE -o json | \\
        jq -r '.spec.template.spec.containers[] | select(.image | contains("$IMAGE_NAME:latest")) | .name'):$IMAGE_NAME:$NEW_TAG
  done

echo "Güncelleme tamamlandı. Lütfen pod'ların yeniden başlatıldığını kontrol edin."
`,
        language: "bash",
        estimatedRiskReduction: 40,
        effort: "LOW",
        prerequisites: ["kubectl", "jq"],
        warnings: ["Production ortamında kullanmadan önce test edin", "Pod'lar yeniden başlatılacak"],
      };
    }

    if (scriptType === "kubectl") {
      return {
        id: `latest-tag-kubectl-${image.imageName}`,
        scriptType: "kubectl",
        title: "Latest Tag'i Belirli Versiyon ile Değiştir (kubectl)",
        description: "kubectl komutları ile latest tag'i değiştirin",
        riskFactor: "Uses latest tag",
        script: `# Latest tag'i belirli versiyon ile değiştir
# Image: ${image.imageName}
# Önerilen tag: ${suggestedTag}

# Deployment'ları güncelle
kubectl set image deployment/* -n ${namespace} \\
  \$(kubectl get deployment -n ${namespace} -o jsonpath='{.items[*].spec.template.spec.containers[*].name}' | grep -o '[^ ]*'):${baseName}:${suggestedTag}

# StatefulSet'leri güncelle
kubectl set image statefulset/* -n ${namespace} \\
  \$(kubectl get statefulset -n ${namespace} -o jsonpath='{.items[*].spec.template.spec.containers[*].name}' | grep -o '[^ ]*'):${baseName}:${suggestedTag}

# DaemonSet'leri güncelle
kubectl set image daemonset/* -n ${namespace} \\
  \$(kubectl get daemonset -n ${namespace} -o jsonpath='{.items[*].spec.template.spec.containers[*].name}' | grep -o '[^ ]*'):${baseName}:${suggestedTag}

# Pod'ları yeniden başlat
kubectl rollout restart deployment -n ${namespace}
kubectl rollout restart statefulset -n ${namespace}
kubectl rollout restart daemonset -n ${namespace}
`,
        language: "bash",
        estimatedRiskReduction: 40,
        effort: "LOW",
        prerequisites: ["kubectl"],
        warnings: ["Production ortamında kullanmadan önce test edin"],
      };
    }

    if (scriptType === "github-actions") {
      return {
        id: `latest-tag-github-${image.imageName}`,
        scriptType: "github-actions",
        title: "Latest Tag Remediation (GitHub Actions)",
        description: "GitHub Actions workflow ile latest tag'i değiştirin",
        riskFactor: "Uses latest tag",
        script: `name: Remediate Latest Tag

on:
  workflow_dispatch:
    inputs:
      new_tag:
        description: 'Yeni tag versiyonu'
        required: true
        default: 'v1.0.0'

jobs:
  remediate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'

      - name: Set KUBECONFIG
        run: |
          echo "\${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Update Image Tags
        run: |
          IMAGE_NAME="${baseName}"
          NEW_TAG="\${{ github.event.inputs.new_tag }}"
          NAMESPACE="${namespace}"

          # Deployment'ları güncelle
          for deployment in \$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
            kubectl set image deployment/$deployment -n $NAMESPACE \\
              \$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[*].name}'):$IMAGE_NAME:$NEW_TAG
          done

          # Rollout'u başlat
          kubectl rollout restart deployment -n $NAMESPACE

      - name: Verify Update
        run: |
          kubectl get pods -n ${namespace} -w --timeout=300s
`,
        language: "yaml",
        estimatedRiskReduction: 40,
        effort: "MEDIUM",
        prerequisites: ["GitHub Actions", "Kubernetes cluster access"],
        warnings: ["KUBECONFIG secret'ını GitHub'a ekleyin"],
      };
    }

    if (scriptType === "gitlab-ci") {
      return {
        id: `latest-tag-gitlab-${image.imageName}`,
        scriptType: "gitlab-ci",
        title: "Latest Tag Remediation (GitLab CI)",
        description: "GitLab CI pipeline ile latest tag'i değiştirin",
        riskFactor: "Uses latest tag",
        script: `remediate_latest_tag:
  stage: deploy
  image: bitnami/kubectl:latest
  variables:
    IMAGE_NAME: "${baseName}"
    NEW_TAG: "v1.0.0"
    NAMESPACE: "${namespace}"
  script:
    - |
      # Deployment'ları güncelle
      for deployment in \$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
        kubectl set image deployment/$deployment -n $NAMESPACE \\
          \$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[*].name}'):$IMAGE_NAME:$NEW_TAG
      done
      
      # Rollout'u başlat
      kubectl rollout restart deployment -n $NAMESPACE
      
      # Durumu kontrol et
      kubectl rollout status deployment -n $NAMESPACE --timeout=300s
  only:
    - main
  when: manual
`,
        language: "yaml",
        estimatedRiskReduction: 40,
        effort: "MEDIUM",
        prerequisites: ["GitLab CI", "Kubernetes cluster access"],
        warnings: ["KUBECONFIG variable'ını GitLab'a ekleyin"],
      };
    }

    return null as any;
  }

  /**
   * Root user remediation script'i üretir
   */
  private generateRootUserRemediation(
    image: ImageRiskDocument,
    parsed: ReturnType<typeof parseImageName>,
    namespace: string,
    scriptType: ScriptType
  ): RemediationScript {
    const baseName = parsed.baseName;

    if (scriptType === "bash") {
      return {
        id: `root-user-bash-${image.imageName}`,
        scriptType: "bash",
        title: "Root User Kullanımını Kaldır (Bash)",
        description: "Image'i non-root user ile çalışacak şekilde güncelleyin",
        riskFactor: "Uses root user",
        script: `#!/bin/bash
# Root user kullanımını kaldır
# Image: ${image.imageName}

IMAGE_NAME="${baseName}"
NAMESPACE="${namespace}"

# SecurityContext ekle veya güncelle
kubectl patch deployment -n $NAMESPACE -p '{
  "spec": {
    "template": {
      "spec": {
        "securityContext": {
          "runAsNonRoot": true,
          "runAsUser": 1000,
          "fsGroup": 1000
        },
        "containers": [{
          "name": "container",
          "securityContext": {
            "allowPrivilegeEscalation": false,
            "capabilities": {
              "drop": ["ALL"]
            }
          }
        }]
      }
    }
  }
}'

echo "SecurityContext güncellendi. Pod'lar yeniden başlatılacak."
kubectl rollout restart deployment -n $NAMESPACE
`,
        language: "bash",
        estimatedRiskReduction: 30,
        effort: "MEDIUM",
        prerequisites: ["kubectl"],
        warnings: ["Image'in non-root user ile çalışabildiğinden emin olun", "Test edin"],
      };
    }

    if (scriptType === "kubectl") {
      return {
        id: `root-user-kubectl-${image.imageName}`,
        scriptType: "kubectl",
        title: "Root User Kullanımını Kaldır (kubectl)",
        description: "kubectl patch ile SecurityContext ekleyin",
        riskFactor: "Uses root user",
        script: `# Root user kullanımını kaldır
# Image: ${image.imageName}

# Tüm deployment'lar için SecurityContext ekle
kubectl patch deployment -n ${namespace} --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/securityContext",
    "value": {
      "runAsNonRoot": true,
      "runAsUser": 1000,
      "fsGroup": 1000
    }
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/securityContext",
    "value": {
      "allowPrivilegeEscalation": false,
      "capabilities": {
        "drop": ["ALL"]
      }
    }
  }
]'

kubectl rollout restart deployment -n ${namespace}
`,
        language: "bash",
        estimatedRiskReduction: 30,
        effort: "MEDIUM",
        prerequisites: ["kubectl"],
        warnings: ["Image'in non-root user ile çalışabildiğinden emin olun"],
      };
    }

    // GitHub Actions ve GitLab CI için benzer script'ler
    return this.generateGenericRemediationScript(
      image,
      parsed,
      namespace,
      scriptType,
      "Uses root user",
      "Root User Kullanımını Kaldır",
      "SecurityContext ekleyerek root user kullanımını kaldırın",
      30,
      "MEDIUM"
    );
  }

  /**
   * Non-production tag remediation script'i üretir
   */
  private generateNonProdTagRemediation(
    image: ImageRiskDocument,
    parsed: ReturnType<typeof parseImageName>,
    namespace: string,
    scriptType: ScriptType
  ): RemediationScript {
    return this.generateGenericRemediationScript(
      image,
      parsed,
      namespace,
      scriptType,
      "Uses non-production tag",
      "Production Tag Kullan",
      "Non-production tag'i production tag ile değiştirin",
      15,
      "LOW"
    );
  }

  /**
   * Legacy tag remediation script'i üretir
   */
  private generateLegacyTagRemediation(
    image: ImageRiskDocument,
    parsed: ReturnType<typeof parseImageName>,
    namespace: string,
    scriptType: ScriptType
  ): RemediationScript {
    return this.generateGenericRemediationScript(
      image,
      parsed,
      namespace,
      scriptType,
      "Legacy image tag",
      "Legacy Tag'i Güncelle",
      "Legacy tag'i güncel versiyona güncelleyin",
      20,
      "MEDIUM"
    );
  }

  /**
   * Eski image remediation script'i üretir
   */
  private generateOldImageRemediation(
    image: ImageRiskDocument,
    parsed: ReturnType<typeof parseImageName>,
    namespace: string,
    scriptType: ScriptType
  ): RemediationScript {
    return this.generateGenericRemediationScript(
      image,
      parsed,
      namespace,
      scriptType,
      "Image older than 180 days",
      "Eski Image'i Güncelle",
      "Eski image'i güncel versiyona güncelleyin",
      15,
      "MEDIUM"
    );
  }

  /**
   * Generic remediation script üretir
   */
  private generateGenericRemediationScript(
    image: ImageRiskDocument,
    parsed: ReturnType<typeof parseImageName>,
    namespace: string,
    scriptType: ScriptType,
    riskFactor: string,
    title: string,
    description: string,
    riskReduction: number,
    effort: "LOW" | "MEDIUM" | "HIGH"
  ): RemediationScript {
    const baseName = parsed.baseName;
    const suggestedTag = "v1.0.0";

    if (scriptType === "bash") {
      return {
        id: `${riskFactor.toLowerCase().replace(/\s+/g, "-")}-bash-${image.imageName}`,
        scriptType: "bash",
        title: `${title} (Bash)`,
        description,
        riskFactor,
        script: `#!/bin/bash
# ${title}
# Image: ${image.imageName}

IMAGE_NAME="${baseName}"
NEW_TAG="${suggestedTag}"
NAMESPACE="${namespace}"

# Deployment'ları güncelle
kubectl set image deployment/* -n $NAMESPACE \\
  \$(kubectl get deployment -n $NAMESPACE -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):$IMAGE_NAME:$NEW_TAG

kubectl rollout restart deployment -n $NAMESPACE
`,
        language: "bash",
        estimatedRiskReduction: riskReduction,
        effort,
        prerequisites: ["kubectl"],
        warnings: ["Production ortamında kullanmadan önce test edin"],
      };
    }

    if (scriptType === "kubectl") {
      return {
        id: `${riskFactor.toLowerCase().replace(/\s+/g, "-")}-kubectl-${image.imageName}`,
        scriptType: "kubectl",
        title: `${title} (kubectl)`,
        description,
        riskFactor,
        script: `# ${title}
# Image: ${image.imageName}

kubectl set image deployment/* -n ${namespace} \\
  \$(kubectl get deployment -n ${namespace} -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):${baseName}:${suggestedTag}

kubectl rollout restart deployment -n ${namespace}
`,
        language: "bash",
        estimatedRiskReduction: riskReduction,
        effort,
        prerequisites: ["kubectl"],
        warnings: ["Production ortamında kullanmadan önce test edin"],
      };
    }

    // GitHub Actions ve GitLab CI için generic script'ler
    return {
      id: `${riskFactor.toLowerCase().replace(/\s+/g, "-")}-${scriptType}-${image.imageName}`,
      scriptType,
      title: `${title} (${scriptType === "github-actions" ? "GitHub Actions" : "GitLab CI"})`,
      description,
      riskFactor,
      script: scriptType === "github-actions"
        ? this.generateGitHubActionsScript(baseName, suggestedTag, namespace, title)
        : this.generateGitLabCIScript(baseName, suggestedTag, namespace, title),
      language: "yaml",
      estimatedRiskReduction: riskReduction,
      effort,
      prerequisites: scriptType === "github-actions" ? ["GitHub Actions"] : ["GitLab CI"],
      warnings: ["Kubernetes cluster access gerekli"],
    };
  }

  private generateGitHubActionsScript(
    baseName: string,
    tag: string,
    namespace: string,
    title: string
  ): string {
    return `name: ${title}

on:
  workflow_dispatch:
    inputs:
      new_tag:
        description: 'Yeni tag versiyonu'
        required: true
        default: '${tag}'

jobs:
  remediate:
    runs-on: ubuntu-latest
    steps:
      - name: Configure kubectl
        uses: azure/setup-kubectl@v3

      - name: Set KUBECONFIG
        run: |
          echo "\${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Update Image
        run: |
          kubectl set image deployment/* -n ${namespace} \\
            \$(kubectl get deployment -n ${namespace} -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):${baseName}:\${{ github.event.inputs.new_tag }}

      - name: Restart Deployment
        run: |
          kubectl rollout restart deployment -n ${namespace}
`;
  }

  private generateGitLabCIScript(
    baseName: string,
    tag: string,
    namespace: string,
    title: string
  ): string {
    return `remediate:
  stage: deploy
  image: bitnami/kubectl:latest
  variables:
    IMAGE_NAME: "${baseName}"
    NEW_TAG: "${tag}"
    NAMESPACE: "${namespace}"
  script:
    - kubectl set image deployment/* -n $NAMESPACE \\
        \$(kubectl get deployment -n $NAMESPACE -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):$IMAGE_NAME:$NEW_TAG
    - kubectl rollout restart deployment -n $NAMESPACE
    - kubectl rollout status deployment -n $NAMESPACE --timeout=300s
  only:
    - main
  when: manual
`;
  }
}

