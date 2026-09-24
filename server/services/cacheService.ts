import { db } from '../db/database.ts';

export interface LayoutCacheRow {
  id: string;
  host_user_id: string;
  graph_version: number;
  algorithm_version: string;
  structure_class: string;
  layout_data: string;
  quality_metrics: string;
  created_at: string;
}

export function getCachedLayout(
  hostUserId: string,
  graphVersion: number,
  algorithmVersion: string
): LayoutCacheRow | null {
  const stmt = db.prepare(`
    SELECT * FROM layout_cache
    WHERE host_user_id = ? AND graph_version = ? AND algorithm_version = ?
  `);
  const row = stmt.get(hostUserId, graphVersion, algorithmVersion) as LayoutCacheRow | undefined;
  return row || null;
}

export function saveCachedLayout(
  hostUserId: string,
  graphVersion: number,
  algorithmVersion: string,
  structureClass: string,
  layoutData: any,
  qualityMetrics: any
): void {
  const id = `cache-${hostUserId}-${graphVersion}-${algorithmVersion}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO layout_cache (
      id, host_user_id, graph_version, algorithm_version, structure_class, layout_data, quality_metrics, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(host_user_id, graph_version, algorithm_version) DO UPDATE SET
      structure_class = excluded.structure_class,
      layout_data = excluded.layout_data,
      quality_metrics = excluded.quality_metrics,
      created_at = excluded.created_at
  `);

  stmt.run(
    id,
    hostUserId,
    graphVersion,
    algorithmVersion,
    structureClass,
    JSON.stringify(layoutData),
    JSON.stringify(qualityMetrics),
    now
  );
}

export function invalidateUserLayoutCache(hostUserId: string): void {
  const stmt = db.prepare('DELETE FROM layout_cache WHERE host_user_id = ?');
  stmt.run(hostUserId);
}
