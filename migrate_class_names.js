// MongoDB Script to Update Class Names from '3A' to 'AC_3_Tier'
// Run this in MongoDB shell or MongoDB Compass

// Connect to your database first:
// use rac

print("==== Starting Class Name Migration: 3A → AC_3_Tier ====\n");

// Update P_2 collection (Passengers)
print("Updating P_2 collection...");
const p2Result = db.P_2.updateMany(
    { Class: "3A" },
    { $set: { Class: "AC_3_Tier" } }
);
print(`✓ P_2 Updated: ${p2Result.modifiedCount} documents\n`);

// Update passengers collection if it exists
print("Updating passengers collection...");
const passengersResult = db.passengers.updateMany(
    { Class: "3A" },
    { $set: { Class: "AC_3_Tier" } }
);
print(`✓ passengers Updated: ${p2Result.modifiedCount} documents\n`);

// Update any coach configurations if they exist
print("Updating coach configurations...");
const coachResult = db.coaches.updateMany(
    { class: "3A" },
    { $set: { class: "AC_3_Tier" } }
);
print(`✓ coaches Updated: ${coachResult.modifiedCount} documents\n`);

print("==== Migration Complete ====");
print(`Total documents updated: ${p2Result.modifiedCount + passengersResult.modifiedCount + coachResult.modifiedCount}`);
