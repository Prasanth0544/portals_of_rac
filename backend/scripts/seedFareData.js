/**
 * Seed Script: Import Railway Fare Data into MongoDB
 * 
 * Reads mankatha_part_2 (charges) and mankatha_vari (tax rules)
 * from the extracted railway data and imports into RailwayData database.
 * 
 * Collections created:
 *   - catering_charges   (food/catering charges per class & train type)
 *   - convenience_fees    (booking convenience fees per class & train type)
 *   - service_tax         (tax applicability rules)
 * 
 * Usage: node scripts/seedFareData.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// ── Config ──
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'RailwayData';

// ── Source files ──
const DATA_DIR = path.resolve('C:\\Users\\prasa\\Documents\\RailWayData\\base\\assets');
const CHARGES_FILE = path.join(DATA_DIR, 'mankatha_part_2');
const TAX_FILE = path.join(DATA_DIR, 'mankatha_vari');

// ── Code Mappings ──
const CLASS_MAP = {
    0: { code: '1A', name: 'AC First Class' },
    1: { code: '2A', name: 'AC 2-Tier' },
    2: { code: '3A', name: 'AC 3-Tier' },
    3: { code: 'SL', name: 'Sleeper' },
    4: { code: 'GN', name: 'General' },
    5: { code: '2S', name: 'Second Sitting' },
    6: { code: 'CC', name: 'Chair Car' },
    7: { code: '3E', name: 'AC 3-Tier Economy' },
    8: { code: 'FC', name: 'First Class' },
    9: { code: 'EC', name: 'Executive Chair Car' },
    10: { code: 'EA', name: 'Executive Anubhuti' },
    11: { code: 'HA', name: 'AC First (Rajdhani/Premium)' },
};

const TRAIN_TYPE_MAP = {
    0: 'Rajdhani Express',
    1: 'Shatabdi Express',
    3: 'Duronto Express',
    4: 'Jan Shatabdi',
    5: 'Garib Rath',
    6: 'Tejas Express',
    8: 'Vande Bharat',
    9: 'Humsafar Express',
    10: 'Antyodaya Express',
    11: 'Mahamana Express',
    12: 'Superfast Express',
};

async function seed() {
    console.log('🚂 Railway Fare Data Seeder');
    console.log('═'.repeat(50));

    // Read source JSON files
    console.log(`\n📂 Reading source files...`);
    const chargesRaw = JSON.parse(fs.readFileSync(CHARGES_FILE, 'utf-8'));
    const taxRaw = JSON.parse(fs.readFileSync(TAX_FILE, 'utf-8'));
    console.log(`   ✅ mankatha_part_2: ${chargesRaw.other_charges.length} charge entries`);
    console.log(`   ✅ mankatha_vari: ${taxRaw.service_tax.length} tax rules`);

    // Split charges by charge_type
    const cateringCharges = [];
    const convenienceFees = [];

    for (const entry of chargesRaw.other_charges) {
        const classInfo = CLASS_MAP[entry.class_type] || { code: `TYPE_${entry.class_type}`, name: `Unknown Class ${entry.class_type}` };
        const trainType = TRAIN_TYPE_MAP[entry.train_type] || `Unknown Train Type ${entry.train_type}`;

        const doc = {
            class_code: classInfo.code,
            class_name: classInfo.name,
            class_type_id: entry.class_type,
            train_type: trainType,
            train_type_id: entry.train_type,
            charge: entry.charge,
            currency: 'INR',
        };

        if (entry.charge_type === 0) {
            cateringCharges.push({ ...doc, charge_category: 'Catering' });
        } else if (entry.charge_type === 1) {
            convenienceFees.push({ ...doc, charge_category: 'Convenience Fee' });
        }
    }

    // Map service tax rules
    const serviceTaxRules = taxRaw.service_tax.map(entry => {
        const classInfo = CLASS_MAP[entry.class_type] || { code: `TYPE_${entry.class_type}`, name: `Unknown Class ${entry.class_type}` };
        const trainType = TRAIN_TYPE_MAP[entry.train_type] || `Unknown Train Type ${entry.train_type}`;

        return {
            class_code: classInfo.code,
            class_name: classInfo.name,
            class_type_id: entry.class_type,
            train_type: trainType,
            train_type_id: entry.train_type,
            tax_applicable: entry.tax,
        };
    });

    // Connect to MongoDB
    console.log(`\n🔗 Connecting to ${MONGO_URI}...`);
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`   ✅ Connected to database: ${DB_NAME}`);

    // Drop existing collections (idempotent)
    console.log(`\n🗑️  Dropping existing collections...`);
    await db.collection('catering_charges').drop().catch(() => { });
    await db.collection('convenience_fees').drop().catch(() => { });
    await db.collection('service_tax').drop().catch(() => { });

    // Insert catering charges
    if (cateringCharges.length > 0) {
        await db.collection('catering_charges').insertMany(cateringCharges);
    }
    console.log(`   ✅ catering_charges: ${cateringCharges.length} documents inserted`);

    // Insert convenience fees
    if (convenienceFees.length > 0) {
        await db.collection('convenience_fees').insertMany(convenienceFees);
    }
    console.log(`   ✅ convenience_fees: ${convenienceFees.length} documents inserted`);

    // Insert service tax rules
    if (serviceTaxRules.length > 0) {
        await db.collection('service_tax').insertMany(serviceTaxRules);
    }
    console.log(`   ✅ service_tax: ${serviceTaxRules.length} documents inserted`);

    // Print summary
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📊 Summary — Database: ${DB_NAME}`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`   📁 catering_charges:  ${cateringCharges.length} docs`);
    console.log(`   📁 convenience_fees:  ${convenienceFees.length} docs`);
    console.log(`   📁 service_tax:       ${serviceTaxRules.length} docs`);
    console.log(`${'═'.repeat(50)}`);

    // Print sample documents
    console.log(`\n📋 Sample catering charge:`);
    console.log(JSON.stringify(cateringCharges[0], null, 2));
    console.log(`\n📋 Sample convenience fee:`);
    console.log(JSON.stringify(convenienceFees[0], null, 2));
    console.log(`\n📋 Sample service tax rule:`);
    console.log(JSON.stringify(serviceTaxRules[0], null, 2));

    await client.close();
    console.log(`\n✅ Done! All fare data imported to ${DB_NAME}.`);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
