/**
 * Security Integration Verification Script
 * Run this to verify all security features are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Integration Verification\n');

const checks = [];

// Check 1: Required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'src/models/AuditLog.js',
  'src/models/Room.js',
  'src/utils/auditLogger.js',
  'src/middleware/rateLimiter.js',
  'src/middleware/inputValidation.js',
  'src/controllers/authController.js',
  'src/controllers/roomController.js',
  'src/controllers/fileController.js',
  'src/routes/authRoutes.js',
  'src/routes/roomRoutes.js',
  'src/routes/fileRoutes.js',
  'src/routes/userRoutes.js',
  'src/routes/whiteboardRoutes.js',
  'src/socket/handlers.js'
];

let filesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    filesExist = false;
  }
});
checks.push({ name: 'Required files exist', passed: filesExist });

// Check 2: Dependencies installed
console.log('\n📦 Checking dependencies...');
const packageJson = require('./package.json');
const requiredDeps = ['joi', 'nanoid', 'express-rate-limit', 'bcryptjs', 'helmet', 'express-mongo-sanitize'];

let depsInstalled = true;
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`  ❌ ${dep} - NOT INSTALLED`);
    depsInstalled = false;
  }
});
checks.push({ name: 'Dependencies installed', passed: depsInstalled });

// Check 3: Environment variables
console.log('\n🔐 Checking environment configuration...');
require('dotenv').config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL'
];

let envConfigured = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`  ✅ ${envVar} - configured`);
  } else {
    console.log(`  ⚠️  ${envVar} - NOT SET`);
    envConfigured = false;
  }
});
checks.push({ name: 'Environment variables', passed: envConfigured });

// Check 4: Verify imports
console.log('\n🔍 Checking module imports...');
let importsValid = true;

try {
  require('./src/models/AuditLog');
  console.log('  ✅ AuditLog model');
} catch (e) {
  console.log('  ❌ AuditLog model - ERROR:', e.message);
  importsValid = false;
}

try {
  require('./src/utils/auditLogger');
  console.log('  ✅ auditLogger utility');
} catch (e) {
  console.log('  ❌ auditLogger utility - ERROR:', e.message);
  importsValid = false;
}

try {
  require('./src/middleware/rateLimiter');
  console.log('  ✅ rateLimiter middleware');
} catch (e) {
  console.log('  ❌ rateLimiter middleware - ERROR:', e.message);
  importsValid = false;
}

try {
  require('./src/middleware/inputValidation');
  console.log('  ✅ inputValidation middleware');
} catch (e) {
  console.log('  ❌ inputValidation middleware - ERROR:', e.message);
  importsValid = false;
}

try {
  require('./src/models/Room');
  console.log('  ✅ Room model (with security features)');
} catch (e) {
  console.log('  ❌ Room model - ERROR:', e.message);
  importsValid = false;
}

checks.push({ name: 'Module imports', passed: importsValid });

// Check 5: Verify Room model methods
console.log('\n🏠 Checking Room model security methods...');
let roomMethodsExist = true;

try {
  const Room = require('./src/models/Room');
  const requiredMethods = [
    'generateRoomId',
    'comparePassword',
    'isHost',
    'isModerator',
    'isKicked',
    'addToWaitingRoom',
    'approveWaitingUser',
    'kickUser',
    'muteAll',
    'unmuteAll'
  ];

  requiredMethods.forEach(method => {
    if (typeof Room[method] === 'function' || typeof Room.prototype[method] === 'function') {
      console.log(`  ✅ ${method}`);
    } else {
      console.log(`  ❌ ${method} - MISSING`);
      roomMethodsExist = false;
    }
  });
} catch (e) {
  console.log('  ❌ Could not verify Room methods:', e.message);
  roomMethodsExist = false;
}

checks.push({ name: 'Room security methods', passed: roomMethodsExist });

// Check 6: Verify validation schemas
console.log('\n✅ Checking validation schemas...');
let schemasExist = true;

try {
  const { schemas } = require('./src/middleware/inputValidation');
  const requiredSchemas = [
    'register',
    'login',
    'forgotPassword',
    'resetPassword',
    'changePassword',
    'createRoom',
    'updateRoom',
    'joinRoom',
    'sendMessage',
    'updateProfile'
  ];

  requiredSchemas.forEach(schema => {
    if (schemas[schema]) {
      console.log(`  ✅ ${schema}`);
    } else {
      console.log(`  ❌ ${schema} - MISSING`);
      schemasExist = false;
    }
  });
} catch (e) {
  console.log('  ❌ Could not verify schemas:', e.message);
  schemasExist = false;
}

checks.push({ name: 'Validation schemas', passed: schemasExist });

// Check 7: Verify rate limiters
console.log('\n⏱️  Checking rate limiters...');
let limitersExist = true;

try {
  const rateLimiter = require('./src/middleware/rateLimiter');
  const requiredLimiters = [
    'apiLimiter',
    'authLimiter',
    'loginLimiter',
    'registerLimiter',
    'passwordResetLimiter',
    'fileUploadLimiter',
    'roomCreationLimiter'
  ];

  requiredLimiters.forEach(limiter => {
    if (rateLimiter[limiter]) {
      console.log(`  ✅ ${limiter}`);
    } else {
      console.log(`  ❌ ${limiter} - MISSING`);
      limitersExist = false;
    }
  });
} catch (e) {
  console.log('  ❌ Could not verify limiters:', e.message);
  limitersExist = false;
}

checks.push({ name: 'Rate limiters', passed: limitersExist });

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY\n');

const passed = checks.filter(c => c.passed).length;
const total = checks.length;

checks.forEach(check => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
});

console.log('\n' + '='.repeat(50));
console.log(`Result: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('\n🎉 All security features are properly integrated!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install (if not done)');
  console.log('2. Configure .env file with your settings');
  console.log('3. Start MongoDB');
  console.log('4. Run: npm run dev');
  console.log('\nSee SECURITY_SETUP.md for detailed configuration guide.');
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.');
  console.log('See SECURITY_SETUP.md for troubleshooting.');
}

console.log('\n');
process.exit(passed === total ? 0 : 1);
