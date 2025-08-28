#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Minimal PNG - a 16x16 blue square
const minimalPngData = `
iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA
bgAAAG4BqkkajwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABMSURBVDiN7c4x
CoAwEATAWVKk8P8/FNJYWFgIgiBqNveAFJGAKUJgm2UZlhW894QQKKUQYyTnTGuNUgopJVJKjDHYe8c5
x1qLme8P3eQUEP2brVsAAAAASUVORK5CYII=
`.trim().replace(/\s+/g, '');

async function createIcons() {
  const assetsDir = path.join(rootDir, 'assets');
  await fs.ensureDir(assetsDir);

  // Create PNG icon
  const pngPath = path.join(assetsDir, 'icon.png');
  console.log('Creating icon.png...');
  await fs.writeFile(pngPath, Buffer.from(minimalPngData, 'base64'));

  // Create ICO placeholder (Windows will use PNG)
  const icoPath = path.join(assetsDir, 'icon.ico');
  console.log('Creating icon.ico...');
  await fs.copy(pngPath, icoPath);

  // Create ICNS placeholder (macOS will use PNG)
  const icnsPath = path.join(assetsDir, 'icon.icns');
  console.log('Creating icon.icns...');
  await fs.copy(pngPath, icnsPath);

  console.log('✅ Icons created successfully!');
}

createIcons().catch(console.error);