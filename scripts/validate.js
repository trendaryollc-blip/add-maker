#!/usr/bin/env node
/* ============================================================
   OMNI — scripts/validate.js
   Static validation for the whole codebase:
     1. Verifies required structural artifacts exist.
     2. Runs `node --check` (syntax) on every .js file.
   Exits non-zero on the first problem so it can gate CI/pre-commit.
   Usage: npm run validate
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const JS_DIRS = ['frontend/src/js', 'backend/src', 'backend/tests', 'backend/server.js', 'scripts', 'tests'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build'];

const REQUIRED = [
  'package.json',
  'backend/server.js',
  'backend/src/routes/index.js',
  'frontend/public/index.html',
  'frontend/src/css/main.css',
  'frontend/src/css/themes.css',
  'frontend/src/css/animations.css',
  'frontend/src/css/responsive.css',
  'frontend/src/js/app.js',
  'frontend/src/js/config.js',
  'frontend/src/js/router.js',
  'frontend/src/js/store.js'
];

/* Recursively gather every .js file under the given relative dirs. */
function collectJsFiles() {
  const files = [];
  JS_DIRS.forEach((dir) => {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return;
    // If it's a file, add it directly
    if (fs.statSync(abs).isFile()) {
      files.push(abs);
      return;
    }
    const walk = (rel) => {
      fs.readdirSync(rel, { withFileTypes: true }).forEach((entry) => {
        if (SKIP_DIRS.includes(entry.name)) return;
        const full = path.join(rel, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) files.push(full);
      });
    };
    walk(abs);
  });
  return files;
}

let failed = false;

console.log('◈ OMNI static validation\n');

// 1. Required structural artifacts
console.log('Checking required files…');
REQUIRED.forEach((rel) => {
  const ok = fs.existsSync(path.join(ROOT, rel));
  if (!ok) failed = true;
  console.log(`  ${ok ? '✓' : '✗ MISSING'} ${rel}`);
});

// 2. JS syntax
console.log('\nChecking JS syntax…');
const jsFiles = collectJsFiles();
if (!jsFiles.length) {
  console.log('  ⚠ no JS files found to check');
} else {
  jsFiles.forEach((file) => {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      console.log(`  ✓ ${path.relative(ROOT, file)}`);
    } catch (err) {
      failed = true;
      console.log(`  ✗ ${path.relative(ROOT, file)}`);
      console.log(String(err.stderr || err.message).split('\n').slice(0, 4).join('\n'));
    }
  });
}

console.log(failed ? '\n✗ Validation FAILED' : '\n✓ Validation passed');
process.exit(failed ? 1 : 0);