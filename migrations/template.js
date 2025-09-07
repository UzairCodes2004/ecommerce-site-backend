const mongoose = require("mongoose");

/**
 * Migration Template
 * Copy this file and rename it with a timestamp and description
 * Example: 20240115000000-add-admin-user.js
 */

module.exports = {
  /**
   * Run the migration
   */
  up: async () => {
    console.log("Running migration: Template migration");

    // Get MongoDB collections
    const db = mongoose.connection.db;

    try {
      // Example: Create a new collection
      // await db.createCollection('new_collection');

      // Example: Add new field to users collection
      // await db.collection('users').updateMany(
      //   {},
      //   { $set: { newField: 'defaultValue' } }
      // );

      // Example: Create indexes
      // await db.collection('products').createIndex({ name: 1 });

      // Example: Insert initial data
      // await db.collection('users').insertOne({
      //   name: 'Admin User',
      //   email: 'admin@email.com',
      //   isAdmin: true,
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // });

      console.log("Template migration completed successfully");
    } catch (error) {
      console.error("Template migration failed:", error);
      throw error;
    }
  },

  /**
   * Rollback the migration (optional)
   */
  down: async () => {
    console.log("Rolling back template migration");

    const db = mongoose.connection.db;

    try {
      // Example: Remove the collection we created
      // await db.collection('new_collection').drop();

      // Example: Remove the field we added
      // await db.collection('users').updateMany(
      //   {},
      //   { $unset: { newField: "" } }
      // );

      // Example: Remove the index
      // await db.collection('products').dropIndex('name_1');

      // Example: Remove the inserted data
      // await db.collection('users').deleteOne({ email: 'admin@email.com' });

      console.log("Template migration rolled back successfully");
    } catch (error) {
      console.error("Template rollback failed:", error);
      throw error;
    }
  },
};
