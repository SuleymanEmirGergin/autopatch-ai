export interface PodSummary {
  namespace: string;
  name: string;
  containers: {
    name: string;
    image: string;
  }[];
}

export interface ImageUsage {
  imageName: string;
  pods: {
    namespace: string;
    name: string;
  }[];
}

export interface CCEScanner {
  fetchPods(): Promise<PodSummary[]>;
}


