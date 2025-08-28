#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function buildElectron() {
  console.log('🚀 Building Capacinator for Windows...\n');

  try {
    // 1. Clean dist directories
    console.log('🧹 Cleaning dist directories...');
    await fs.remove(path.join(rootDir, 'dist'));
    await fs.remove(path.join(rootDir, 'dist-electron'));

    // 2. Build server
    console.log('\n📦 Building server...');
    await execAsync('npm run build:server', { cwd: rootDir });

    // 3. Build client
    console.log('\n📦 Building client...');
    await execAsync('npm run build:client', { cwd: rootDir });

    // 4. Copy Electron files
    console.log('\n📋 Preparing Electron files...');
    const electronDistDir = path.join(rootDir, 'dist/electron');
    await fs.ensureDir(electronDistDir);

    // Use production main file
    await fs.copy(
      path.join(rootDir, 'src/electron/main-production.js'),
      path.join(electronDistDir, 'main.js')
    );

    // Copy preload script
    await fs.copy(
      path.join(rootDir, 'src/electron/preload.js'),
      path.join(electronDistDir, 'preload.js')
    );

    // Create placeholder icons if they don't exist
    console.log('\n🎨 Preparing icons...');
    const assetsDir = path.join(rootDir, 'assets');
    await fs.ensureDir(assetsDir);

    // Create a simple placeholder icon.png if it doesn't exist
    const iconPath = path.join(assetsDir, 'icon.png');
    if (!await fs.exists(iconPath)) {
      console.log('  Creating placeholder icon.png...');
      // Create a simple 256x256 PNG placeholder
      const { createCanvas } = await import('canvas').catch(() => {
        console.log('  Canvas not available, using dummy icon');
        return { createCanvas: null };
      });

      if (createCanvas) {
        const canvas = createCanvas(256, 256);
        const ctx = canvas.getContext('2d');
        
        // Draw a simple icon
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', 128, 128);

        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(iconPath, buffer);
      } else {
        // Create a minimal PNG file as placeholder
        const minimalPng = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
          0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00,
          0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
          0x60, 0x82
        ]);
        await fs.writeFile(iconPath, minimalPng);
      }
    }

    // Create .ico file for Windows
    const icoPath = path.join(assetsDir, 'icon.ico');
    if (!await fs.exists(icoPath)) {
      console.log('  Creating icon.ico from icon.png...');
      // For now, just copy the PNG as ICO (Electron builder will handle conversion)
      await fs.copy(iconPath, icoPath);
    }

    // 5. Build Electron app
    console.log('\n🔨 Building Electron executable...');
    await execAsync('npm run build:electron', { cwd: rootDir });

    console.log('\n✅ Build completed successfully!');
    console.log(`📁 Output directory: ${path.join(rootDir, 'dist-electron')}`);

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildElectron();