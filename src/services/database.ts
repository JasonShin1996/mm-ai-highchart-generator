import { postJson } from './apiClient';
import type {
  DatabaseSearchResponse,
  DatabaseLoadResponse,
} from '@/types/database';

export type {
  DatabaseItem,
  DatabaseSearchResponse,
  TimeSeriesData,
  DatabaseLoadResponse,
} from '@/types/database';

export async function searchDatabase(
  query: string
): Promise<DatabaseSearchResponse> {
  return postJson<DatabaseSearchResponse>(
    '/api/search-database',
    { query },
    '搜尋失敗'
  );
}

export async function loadDatabaseData(
  statIds: string[]
): Promise<DatabaseLoadResponse> {
  return postJson<DatabaseLoadResponse>(
    '/api/load-database-data',
    { stat_ids: statIds },
    '數據載入失敗'
  );
}
