import { ScanRunModel, ScanRunDocument } from "./scanRun.model";

export class ScanRunRepository {
  /**
   * Belirli bir image için son N taramadaki skorları getirir (en yeni > en eski).
   */
  async getImageHistory(
    imageName: string,
    limit = 10
  ): Promise<{ at: Date; riskScore: number; riskLevel: string }[]> {
    const runs: ScanRunDocument[] = await ScanRunModel.find(
      { "images.imageName": imageName },
      {
        startedAt: 1,
        images: 1,
      }
    )
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    const history: { at: Date; riskScore: number; riskLevel: string }[] = [];

    for (const run of runs) {
      const entry = run.images.find((i) => i.imageName === imageName);
      if (entry) {
        history.push({
          at: run.startedAt,
          riskScore: entry.riskScore,
          riskLevel: entry.riskLevel,
        });
      }
    }

    return history;
  }

  /**
   * En son yapılan scan'i getirir.
   */
  async getLatestScan(): Promise<ScanRunDocument | null> {
    return ScanRunModel.findOne()
      .sort({ startedAt: -1 })
      .lean()
      .exec();
  }
}


