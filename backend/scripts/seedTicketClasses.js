const { MongoClient } = require('mongodb');
const fs = require('fs');

const CLASS_NAMES = {
    '2A': 'AC 2-Tier', '3A': 'AC 3-Tier', 'SL': 'Sleeper', 'GN': 'General',
    '1A': 'AC First Class', '2S': 'Second Sitting', 'CC': 'Chair Car',
    '3E': 'AC 3-Tier Economy', 'FC': 'First Class', 'EC': 'Executive Chair Car',
    'EA': 'Executive Anubhuti'
};

async function seed() {
    const classes = fs.readFileSync('C:\\Users\\prasa\\Documents\\RailWayData\\base\\assets\\train_info\\classes_gid.txt', 'utf-8').trim().split('\n');

    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('RailwayData');

    await db.collection('ticket_classes').drop().catch(() => { });

    const docs = classes.map((line, i) => {
        const code = line.trim();
        return { code, name: CLASS_NAMES[code] || code, order: i };
    });

    await db.collection('ticket_classes').insertMany(docs);
    console.log('✅ ticket_classes: ' + docs.length + ' documents inserted into RailwayData');
    docs.forEach(d => console.log('   ' + d.code + ' → ' + d.name));

    await client.close();
}

seed().catch(e => { console.error('❌', e); process.exit(1); });
