import {
  NotificationGroupModel,
  NotificationGroupDocument,
  NotificationType,
  NotificationSeverity,
} from "../persistence/notificationGroup.model";

export interface NotificationInput {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  affectedImages?: string[];
  affectedClusters?: string[];
  metadata?: Record<string, any>;
}

export class NotificationGroupingService {
  private readonly GROUPING_WINDOW_MS = 5 * 60 * 1000; // 5 dakika
  private readonly MAX_COUNT_BEFORE_EXPAND = 5; // 5'ten fazla olursa detay göster

  /**
   * Bir bildirimi gruplar veya yeni grup oluşturur
   */
  async groupNotification(input: NotificationInput): Promise<NotificationGroupDocument> {
    const groupKey = this.generateGroupKey(input);

    // Mevcut grubu bul veya yeni oluştur
    let group = await NotificationGroupModel.findOne({ groupKey }).exec();

    if (group) {
      // Mevcut grubu güncelle
      const timeSinceLastOccurrence =
        Date.now() - group.lastOccurredAt.getTime();

      // Eğer 5 dakikadan fazla geçtiyse yeni grup oluştur
      if (timeSinceLastOccurrence > this.GROUPING_WINDOW_MS) {
        // Eski grubu kapat ve yeni oluştur
        group = await NotificationGroupModel.create({
          ...input,
          groupKey,
          title: input.title,
          summary: this.generateSummary(input, 1),
          affectedImages: input.affectedImages || [],
          affectedClusters: input.affectedClusters || [],
          firstOccurredAt: new Date(),
          lastOccurredAt: new Date(),
          count: 1,
        });
      } else {
        // Mevcut grubu güncelle
        group.count += 1;
        group.lastOccurredAt = new Date();
        group.summary = this.generateSummary(input, group.count);

        // Yeni image'ler ekle
        if (input.affectedImages) {
          const existingImages = new Set(group.affectedImages);
          input.affectedImages.forEach((img) => existingImages.add(img));
          group.affectedImages = Array.from(existingImages);
        }

        // Yeni cluster'lar ekle
        if (input.affectedClusters) {
          const existingClusters = new Set(group.affectedClusters || []);
          input.affectedClusters.forEach((cluster) =>
            existingClusters.add(cluster)
          );
          group.affectedClusters = Array.from(existingClusters);
        }

        await group.save();
      }
    } else {
      // Yeni grup oluştur
      group = await NotificationGroupModel.create({
        ...input,
        groupKey,
        title: input.title,
        summary: this.generateSummary(input, 1),
        affectedImages: input.affectedImages || [],
        affectedClusters: input.affectedClusters || [],
        firstOccurredAt: new Date(),
        lastOccurredAt: new Date(),
        count: 1,
      });
    }

    return group;
  }

  /**
   * Grup key'i oluşturur (benzer bildirimleri gruplamak için)
   */
  private generateGroupKey(input: NotificationInput): string {
    // Tip ve severity'ye göre grupla
    const baseKey = `${input.type}:${input.severity}`;

    // Metadata'dan ek bilgiler ekle (eğer varsa)
    if (input.metadata?.riskFactor) {
      return `${baseKey}:${input.metadata.riskFactor}`;
    }

    if (input.metadata?.anomalyType) {
      return `${baseKey}:${input.metadata.anomalyType}`;
    }

    return baseKey;
  }

  /**
   * Gruplanmış bildirim özeti oluşturur
   */
  private generateSummary(input: NotificationInput, count: number): string {
    if (count === 1) {
      return input.message;
    }

    if (input.affectedImages && input.affectedImages.length > 0) {
      const imageCount = input.affectedImages.length;
      if (imageCount <= this.MAX_COUNT_BEFORE_EXPAND) {
        return `${count} kez tekrarlandı. Etkilenen image'ler: ${input.affectedImages.join(", ")}`;
      } else {
        return `${count} kez tekrarlandı. ${imageCount} image etkilendi.`;
      }
    }

    return `${count} kez tekrarlandı: ${input.message}`;
  }

  /**
   * Aktif (onaylanmamış ve reddedilmemiş) bildirimleri listeler
   */
  async getActiveNotifications(
    limit = 50,
    severity?: NotificationSeverity
  ): Promise<NotificationGroupDocument[]> {
    const query: any = {
      acknowledged: false,
      dismissed: false,
    };

    if (severity) {
      query.severity = severity;
    }

    return NotificationGroupModel.find(query)
      .sort({ lastOccurredAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Bildirimi onaylandı olarak işaretler
   */
  async acknowledgeNotification(
    groupId: string
  ): Promise<NotificationGroupDocument | null> {
    return NotificationGroupModel.findByIdAndUpdate(
      groupId,
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
      { new: true }
    ).exec();
  }

  /**
   * Bildirimi reddedilmiş olarak işaretler
   */
  async dismissNotification(
    groupId: string
  ): Promise<NotificationGroupDocument | null> {
    return NotificationGroupModel.findByIdAndUpdate(
      groupId,
      {
        dismissed: true,
        dismissedAt: new Date(),
      },
      { new: true }
    ).exec();
  }

  /**
   * Rate limiting kontrolü - çok sık bildirim gönderilmesini engeller
   */
  async shouldThrottle(
    groupKey: string,
    minIntervalMs = 60000
  ): Promise<boolean> {
    const group = await NotificationGroupModel.findOne({ groupKey }).exec();

    if (!group) {
      return false; // İlk bildirim, throttle yok
    }

    const timeSinceLastOccurrence =
      Date.now() - group.lastOccurredAt.getTime();

    return timeSinceLastOccurrence < minIntervalMs;
  }
}

