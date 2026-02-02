import { ContentManager } from "@/lib/db/ContentManager";
import { notFound } from "next/navigation";
import DocRendererClient from "@/components/docs/DocRendererClient";
import SectionPage from "@/components/docs/SectionPage";
import { getDb } from "@/lib/db/postgres";

export default async function ProjectDocPage({
  params,
}: {
  params: Promise<{ projectSlug: string; slug: string[] }>;
}) {
  const resolvedParams = await params;
  const { projectSlug, slug: slugArray } = resolvedParams;
  const slug = slugArray.join("/");

  console.log("[ProjectDocPage] Fetching document:", { projectSlug, slug });

  // Get project from slug
  const sql = getDb();
  const [project] = await sql`
    SELECT id, name, slug FROM projects WHERE slug = ${projectSlug}
  `;

  if (!project) {
    console.log("[ProjectDocPage] Project not found:", { projectSlug });
    notFound();
  }

  // Get document for this project
  const cm = ContentManager.create();
  const doc = await cm.getDoc(project.id, slug);

  // If no document found, check if it's a section without overview
  if (!doc) {
    // Check if this slug is a section (no "/" means top-level section)
    if (!slug.includes("/")) {
      // Get navigation to find section details
      const [nav] = await sql`
        SELECT structure FROM navigation WHERE project_id = ${project.id}
      `;

      if (nav?.structure?.routes) {
        const sectionPath = `/docs/${slug}`;
        const section = nav.structure.routes.find(
          (route: any) => route.path === sectionPath
        );

        if (section) {
          // Get child documents for this section
          const childDocs = section.children?.map((child: any) => ({
            title: child.title,
            slug: child.path.replace(/^\/docs\//, ""),
          })) || [];

          return (
            <SectionPage
              projectSlug={projectSlug}
              sectionSlug={slug}
              sectionTitle={section.title}
              childDocs={childDocs}
            />
          );
        }
      }
    }

    notFound();
  }

  return <DocRendererClient doc={doc} slug={slug} projectSlug={projectSlug} />;
}

export const dynamic = "force-dynamic";
