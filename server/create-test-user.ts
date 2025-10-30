import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function createTestUser() {
  console.log("🔧 Creating test user...");

  const username = "teste";
  const password = "teste";
  const displayName = "Usuário de Teste";

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("ℹ️  User 'teste' already exists. Updating password...");

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user
      await db
        .update(users)
        .set({
          password: hashedPassword,
          displayName: displayName,
          roles: JSON.stringify(["superadmin", "admin", "campo", "transporte", "algodoeira"])
        })
        .where(eq(users.username, username));

      console.log("✅ User 'teste' updated successfully!");
    } else {
      console.log("➕ Creating new user 'teste'...");

      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the test user
      await db.insert(users).values({
        username: username,
        displayName: displayName,
        password: hashedPassword,
        roles: JSON.stringify(["superadmin", "admin", "campo", "transporte", "algodoeira"]), // All roles
      });

      console.log("✅ Test user created successfully!");
    }

    console.log("\n📋 Login credentials:");
    console.log("   Username: teste");
    console.log("   Password: teste");
    console.log("\n✨ You can now login with these credentials!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test user:", error);
    process.exit(1);
  }
}

createTestUser();
