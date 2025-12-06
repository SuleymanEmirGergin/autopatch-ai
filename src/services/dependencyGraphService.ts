import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { parseImageName, ParsedImage } from "../utils/imageParser";

export interface DependencyNode {
  id: string;
  label: string;
  imageName: string;
  riskScore: number;
  riskLevel: string;
  type: "base" | "derived";
  namespace?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "base" | "namespace";
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export class DependencyGraphService {
  /**
   * Image'lar arası bağımlılık grafiğini oluşturur
   */
  buildGraph(images: ImageRiskDocument[]): DependencyGraph {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const nodeMap = new Map<string, DependencyNode>();

    // Bilinen base image'lar
    const knownBases = ["ubuntu", "alpine", "debian", "node", "nginx", "redis", "postgres", "mysql"];

    // Tüm image'ları parse et ve node'ları oluştur
    for (const image of images) {
      const parsed = parseImageName(image.imageName);
      
      // Base image'ı bul
      let baseImage: string | null = null;
      for (const base of knownBases) {
        if (parsed.repository.toLowerCase().includes(base) || 
            image.imageName.toLowerCase().includes(`/${base}:`)) {
          baseImage = `${base}:*`;
          break;
        }
      }

      // Eğer base image bulunamadıysa, registry'den önceki kısmı base olarak kabul et
      if (!baseImage) {
        const parts = parsed.repository.split("/");
        if (parts.length > 1) {
          baseImage = parts[parts.length - 1].split(":")[0];
        } else {
          baseImage = parsed.repository.split(":")[0];
        }
      }

      // Image node'u oluştur
      const imageNodeId = `image-${image._id}`;
      if (!nodeMap.has(imageNodeId)) {
        const imageNode: DependencyNode = {
          id: imageNodeId,
          label: parsed.tag === "latest" ? parsed.baseName : image.imageName,
          imageName: image.imageName,
          riskScore: image.riskScore,
          riskLevel: image.riskLevel,
          type: "derived",
        };
        nodes.push(imageNode);
        nodeMap.set(imageNodeId, imageNode);
      }

      // Base image node'u oluştur
      const baseNodeId = `base-${baseImage}`;
      if (!nodeMap.has(baseNodeId)) {
        const baseNode: DependencyNode = {
          id: baseNodeId,
          label: baseImage,
          imageName: baseImage,
          riskScore: 0,
          riskLevel: "LOW",
          type: "base",
        };
        nodes.push(baseNode);
        nodeMap.set(baseNodeId, baseNode);
      }

      // Edge oluştur (base -> image)
      edges.push({
        from: baseNodeId,
        to: imageNodeId,
        type: "base",
      });

      // Namespace bağımlılıkları (aynı namespace'deki image'lar arası)
      const namespaces = new Set(image.pods.map((p) => p.namespace));
      for (const ns of Array.from(namespaces)) {
        const nsNodeId = `ns-${ns}`;
        if (!nodeMap.has(nsNodeId)) {
          const nsNode: DependencyNode = {
            id: nsNodeId,
            label: `Namespace: ${ns}`,
            imageName: ns,
            riskScore: 0,
            riskLevel: "LOW",
            type: "base",
            namespace: ns,
          };
          nodes.push(nsNode);
          nodeMap.set(nsNodeId, nsNode);
        }

        // Namespace -> Image edge
        edges.push({
          from: nsNodeId,
          to: imageNodeId,
          type: "namespace",
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Belirli bir image için bağımlılık grafiğini getirir
   */
  getImageDependencies(
    imageName: string,
    allImages: ImageRiskDocument[]
  ): {
    baseImages: string[];
    dependentImages: string[];
    namespaces: string[];
  } {
    const parsed = parseImageName(imageName);
    const knownBases = ["ubuntu", "alpine", "debian", "node", "nginx"];
    
    let baseImage: string | null = null;
    for (const base of knownBases) {
      if (parsed.repository.toLowerCase().includes(base) || 
          imageName.toLowerCase().includes(`/${base}:`)) {
        baseImage = base;
        break;
      }
    }

    const image = allImages.find((img) => img.imageName === imageName);
    const namespaces = image ? image.pods.map((p) => p.namespace) : [];

    // Bu base image'ı kullanan diğer image'ları bul
    const dependentImages = allImages
      .filter((img) => {
        if (img.imageName === imageName) return false;
        const imgParsed = parseImageName(img.imageName);
        return imgParsed.repository.toLowerCase().includes(baseImage?.toLowerCase() || "");
      })
      .map((img) => img.imageName);

    return {
      baseImages: baseImage ? [baseImage] : [],
      dependentImages,
      namespaces: Array.from(new Set(namespaces)),
    };
  }
}

