/**
 * Git Health Check Service
 * Feature: 001-git-sync-integration
 * Task: T101, T102
 *
 * Checks network connectivity and disk space before Git operations
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { GitNetworkError, GitDiskSpaceError } from './GitErrors.js';

export interface HealthCheckResult {
  network: {
    reachable: boolean;
    responseTimeMs?: number;
    error?: string;
  };
  diskSpace: {
    available: boolean;
    freeSpaceMB: number;
    requiredMB: number;
    error?: string;
  };
}

export class GitHealthCheck {
  /**
   * Check if GitHub Enterprise server is reachable
   * Task: T101
   *
   * @param repositoryUrl - GitHub Enterprise repository URL
   * @param timeoutMs - Connection timeout in milliseconds
   * @returns True if server is reachable
   */
  async checkNetworkConnectivity(repositoryUrl: string, timeoutMs: number = 5000): Promise<{
    reachable: boolean;
    responseTimeMs: number;
    error?: string;
  }> {
    try {
      const url = new URL(repositoryUrl);
      const startTime = Date.now();

      return new Promise((resolve, reject) => {
        const protocol = url.protocol === 'https:' ? https : http;

        const req = protocol.get(
          {
            hostname: url.hostname,
            port: url.port,
            path: '/',
            timeout: timeoutMs,
            headers: {
              'User-Agent': 'Capacinator-Git-Health-Check',
            },
          },
          (res) => {
            const responseTime = Date.now() - startTime;

            // Accept any 2xx, 3xx, 4xx response (server is reachable)
            if (res.statusCode && res.statusCode < 500) {
              resolve({
                reachable: true,
                responseTimeMs: responseTime,
              });
            } else {
              resolve({
                reachable: false,
                responseTimeMs: responseTime,
                error: `Server returned ${res.statusCode}`,
              });
            }

            // Consume response data to free up memory
            res.resume();
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve({
            reachable: false,
            responseTimeMs: timeoutMs,
            error: `Connection timeout after ${timeoutMs}ms`,
          });
        });

        req.on('error', (error) => {
          const responseTime = Date.now() - startTime;
          resolve({
            reachable: false,
            responseTimeMs: responseTime,
            error: error.message,
          });
        });

        req.end();
      });
    } catch (error) {
      return {
        reachable: false,
        responseTimeMs: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if there's sufficient disk space for Git operations
   * Task: T102
   *
   * @param targetPath - Path where Git operations will occur
   * @param requiredMB - Required free space in megabytes
   * @returns True if sufficient space available
   */
  async checkDiskSpace(
    targetPath: string,
    requiredMB: number = 500
  ): Promise<{
    available: boolean;
    freeSpaceMB: number;
    requiredMB: number;
    error?: string;
  }> {
    try {
      // Ensure directory exists or use parent directory
      let checkPath = targetPath;
      try {
        await fs.access(targetPath);
      } catch {
        // Directory doesn't exist, check parent
        checkPath = path.dirname(targetPath);
      }

      // Get disk space statistics
      const stats = await fs.statfs(checkPath);

      // Calculate free space in MB
      const blockSize = stats.bsize;
      const freeBlocks = stats.bavail; // Available to non-superuser
      const freeSpaceBytes = freeBlocks * blockSize;
      const freeSpaceMB = Math.floor(freeSpaceBytes / (1024 * 1024));

      return {
        available: freeSpaceMB >= requiredMB,
        freeSpaceMB,
        requiredMB,
      };
    } catch (error) {
      return {
        available: false,
        freeSpaceMB: 0,
        requiredMB,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Comprehensive health check before Git operations
   * Task: T101, T102
   *
   * @param repositoryUrl - GitHub Enterprise repository URL
   * @param targetPath - Path where Git operations will occur
   * @param requiredDiskSpaceMB - Required free disk space in MB
   * @returns Health check result
   * @throws {GitNetworkError} If network is unreachable
   * @throws {GitDiskSpaceError} If insufficient disk space
   */
  async performHealthCheck(
    repositoryUrl: string,
    targetPath: string,
    requiredDiskSpaceMB: number = 500
  ): Promise<HealthCheckResult> {
    // Check network connectivity
    const networkCheck = await this.checkNetworkConnectivity(repositoryUrl);

    // Check disk space
    const diskCheck = await this.checkDiskSpace(targetPath, requiredDiskSpaceMB);

    const result: HealthCheckResult = {
      network: networkCheck,
      diskSpace: diskCheck,
    };

    // Throw errors if checks fail
    if (!networkCheck.reachable) {
      throw new GitNetworkError(
        `Cannot reach GitHub Enterprise server: ${networkCheck.error || 'Unknown error'}`,
        new Error(networkCheck.error)
      );
    }

    if (!diskCheck.available) {
      throw new GitDiskSpaceError(
        `Insufficient disk space: ${diskCheck.freeSpaceMB}MB available, ${requiredDiskSpaceMB}MB required`,
        requiredDiskSpaceMB,
        diskCheck.freeSpaceMB
      );
    }

    return result;
  }

  /**
   * Quick connectivity test (non-throwing version for status checks)
   *
   * @param repositoryUrl - GitHub Enterprise repository URL
   * @returns True if server is reachable
   */
  async isServerReachable(repositoryUrl: string): Promise<boolean> {
    const result = await this.checkNetworkConnectivity(repositoryUrl, 3000);
    return result.reachable;
  }

  /**
   * Get available disk space without throwing errors
   *
   * @param targetPath - Path to check
   * @returns Free space in MB
   */
  async getAvailableDiskSpaceMB(targetPath: string): Promise<number> {
    const result = await this.checkDiskSpace(targetPath, 0);
    return result.freeSpaceMB;
  }
}
