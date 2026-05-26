#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const packages = [
  { name: 'mathml2omml', path: 'packages/mathml2omml' },
  { name: 'pptxgenjs', path: 'packages/pptxgenjs' }
];

function buildPackage(pkgInfo) {
  const pkgPath = path.join(__dirname, pkgInfo.path);
  const distPath = path.join(pkgPath, 'dist');

  // Skip if dist already exists
  if (fs.existsSync(distPath)) {
    console.log(`✓ ${pkgInfo.name} dist already exists, skipping build`);
    return true;
  }

  try {
    console.log(`Building ${pkgInfo.name}...`);
    const cwd = pkgPath;
    
    // Try pnpm first, fall back to npm
    try {
      execSync('npm run build', { cwd, stdio: 'inherit' });
    } catch (e) {
      // Try with pnpm if npm fails
      execSync('pnpm run build', { cwd, stdio: 'inherit' });
    }
    
    console.log(`✓ ${pkgInfo.name} built successfully`);
    return true;
  } catch (error) {
    console.warn(`✗ Failed to build ${pkgInfo.name}, but continuing...`);
    console.warn(`  Error: ${error.message}`);
    return false;
  }
}

console.log('Running postinstall...\n');

let hasErrors = false;
for (const pkg of packages) {
  if (!buildPackage(pkg)) {
    hasErrors = true;
  }
}

if (hasErrors) {
  console.warn('\n⚠ Some packages failed to build, but installation will continue.');
  console.warn('This may be expected in CI/CD environments.');
  process.exit(0);
} else {
  console.log('\n✓ All packages built successfully');
  process.exit(0);
}
