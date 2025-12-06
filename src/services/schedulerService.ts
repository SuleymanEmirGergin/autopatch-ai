import * as cron from "node-cron";
import { ScanService } from "./scanService";

export interface SchedulerConfig {
  enabled: boolean;
  schedule?: string; // Cron expression, örn: "0 2 * * *" (her gün saat 02:00)
}

export class SchedulerService {
  private task: ReturnType<typeof cron.schedule> | null = null;

  constructor(
    private readonly scanService: ScanService,
    private readonly config: SchedulerConfig
  ) {}

  start(): void {
    if (!this.config.enabled || !this.config.schedule) {
      console.log("Scheduled scans devre dışı veya schedule tanımlı değil.");
      return;
    }

    // Cron expression'ı validate et
    if (!cron.validate(this.config.schedule)) {
      console.error(`Geçersiz cron expression: ${this.config.schedule}`);
      return;
    }

    this.task = cron.schedule(this.config.schedule, async () => {
      console.log(`[Scheduler] Otomatik scan başlatılıyor... (${new Date().toISOString()})`);
      try {
        await this.scanService.runScan();
        console.log("[Scheduler] Otomatik scan tamamlandı.");
      } catch (error) {
        console.error("[Scheduler] Otomatik scan hatası:", error);
      }
    });

    console.log(
      `[Scheduler] Zamanlanmış taramalar başlatıldı. Schedule: ${this.config.schedule}`
    );
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log("[Scheduler] Zamanlanmış taramalar durduruldu.");
    }
  }
}

