// backend/utils/envValidator.js
// Environment variable validation on startup
// Canonical names: MONGODB_URI, ALLOWED_ORIGINS, VAPID_EMAIL

/**
 * Deprecated → canonical name mappings.
 * If a deprecated name is set but the canonical one is not, the value
 * is copied and a warning is emitted.
 */
const deprecatedAliases = {
    'MONGO_URI':    'MONGODB_URI',
    'CORS_ORIGIN':  'ALLOWED_ORIGINS',
    'VAPID_SUBJECT': 'VAPID_EMAIL',
};

const requiredEnvVars = [
    // MongoDB (canonical: MONGODB_URI)
    { name: 'MONGODB_URI', default: 'mongodb://localhost:27017', required: false },

    // JWT
    { name: 'JWT_SECRET', default: null, required: true, sensitive: true },

    // Server
    { name: 'PORT', default: '5000', required: false },
    { name: 'NODE_ENV', default: 'development', required: false },

    // CORS (canonical: ALLOWED_ORIGINS)
    { name: 'ALLOWED_ORIGINS', default: 'http://localhost:3000,https://portals-of-rac.vercel.app', required: false }
];

const optionalEnvVars = [
    // Web Push (VAPID) — canonical: VAPID_EMAIL
    { name: 'VAPID_PUBLIC_KEY', default: null },
    { name: 'VAPID_PRIVATE_KEY', default: null },
    { name: 'VAPID_EMAIL', default: null },

    // Email
    { name: 'EMAIL_HOST', default: null },
    { name: 'EMAIL_PORT', default: null },
    { name: 'EMAIL_USER', default: null },
    { name: 'EMAIL_PASSWORD', default: null },

    // Logging
    { name: 'LOG_LEVEL', default: 'info' }
];

/**
 * Migrate deprecated env var names to their canonical equivalents.
 * Emits a warning for each deprecated name found.
 */
function migrateDeprecatedEnvVars() {
    const warnings = [];
    for (const [deprecated, canonical] of Object.entries(deprecatedAliases)) {
        if (process.env[deprecated] && !process.env[canonical]) {
            process.env[canonical] = process.env[deprecated];
            warnings.push(`⚠️  Deprecated env var "${deprecated}" — use "${canonical}" instead (auto-migrated)`);
        }
    }
    return warnings;
}

/**
 * Validate environment variables on startup
 * @returns {Object} validation result
 */
function validateEnv() {
    console.log('\n🔍 Validating environment variables...\n');

    const deprecationWarnings = migrateDeprecatedEnvVars();
    const errors = [];
    const warnings = [...deprecationWarnings];
    const loaded = [];

    // Check required variables
    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar.name];

        if (!value && envVar.required && !envVar.default) {
            errors.push(`❌ Missing required: ${envVar.name}`);
        } else if (!value && envVar.default) {
            process.env[envVar.name] = envVar.default;
            loaded.push(`   ✓ ${envVar.name} (default: ${envVar.sensitive ? '***' : envVar.default})`);
        } else if (value) {
            // Security warning for default JWT_SECRET
            if (envVar.name === 'JWT_SECRET' && value === 'your-secret-key-change-in-production') {
                warnings.push(`⚠️  ${envVar.name} is using default value - CHANGE IN PRODUCTION!`);
            }
            loaded.push(`   ✓ ${envVar.name} ${envVar.sensitive ? '(set)' : `= ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`}`);
        }
    }

    // Check optional variables
    for (const envVar of optionalEnvVars) {
        const value = process.env[envVar.name];

        if (!value && envVar.default) {
            process.env[envVar.name] = envVar.default;
        }

        if (value) {
            loaded.push(`   ✓ ${envVar.name} (optional)`);
        }
    }

    // Check VAPID keys completeness
    const vapidKeys = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL'];
    const vapidSet = vapidKeys.filter(k => process.env[k]);
    if (vapidSet.length > 0 && vapidSet.length < 3) {
        warnings.push(`⚠️  Incomplete VAPID configuration - need all 3 keys for push notifications`);
    }

    // Print results
    if (loaded.length > 0) {
        console.log('📋 Environment variables loaded:');
        loaded.forEach(l => console.log(l));
    }

    if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        warnings.forEach(w => console.log(`   ${w}`));
    }

    if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.forEach(e => console.log(`   ${e}`));
        console.log('\n');

        return {
            valid: false,
            errors,
            warnings
        };
    }

    console.log('\n✅ Environment validation passed!\n');

    return {
        valid: true,
        errors: [],
        warnings
    };
}

/**
 * Validate and exit if invalid (use at startup)
 */
function validateEnvOrExit() {
    const result = validateEnv();

    if (!result.valid) {
        console.error('❌ Environment validation failed! Please set required environment variables.');
        console.error('   See .env.example for required variables.\n');
        process.exit(1);
    }

    return result;
}

/**
 * Get environment info for debugging
 */
function getEnvInfo() {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        mongoUri: process.env.MONGODB_URI ? '(set)' : '(default)',
        jwtConfigured: !!process.env.JWT_SECRET,
        vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        emailConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER)
    };
}

module.exports = {
    validateEnv,
    validateEnvOrExit,
    getEnvInfo
};
