/**
 * @deprecated Импортируйте из `@/utils/diaryCovers`, `@/utils/diaryInteriors`
 * или `@/utils/diaryCoverFullPages` — barrel тянет лишнее в один бандл.
 */
export type { DiaryCover } from '@/utils/diaryCovers';
export {
  extractSkuFromFilename,
  getAllDiaryCovers,
  getDiaryCoverById,
  getDiaryCoverBySku,
} from '@/utils/diaryCovers';
