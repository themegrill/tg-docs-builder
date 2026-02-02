import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/postgres";
import { getProjectFromRequest } from "@/lib/project-helpers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const projectSlugParam = searchParams.get("projectSlug");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get project context
    const hostname = request.headers.get("host") || "localhost";
    const pathname = projectSlugParam
      ? `/projects/${projectSlugParam}/docs`
      : "/docs";

    const project = await getProjectFromRequest(hostname, pathname);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Search in database
    const sql = getDb();
    const searchTerm = `%${query.trim()}%`;

    const results = await sql`
      SELECT
        d.id,
        d.title,
        d.slug,
        d.description,
        d.blocks
      FROM documents d
      WHERE d.project_id = ${project.id}
        AND d.published = true
        AND (
          d.title ILIKE ${searchTerm}
          OR d.description ILIKE ${searchTerm}
          OR d.blocks::text ILIKE ${searchTerm}
        )
      ORDER BY
        CASE
          WHEN d.title ILIKE ${searchTerm} THEN 1
          WHEN d.description ILIKE ${searchTerm} THEN 2
          ELSE 3
        END,
        d.title ASC
      LIMIT 20
    `;

    // Format results
    const formattedResults = results.map((doc) => {
      // Extract section from slug (e.g., "getting-started/intro" -> "Getting Started")
      const slugParts = doc.slug.split("/");
      const section = slugParts.length > 1
        ? slugParts[0]
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : undefined;

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        section,
      };
    });

    return NextResponse.json({ results: formattedResults });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Search API] Error:", err.message);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
