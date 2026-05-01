import { db } from "#/db";
import { sql } from "drizzle-orm";

type PathResolution =
  | { kind: "folder"; folderId: string | null; breadcrumbs: Breadcrumb[] }
  | { kind: "file"; folderId: string | null; fileNodeId: string; breadcrumbs: Breadcrumb[] }
  | { kind: "not-found" };

type Breadcrumb = { id: string; name: string };

/**
 * Resolve a URL path like `["campaigns", "maps"]` to a folder ID using a
 * recursive CTE. Returns breadcrumbs for each resolved segment.
 *
 * If the full path resolves to folders, returns `{ kind: "folder" }`.
 * If all-but-last resolve to folders and the last segment is a file in that
 * folder, returns `{ kind: "file" }`.
 * Otherwise returns `{ kind: "not-found" }`.
 */
export async function resolvePathToFolder(
  userId: string,
  pathSegments: string[],
): Promise<PathResolution> {
  // empty path = root folder
  if (pathSegments.length === 0) {
    return { kind: "folder", folderId: null, breadcrumbs: [] };
  }

  const pathJson = JSON.stringify(pathSegments);

  const result = await db.run(sql`
    WITH RECURSIVE
      path_walk (folder_id, depth) AS (
        SELECT
          nodes.id,
          0
        FROM
          nodes,
          json_each(${pathJson}) je
        WHERE
          je.key = 0
          AND nodes.parent_folder_id IS NULL
          AND nodes.owner_user_id = ${userId}
          AND nodes.deleted_time IS NULL
          AND nodes.folder_id IS NOT NULL
          AND nodes.name = je.value
        UNION ALL
        SELECT
          nodes.id,
          pw.depth + 1
        FROM
          path_walk pw
          JOIN json_each(${pathJson}) je ON je.key = pw.depth + 1
          JOIN nodes ON nodes.parent_folder_id = pw.folder_id
        WHERE
          nodes.owner_user_id = ${userId}
          AND nodes.deleted_time IS NULL
          AND nodes.folder_id IS NOT NULL
          AND nodes.name = je.value
      )
    SELECT * FROM path_walk
  `);

  const rows = result.results as Array<{ folder_id: string; depth: number }>;

  // all segments resolved as folders
  if (rows.length === pathSegments.length) {
    const breadcrumbs = rows.map((row, i) => ({
      id: row.folder_id,
      name: pathSegments[i],
    }));
    const lastRow = rows[rows.length - 1];
    return {
      kind: "folder",
      folderId: lastRow.folder_id,
      breadcrumbs,
    };
  }

  // all-but-last resolved — check if the last segment is a file
  if (rows.length === pathSegments.length - 1) {
    const parentFolderId = rows.length > 0 ? rows[rows.length - 1].folder_id : null;
    const fileName = pathSegments[pathSegments.length - 1];

    const fileNode = await db.query.nodes.findFirst({
      where: {
        parent_folder_id: parentFolderId ?? { isNull: true },
        owner_user_id: userId,
        deleted_time: { isNull: true },
        name: fileName,
        file_id: { isNotNull: true },
      },
    });

    if (fileNode) {
      const breadcrumbs = rows.map((row, i) => ({
        id: row.folder_id,
        name: pathSegments[i],
      }));
      return {
        kind: "file",
        folderId: parentFolderId,
        fileNodeId: fileNode.id,
        breadcrumbs,
      };
    }
  }

  return { kind: "not-found" };
}
