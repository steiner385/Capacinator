/**
 * Offline Queue Service for Git sync operations
 * Feature: 001-git-sync-integration
 * Task: T042
 *
 * Manages queued sync operations when offline
 */

interface QueuedOperation {
  id: string;
  operation: 'push' | 'pull';
  timestamp: Date;
  data?: any;
}

export class OfflineQueueService {
  private readonly STORAGE_KEY = 'capacinator-offline-queue';
  private queue: QueuedOperation[] = [];

  constructor() {
    this.loadQueue();
  }

  /**
   * Add operation to queue
   *
   * @param operation - Type of operation (push/pull)
   * @param data - Optional operation data
   */
  enqueue(operation: 'push' | 'pull', data?: any): void {
    const queuedOp: QueuedOperation = {
      id: this.generateId(),
      operation,
      timestamp: new Date(),
      data,
    };

    this.queue.push(queuedOp);
    this.saveQueue();
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Clear all queued operations
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Remove specific operation from queue
   *
   * @param id - Operation ID
   */
  removeOperation(id: string): void {
    this.queue = this.queue.filter((op) => op.id !== id);
    this.saveQueue();
  }

  /**
   * Check if queue has operations
   */
  hasOperations(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    if (typeof localStorage === 'undefined') {
      // Server-side, no localStorage
      return;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = parsed.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Generate unique ID for operation
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
