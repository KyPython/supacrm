#!/usr/bin/env node
// scripts/check-observability.js
// Validates that observability infrastructure is properly instrumented

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const requiredFiles = [
  'lib/logger.ts',
  'lib/tracing.ts',
  'lib/metrics.ts',
  'lib/observable-supabase.ts',
  'lib/observable-fetch.ts',
  'hooks/useObservability.ts',
  'components/ObservabilityProvider.tsx',
  'app/api/health/route.ts',
];

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

console.log('🔍 Checking observability infrastructure...\n');

// Check required files exist
console.log('📁 Checking required files:');
requiredFiles.forEach((file) => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
    checks.passed++;
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    checks.failed++;
  }
});

// Check for logger usage in API routes
console.log('\n📝 Checking API route instrumentation:');
const apiDir = path.join(srcDir, 'app', 'api');
if (fs.existsSync(apiDir)) {
  const checkDirectory = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        checkDirectory(fullPath);
      } else if (file === 'route.ts' || file === 'route.tsx') {
        const content = fs.readFileSync(fullPath, 'utf8');
        const hasLogger = content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"');
        const hasTracing = content.includes('from \'@/lib/tracing\'') || content.includes('from "@/lib/tracing"');
        
        const relativePath = path.relative(srcDir, fullPath);
        if (hasLogger || hasTracing) {
          console.log(`  ✅ ${relativePath} - instrumented`);
          checks.passed++;
        } else {
          console.log(`  ⚠️  ${relativePath} - no observability`);
          checks.warnings++;
        }
      }
    });
  };
  
  checkDirectory(apiDir);
} else {
  console.log('  ⚠️  API directory not found');
  checks.warnings++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Observability Check Summary:');
console.log('='.repeat(50));
console.log(`✅ Passed:   ${checks.passed}`);
console.log(`❌ Failed:   ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log('='.repeat(50));

if (checks.failed > 0) {
  console.log('\n❌ Observability check FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Observability infrastructure ready!');
  process.exit(0);
}
