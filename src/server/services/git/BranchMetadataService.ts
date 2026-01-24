/**
 * Branch Metadata Service
 * Feature: 001-git-sync-integration
 * Task: T069
 *
 * Manages branch metadata in scenarios/branches.json
 */

import fs from 'fs/promises';
import path from 'path';

export interface BranchMetadata {
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  baseBranch: string;
  isActive: boolean;
}

interface BranchesFile {
  version: string;
  branches: BranchMetadata[];
}

export class BranchMetadataService {
  private readonly branchesFilePath: string;

  constructor(private repoPath: string) {
    this.branchesFilePath = path.join(repoPath, 'scenarios', 'branches.json');
  }

  /**
   * Read branches metadata file
   */
  private async readBranchesFile(): Promise<BranchesFile> {
    try {
      const content = await fs.readFile(this.branchesFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet, return empty structure
      return {
        version: '1.0.0',
        branches: [],
      };
    }
  }

  /**
   * Write branches metadata file
   */
  private async writeBranchesFile(data: BranchesFile): Promise<void> {
    const dir = path.dirname(this.branchesFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.branchesFilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Get all branch metadata
   */
  async getAllBranches(): Promise<BranchMetadata[]> {
    const data = await this.readBranchesFile();
    return data.branches;
  }

  /**
   * Get metadata for a specific branch
   */
  async getBranch(branchName: string): Promise<BranchMetadata | null> {
    const data = await this.readBranchesFile();
    return data.branches.find((b) => b.name === branchName) || null;
  }

  /**
   * Add or update branch metadata
   */
  async saveBranch(metadata: BranchMetadata): Promise<void> {
    const data = await this.readBranchesFile();

    const existingIndex = data.branches.findIndex((b) => b.name === metadata.name);

    if (existingIndex >= 0) {
      // Update existing
      data.branches[existingIndex] = metadata;
    } else {
      // Add new
      data.branches.push(metadata);
    }

    await this.writeBranchesFile(data);
  }

  /**
   * Delete branch metadata
   */
  async deleteBranch(branchName: string): Promise<void> {
    const data = await this.readBranchesFile();
    data.branches = data.branches.filter((b) => b.name !== branchName);
    await this.writeBranchesFile(data);
  }

  /**
   * Create new branch metadata
   */
  async createBranchMetadata(
    branchName: string,
    description: string,
    createdBy: string,
    baseBranch: string = 'main'
  ): Promise<BranchMetadata> {
    const metadata: BranchMetadata = {
      name: branchName,
      description,
      createdAt: new Date().toISOString(),
      createdBy,
      baseBranch,
      isActive: true,
    };

    await this.saveBranch(metadata);
    return metadata;
  }

  /**
   * Mark a branch as inactive
   */
  async deactivateBranch(branchName: string): Promise<void> {
    const branch = await this.getBranch(branchName);
    if (branch) {
      branch.isActive = false;
      await this.saveBranch(branch);
    }
  }

  /**
   * Get active branches only
   */
  async getActiveBranches(): Promise<BranchMetadata[]> {
    const allBranches = await this.getAllBranches();
    return allBranches.filter((b) => b.isActive);
  }
}
