#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const conflictingDirs = [
  'app/accountant',
  'app/admin',
  'app/supervisor',
];

console.log('🧹 Removing conflicting old route directories...\n');

conflictingDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${dir}`);
    } else {
      console.log(`⏭️  Already removed: ${dir}`);
    }
  } catch (err) {
    console.error(`❌ Error removing ${dir}:`, err.message);
  }
});

console.log('\n✨ Cleanup complete!\n');
console.log('📚 Consolidated dashboard URLs:');
console.log('  - /dashboard/admin (for saas_admin)');
console.log('  - /dashboard/accountant');
console.log('  - /dashboard/supervisor');
console.log('  - /dashboard/teacher');
console.log('  - /dashboard/principal');
console.log('  - /dashboard/parent');
console.log('  - /dashboard/student\n');
