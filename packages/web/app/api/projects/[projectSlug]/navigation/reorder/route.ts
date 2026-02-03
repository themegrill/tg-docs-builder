import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/postgres";
import { checkProjectAccess } from "@/lib/project-helpers";
import { NextRequest } from "next/server";

/**
 * Reorder navigation sections and documents
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectSlug } = await params;
  const { structure } = await request.json();

  if (!structure || !structure.routes) {
    return Response.json(
      { error: "Invalid navigation structure" },
      { status: 400 }
    );
  }

  const sql = getDb();

  // Get project
  const [project] = await sql`
    SELECT id FROM projects WHERE slug = ${projectSlug}
  `;

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Check access
  const hasAccess = await checkProjectAccess(
    session.user.id,
    project.id,
    "editor"
  );
  if (!hasAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Update navigation structure with new order
    await sql`
      UPDATE navigation
      SET
        structure = ${sql.json(structure)},
        updated_by = ${session.user.id}
      WHERE project_id = ${project.id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating navigation order:", error);
    return Response.json(
      { error: "Failed to update navigation order" },
      { status: 500 }
    );
  }
}
