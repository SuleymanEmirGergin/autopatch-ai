/**
 * Image name'den repository ve tag bilgisini parse eder.
 * Format: [registry/]repository[:tag]
 * Örnek: registry.example.com/app:1.0.0 -> { repository: "registry.example.com/app", tag: "1.0.0" }
 */
export interface ParsedImage {
  fullName: string;
  registry?: string;
  repository: string;
  tag: string;
  baseName: string; // repository + registry (tag olmadan)
}

export function parseImageName(imageName: string): ParsedImage {
  const parts = imageName.split(":");
  const tag = parts.length > 1 ? parts[parts.length - 1] : "latest";
  const nameWithoutTag = parts.slice(0, -1).join(":");

  // Registry ve repository'yi ayır
  const slashIndex = nameWithoutTag.indexOf("/");
  let registry: string | undefined;
  let repository: string;

  if (slashIndex === -1) {
    // Örnek: ubuntu:20.04
    repository = nameWithoutTag;
  } else {
    // Örnek: registry.example.com/app veya docker.io/library/ubuntu
    const firstPart = nameWithoutTag.substring(0, slashIndex);
    const rest = nameWithoutTag.substring(slashIndex + 1);

    // Eğer ilk kısımda nokta varsa muhtemelen registry'dir
    if (firstPart.includes(".") || firstPart.includes(":") || firstPart === "localhost") {
      registry = firstPart;
      repository = rest;
    } else {
      // Örnek: library/ubuntu
      repository = nameWithoutTag;
    }
  }

  return {
    fullName: imageName,
    registry,
    repository,
    tag,
    baseName: registry ? `${registry}/${repository}` : repository,
  };
}

/**
 * Aynı repository'nin farklı tag'lerini gruplar.
 */
export function groupImagesByRepository(
  images: { imageName: string }[]
): Map<string, ParsedImage[]> {
  const groups = new Map<string, ParsedImage[]>();

  for (const img of images) {
    const parsed = parseImageName(img.imageName);
    const key = parsed.baseName;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(parsed);
  }

  return groups;
}

/**
 * Semantic versioning'e göre tag'leri sıralar.
 * Örnek: 1.0.0, 1.0.1, 1.1.0, 2.0.0
 */
export function compareTags(tag1: string, tag2: string): number {
  // latest her zaman en son
  if (tag1 === "latest") return 1;
  if (tag2 === "latest") return -1;

  // Semantic versioning kontrolü
  const semver1 = tag1.match(/^(\d+)\.(\d+)\.(\d+)/);
  const semver2 = tag2.match(/^(\d+)\.(\d+)\.(\d+)/);

  if (semver1 && semver2) {
    const major1 = parseInt(semver1[1], 10);
    const minor1 = parseInt(semver1[2], 10);
    const patch1 = parseInt(semver1[3], 10);
    const major2 = parseInt(semver2[1], 10);
    const minor2 = parseInt(semver2[2], 10);
    const patch2 = parseInt(semver2[3], 10);

    if (major1 !== major2) return major1 - major2;
    if (minor1 !== minor2) return minor1 - minor2;
    return patch1 - patch2;
  }

  // Tarih formatı kontrolü (YYYY-MM-DD)
  const date1 = tag1.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date2 = tag2.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (date1 && date2) {
    const d1 = new Date(date1[0]);
    const d2 = new Date(date2[0]);
    return d1.getTime() - d2.getTime();
  }

  // Alfanumerik karşılaştırma
  return tag1.localeCompare(tag2);
}

