const productId = "visitoring";

export async function GET() {
  return Response.json(
    {
      schemaVersion: 1,
      productId,
      version: "1.0.0",
      roles: [
        {
          id: "project-viewer",
          name: "Project viewer",
          description: "View analytics for one project.",
          role: "viewer",
          scopeKinds: ["project"],
          actions: [`${productId}:project:read`],
        },
        {
          id: "project-admin",
          name: "Project administrator",
          description: "Manage access and settings for one project.",
          role: "admin",
          scopeKinds: ["project"],
          actions: [`${productId}:project:read`],
        },
        {
          id: "workspace-viewer",
          name: "Workspace viewer",
          description: "View analytics in a legacy workspace scope.",
          role: "viewer",
          scopeKinds: ["workspace"],
          actions: [`${productId}:workspace:read`],
        },
        {
          id: "workspace-admin",
          name: "Workspace administrator",
          description: "Manage access and settings in a legacy workspace scope.",
          role: "admin",
          scopeKinds: ["workspace"],
          actions: [`${productId}:workspace:read`],
        },
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
