export const API_BASE_URL =
  (import.meta?.env?.VITE_API_BASE_URL || '').trim() ||
  'https://hrg7408-001-site1.jtempurl.com'
export const ENABLE_TABLE_CODE_UI =
  String(import.meta?.env?.VITE_ENABLE_TABLE_CODE_UI || '').toLowerCase() ===
  'true'
