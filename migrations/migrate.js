const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for migrations...");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Run all migrations
const runMigrations = async () => {
  try {
    await connectDB();

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const files = fs
      .readdirSync(migrationsDir)
      .filter(
        (file) =>
          file.endsWith(".js") &&
          file !== "migrate.js" &&
          file !== "template.js"
      )
      .sort(); // Run in alphabetical order

    console.log(`Found ${files.length} migration(s) to run...`);

    for (const file of files) {
      try {
        console.log(`\nRunning migration: ${file}...`);

        const migration = require(path.join(migrationsDir, file));
        await migration.up();

        console.log(`✅ ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error.message);
        // Continue with next migration despite error
      }
    }

    console.log("\n🎉 All migrations completed!");
    process.exit(0);
  } catch (error) {
    console.error("Migration runner error:", error);
    process.exit(1);
  }
};

// Rollback migrations (if needed)
const rollbackMigrations = async () => {
  try {
    await connectDB();

    const migrationsDir = path.join(__dirname);
    const files = fs
      .readdirSync(migrationsDir)
      .filter(
        (file) =>
          file.endsWith(".js") &&
          file !== "migrate.js" &&
          file !== "template.js"
      )
      .sort()
      .reverse(); // Rollback in reverse order

    console.log(`Found ${files.length} migration(s) to rollback...`);

    for (const file of files) {
      try {
        console.log(`\nRolling back migration: ${file}...`);

        const migration = require(path.join(migrationsDir, file));
        if (typeof migration.down === "function") {
          await migration.down();
          console.log(`✅ ${file} rolled back successfully`);
        } else {
          console.log(`⚠️  ${file} has no rollback function`);
        }
      } catch (error) {
        console.error(`❌ Error rolling back ${file}:`, error.message);
      }
    }

    console.log("\n🎉 Rollback completed!");
    process.exit(0);
  } catch (error) {
    console.error("Rollback error:", error);
    process.exit(1);
  }
};

// Command line interface
const command = process.argv[2];

if (command === "up") {
  runMigrations();
} else if (command === "down") {
  rollbackMigrations();
} else {
  console.log(`
Usage: node migrations/migrate.js [command]

Commands:
  up      Run all migrations
  down    Rollback all migrations

Examples:
  node migrations/migrate.js up
  node migrations/migrate.js down
  `);
  process.exit(1);
}
