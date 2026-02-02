import { getDb } from "../lib/db/postgres";

async function fixNavigation() {
  const sql = getDb();

  try {
    // Get all navigations
    const navs = await sql`SELECT id, project_id, structure FROM navigation`;

    console.log(`Found ${navs.length} navigation record(s)\n`);

    for (const nav of navs) {
      let structure = nav.structure;

      // Check if structure is a string (double-encoded)
      if (typeof structure === "string") {
        console.log(`[ERROR] Navigation ${nav.id} is double-encoded as string`);
        console.log("   Fixing...");

        try {
          // Parse the string to get the actual object
          structure = JSON.parse(structure);

          // Update the database with the proper structure
          await sql`
            UPDATE navigation
            SET structure = ${sql.json(structure)}
            WHERE id = ${nav.id}
          `;

          console.log(`   [OK] Fixed navigation ${nav.id}`);
        } catch (error) {
          console.error(`   [ERROR] Failed to fix navigation ${nav.id}:`, error);
        }
      } else if (!structure.routes) {
        console.log(`[WARN] Navigation ${nav.id} has no routes array`);
        structure.routes = [];

        await sql`
          UPDATE navigation
          SET structure = ${sql.json(structure)}
          WHERE id = ${nav.id}
        `;

        console.log(`   [OK] Added empty routes array`);
      } else {
        console.log(`[OK] Navigation ${nav.id} is OK (${structure.routes.length} sections)`);
      }
    }

    console.log("\n[OK] All navigation records checked and fixed!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

fixNavigation();
