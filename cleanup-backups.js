#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const backupDirs = [
  'app/parent.backup',
  'app/principal.backup',
  'app/teacher.backup',
  'app/student.backup',
];

console.log('🧹 Cleaning up backup directories...\n');

backupDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${dir}`);
    }
  } catch (err) {
    console.error(`❌ Error removing ${dir}:`, err.message);
  }
});

console.log('\n✨ Cleanup complete!\n');
