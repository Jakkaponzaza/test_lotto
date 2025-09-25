#!/usr/bin/env node

/**
 * System Validation Script
 * ตรวจสอบความพร้อมของระบบก่อน deploy
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Lotto API System...\n');

// ตรวจสอบไฟล์ที่จำเป็น
const requiredFiles = [
  'package.json',
  'server.js',
  '.env.production',
  'render.yaml',
  'database_schema.sql',
  'README.md'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// ตรวจสอบ package.json
console.log('\n📦 Checking package.json:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    'express', 'mysql2', 'cors', 'dotenv', 
    'bcrypt', 'jsonwebtoken', 'express-validator'
  ];
  
  let allDepsExist = true;
  requiredDeps.forEach(dep => {
    const exists = pkg.dependencies && pkg.dependencies[dep];
    console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
    if (!exists) allDepsExist = false;
  });
  
  // ตรวจสอบ scripts
  const hasStartScript = pkg.scripts && pkg.scripts.start;
  console.log(`  ${hasStartScript ? '✅' : '❌'} start script`);
  
} catch (error) {
  console.log('  ❌ Error reading package.json');
  allFilesExist = false;
}

// ตรวจสอบ environment variables
console.log('\n🔧 Checking .env.production:');
try {
  const envContent = fs.readFileSync('.env.production', 'utf8');
  const requiredEnvVars = [
    'NODE_ENV', 'PORT', 'DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const exists = envContent.includes(envVar);
    console.log(`  ${exists ? '✅' : '❌'} ${envVar}`);
  });
  
} catch (error) {
  console.log('  ❌ Error reading .env.production');
}

// ตรวจสอบโครงสร้าง directories
console.log('\n📂 Checking directory structure:');
const requiredDirs = [
  'controllers', 'services', 'middleware', 'utils', 'config'
];

requiredDirs.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`  ${exists ? '✅' : '❌'} ${dir}/`);
});

// สรุปผล
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 System validation PASSED!');
  console.log('✅ Ready for deployment');
  process.exit(0);
} else {
  console.log('❌ System validation FAILED!');
  console.log('🔧 Please fix the issues above before deploying');
  process.exit(1);
}