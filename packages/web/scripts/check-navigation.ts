import { getDb } from "../lib/db/postgres";

async function checkNavigation() {
  const sql = getDb();

  try {
    // Get all projects
    const projects = await sql`SELECT id, name, slug FROM projects`;

    console.log("Found", projects.length, "project(s)\n");

    for (const project of projects) {
      console.log(`\n=== Project: ${project.name} (${project.slug}) ===`);

      // Get navigation for this project
      const [nav] = await sql`
        SELECT * FROM navigation
        WHERE project_id = ${project.id}
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (!nav) {
        console.log("  [ERROR] No navigation found");
        continue;
      }

      console.log("  [OK] Navigation found");
      console.log("  Structure:", JSON.stringify(nav.structure, null, 2));

      // Check if structure is valid
      if (!nav.structure) {
        console.log("  [ERROR] Structure is null/undefined");
      } else if (!nav.structure.routes) {
        console.log("  [ERROR] Routes array is missing");
      } else if (!Array.isArray(nav.structure.routes)) {
        console.log("  [ERROR] Routes is not an array");
      } else {
        console.log(`  [OK] Routes array has ${nav.structure.routes.length} section(s)`);
      }

      // Get all documents for this project
      const docs = await sql`
        SELECT slug, title FROM documents
        WHERE project_id = ${project.id}
        ORDER BY slug
      `;

      console.log(`  Documents in DB: ${docs.length}`);
      docs.forEach((doc) => {
        console.log(`    - ${doc.slug}: ${doc.title}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkNavigation();
