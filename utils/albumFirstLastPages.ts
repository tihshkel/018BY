import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { getPregnancyCoverPdf } from './coverPdfMapping';
import { getCoverForExport } from './coverMapping';
import { FAMILY_COVER_DESIGNS } from './familyCoverDesigns';
import { githubRawFileUrl } from './githubRawAssets';

const GITHUB_REPO_BASE = 'https://raw.githubusercontent.com/tihshkel/018BY/5437a89c83e07ab0f8b3c5dfecd679f2cda85f94';

/** Декоративная финальная страница (форзац) для A5 / электронной версии. */
const PREGNANCY_A5_CLOSING_PAGE_MODULES: Record<string, any | Record<string, any>> = {
  DB1: (() => {
    try { return require('@/albums/pregnant/A5/last_str_DB1_page_001.png'); } catch { return null; }
  })(),
  DB2: (() => {
    try { return require('@/albums/pregnant/A5/last_str_DB2_page_001.png'); } catch { return null; }
  })(),
  DB3: {
    '002': (() => {
      try { return require('@/albums/pregnant/A5/last_str_DB3_page_002.png'); } catch { return null; }
    })(),
    '003': (() => {
      try { return require('@/albums/pregnant/A5/last_str_DB3_page_003.png'); } catch { return null; }
    })(),
    '004': (() => {
      try { return require('@/albums/pregnant/A5/last_str_DB3_page_004.png'); } catch { return null; }
    })(),
  },
  DB4: (() => {
    try { return require('@/albums/pregnant/A5/last_str_DB4_page_001.png'); } catch { return null; }
  })(),
  DB5: {
    '002': (() => {
      try { return require('@/albums/pregnant/A5/last_str_DB5_page_002.png'); } catch { return null; }
    })(),
    '003': (() => {
      try { return require('@/albums/pregnant/A5/last_str_DB5_page_003.png'); } catch { return null; }
    })(),
    '004': (() => {
      try { return require('@/albums/pregnant/A5/last_str_DB5_page_004.png'); } catch { return null; }
    })(),
  },
};

const PREGNANCY_A5_CLOSING_PAGE_URLS: Record<string, string | Record<string, string>> = {
  DB1: 'albums/pregnant/A5/last_str_DB1_page_001.png',
  DB2: 'albums/pregnant/A5/last_str_DB2_page_001.png',
  DB3: {
    '002': 'albums/pregnant/A5/last_str_DB3_page_002.png',
    '003': 'albums/pregnant/A5/last_str_DB3_page_003.png',
    '004': 'albums/pregnant/A5/last_str_DB3_page_004.png',
  },
  DB4: 'albums/pregnant/A5/last_str_DB4_page_001.png',
  DB5: {
    '002': 'albums/pregnant/A5/last_str_DB5_page_002.png',
    '003': 'albums/pregnant/A5/last_str_DB5_page_003.png',
    '004': 'albums/pregnant/A5/last_str_DB5_page_004.png',
  },
};

function resolvePregnancyA5ClosingPageSuffix(dbNumber: string, albumId: string | null): string {
  if (dbNumber !== 'DB3' && dbNumber !== 'DB5') {
    return '001';
  }

  const normalizedId = (albumId || '').toLowerCase();
  if (normalizedId.includes('_soft') || normalizedId.endsWith('_a5')) {
    return '003';
  }

  return '002';
}

function resolvePregnancyA5ClosingPageModule(dbNumber: string, albumId: string | null): any | null {
  const entry = PREGNANCY_A5_CLOSING_PAGE_MODULES[dbNumber];
  if (!entry) {
    return null;
  }

  if (typeof entry === 'object' && entry !== null && '002' in entry) {
    const suffix = resolvePregnancyA5ClosingPageSuffix(dbNumber, albumId);
    return entry[suffix] ?? entry['002'] ?? null;
  }

  return entry;
}

function resolvePregnancyA5ClosingPageUrl(dbNumber: string, albumId: string | null): string | null {
  const entry = PREGNANCY_A5_CLOSING_PAGE_URLS[dbNumber];
  if (!entry) {
    return null;
  }

  if (typeof entry === 'object') {
    const suffix = resolvePregnancyA5ClosingPageSuffix(dbNumber, albumId);
    return entry[suffix] ?? entry['002'] ?? null;
  }

  return entry;
}

async function loadPregnancyA5ClosingPageUri(albumId: string | null): Promise<string | null> {
  const dbNumber = getPregnancyCoverPdf(albumId);
  if (!dbNumber) {
    return null;
  }

  const closingModule = resolvePregnancyA5ClosingPageModule(dbNumber, albumId);
  if (closingModule) {
    try {
      const asset = Asset.fromModule(closingModule);
      await asset.downloadAsync();
      return asset.localUri || asset.uri || null;
    } catch (error) {
      console.warn(`[First/Last Pages] Локальная финальная страница ${dbNumber} недоступна:`, error);
    }
  }

  const closingUrl = resolvePregnancyA5ClosingPageUrl(dbNumber, albumId);
  if (!closingUrl) {
    return null;
  }

  const fileName = closingUrl.split('/').pop() || 'closing_page.png';
  return downloadImageToCache(githubRawFileUrl(closingUrl), `${dbNumber}_closing_${fileName}`);
}

const PREGNANCY_FIRST_LAST_PAGES_URLS: Record<string, { firstPage: string | null; lastPages: string[] }> = {
  'DB1_hard': {
    firstPage: 'albums/pregnant/180х240/1 стр/1 стр._DB1_60стр/page_001.png',
    lastPages: ['albums/pregnant/180х240/последняя стр/последняя стр._DB1_60стр/page_001.png'],
  },
  'DB1_soft': {
    firstPage: 'albums/pregnant/А5/1 стр/1 стр._DB1_А5/page_001.png',
    lastPages: ['albums/pregnant/А5/последняя стр/последняя стр._DB1_А5/page_001.png'],
  },
  'DB2_hard': {
    firstPage: 'albums/pregnant/180х240/1 стр/1 стр._DB2_60стр/page_001.png',
    lastPages: ['albums/pregnant/180х240/последняя стр/последняя стр._DB2_60стр/page_001.png'],
  },
  'DB2_soft': {
    firstPage: 'albums/pregnant/А5/1 стр/1 стр._DB2_А5/page_001.png',
    lastPages: ['albums/pregnant/А5/последняя стр/последняя стр._DB2_А5/page_001.png'],
  },
  'DB3_hard': {
    firstPage: 'albums/pregnant/180х240/1 стр/1 стр._DB3_60стр/page_001.png',
    lastPages: ['albums/pregnant/180х240/последняя стр/последняя стр._DB3_60стр/page_001.png'],
  },
  'DB3_soft': {
    firstPage: 'albums/pregnant/А5/1 стр/1 стр._DB3_А5/page_001.png',
    lastPages: [
      'albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_001.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_002.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_003.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_004.png',
    ],
  },
  'DB4_hard': {
    firstPage: 'albums/pregnant/180х240/1 стр/1 стр._DB4_60стр/page_001.png',
    lastPages: ['albums/pregnant/180х240/последняя стр/последняя стр._DB4_60стр/page_001.png'],
  },
  'DB4_soft': {
    firstPage: 'albums/pregnant/А5/1 стр/1 стр._DB4_А5/page_001.png',
    lastPages: [
      'albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_001.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_002.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_003.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_004.png',
    ],
  },
  'DB5_hard': {
    firstPage: 'albums/pregnant/180х240/1 стр/1 стр._DB5_60стр/page_001.png',
    lastPages: ['albums/pregnant/180х240/последняя стр/последняя стр._DB5_60стр/page_001.png'],
  },
  'DB5_soft': {
    firstPage: 'albums/pregnant/А5/1 стр/1 стр._DB5_А5/page_001.png',
    lastPages: [
      'albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_001.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_002.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_003.png',
      'albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_004.png',
    ],
  },
  'DB6_hard': {
    firstPage: 'albums/pregnant/180х240/1 стр/1 стр._DB6_60стр/page_001.png',
    lastPages: ['albums/pregnant/180х240/последняя стр/последняя стр._DB6_60стр/page_001.png'],
  },
  'DB6_soft': {
    firstPage: 'albums/pregnant/А5/1 стр/1 стр._DB6_А5/page_001.png',
    lastPages: ['albums/pregnant/А5/последняя стр/последняя стр._DB6_А5/page_001.png'],
  },
};

async function downloadImageToCache(url: string, cacheFileName: string): Promise<string | null> {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}cover_pages/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
    const localPath = `${cacheDir}${cacheFileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      return localPath;
    }
    const downloadResult = await FileSystem.downloadAsync(url, localPath);
    if (downloadResult.status === 200) {
      return localPath;
    }
    return null;
  } catch (error) {
    console.warn(`[Download Image] Error downloading ${url}:`, error);
    return null;
  }
}

/**
 * Извлекает номер DFA из albumId
 * @param albumId - ID альбома (например, 'dfa_5', 'dfa_7')
 * @returns Номер DFA в формате 'DFA5', 'DFA7' или null
 */
export function extractDFANumber(albumId: string): string | null {
  if (!albumId) return null;
  
  const normalizedId = albumId.toLowerCase();
  
  // Извлекаем номер из формата dfa_5, dfa_7 и т.д.
  const match = normalizedId.match(/dfa[_\s]?(\d+)/);
  if (match && match[1]) {
    const number = match[1];
    // Для dfa_43 возвращаем dfa43 (в нижнем регистре)
    if (number === '43') {
      return 'dfa43';
    }
    return `DFA${number}`;
  }
  
  return null;
}

/**
 * Статический маппинг require() модулей для первой и последней страницы альбомов детей
 */
const KIDS_FIRST_LAST_PAGES_MAPPING: Record<string, { firstPage: any | null; lastPage: any | null }> = {
  'DFA5': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA5/first_page.png'),
        lastPage: require('@/albums/kids/DFA5/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA7': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA7/first_page.png'),
        lastPage: require('@/albums/kids/DFA7/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA8': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA8/first_page.png'),
        lastPage: require('@/albums/kids/DFA8/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA9': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA9/first_page.png'),
        lastPage: require('@/albums/kids/DFA9/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA12': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA12/first_page.png'),
        lastPage: require('@/albums/kids/DFA12/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA15': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA15/first_page.png'),
        lastPage: require('@/albums/kids/DFA15/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA16': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA16/first_page.png'),
        lastPage: require('@/albums/kids/DFA16/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA19': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA19/first_page.png'),
        lastPage: require('@/albums/kids/DFA19/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA21': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA21/first_page.png'),
        lastPage: require('@/albums/kids/DFA21/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA22': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA22/first_page.png'),
        lastPage: require('@/albums/kids/DFA22/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA23': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA23/first_page.png'),
        lastPage: require('@/albums/kids/DFA23/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA24': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA24/first_page.png'),
        lastPage: require('@/albums/kids/DFA24/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA25': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA25/first_page.png'),
        lastPage: require('@/albums/kids/DFA25/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA26': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA26/first_page.png'),
        lastPage: require('@/albums/kids/DFA26/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA27': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA27/first_page.png'),
        lastPage: require('@/albums/kids/DFA27/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA28': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA28/first_page.png'),
        lastPage: require('@/albums/kids/DFA28/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA29': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA29/first_page.png'),
        lastPage: require('@/albums/kids/DFA29/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA30': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA30/first_page.png'),
        lastPage: require('@/albums/kids/DFA30/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA31': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA31/first_page.png'),
        lastPage: require('@/albums/kids/DFA31/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'dfa43': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA43/first_page.png'),
        lastPage: require('@/albums/kids/DFA43/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA46': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA46/first_page.png'),
        lastPage: require('@/albums/kids/DFA46/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA47': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA47/first_page.png'),
        lastPage: require('@/albums/kids/DFA47/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA50': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA50/first_page.png'),
        lastPage: require('@/albums/kids/DFA50/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA52': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA52/first_page.png'),
        lastPage: require('@/albums/kids/DFA52/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA53': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA53/first_page.png'),
        lastPage: require('@/albums/kids/DFA53/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA59': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA59/first_page.png'),
        lastPage: require('@/albums/kids/DFA59/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA60': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA60/first_page.png'),
        lastPage: require('@/albums/kids/DFA60/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA71': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA71/first_page.png'),
        lastPage: require('@/albums/kids/DFA71/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA72': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA72/first_page.png'),
        lastPage: require('@/albums/kids/DFA72/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA74': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA74/first_page.png'),
        lastPage: require('@/albums/kids/DFA74/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA205': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA205/first_page.png'),
        lastPage: require('@/albums/kids/DFA205/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA206': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA206/first_page.png'),
        lastPage: require('@/albums/kids/DFA206/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA207': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA207/first_page.png'),
        lastPage: require('@/albums/kids/DFA207/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA208': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA208/first_page.png'),
        lastPage: require('@/albums/kids/DFA208/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA301': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA301/first_page.png'),
        lastPage: require('@/albums/kids/DFA301/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA302': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA302/first_page.png'),
        lastPage: require('@/albums/kids/DFA302/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA304': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA304/first_page.png'),
        lastPage: require('@/albums/kids/DFA304/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA305': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA305/first_page.png'),
        lastPage: require('@/albums/kids/DFA305/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA306': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA306/first_page.png'),
        lastPage: require('@/albums/kids/DFA306/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA307': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA307/first_page.png'),
        lastPage: require('@/albums/kids/DFA307/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
  'DFA309': (() => {
    try {
      return {
        firstPage: require('@/albums/kids/DFA309/first_page.png'),
        lastPage: require('@/albums/kids/DFA309/last_page.png'),
      };
    } catch {
      return { firstPage: null, lastPage: null };
    }
  })(),
};

/**
 * Статический маппинг require() модулей для первой и последней страницы альбомов беременности
 * Ключ: 'DB{N}_{format}' где format = 'hard' или 'soft'
 */
const PREGNANCY_FIRST_LAST_PAGES_MAPPING: Record<string, { firstPage: any | null; lastPages: any[] }> = {
  // DB1 - hard (180х240)
  'DB1_hard': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/180х240/1 стр/1 стр._DB1_60стр/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/180х240/последняя стр/последняя стр._DB1_60стр/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB1 - soft (А5)
  'DB1_soft': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/А5/1 стр/1 стр._DB1_А5/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB1_А5/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB2 - hard
  'DB2_hard': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/180х240/1 стр/1 стр._DB2_60стр/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/180х240/последняя стр/последняя стр._DB2_60стр/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB2 - soft
  'DB2_soft': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/А5/1 стр/1 стр._DB2_А5/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB2_А5/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB3 - hard
  'DB3_hard': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/180х240/1 стр/1 стр._DB3_60стр/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/180х240/последняя стр/последняя стр._DB3_60стр/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB3 - soft (может быть несколько страниц)
  'DB3_soft': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/А5/1 стр/1 стр._DB3_А5/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_001.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_002.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_003.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB3_А5/page_004.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB4 - hard
  'DB4_hard': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/180х240/1 стр/1 стр._DB4_60стр/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/180х240/последняя стр/последняя стр._DB4_60стр/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB4 - soft (может быть несколько страниц)
  'DB4_soft': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/А5/1 стр/1 стр._DB4_А5/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_001.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_002.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_003.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB4_А5/page_004.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB5 - hard
  'DB5_hard': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/180х240/1 стр/1 стр._DB5_60стр/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/180х240/последняя стр/последняя стр._DB5_60стр/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB5 - soft (может быть несколько страниц)
  'DB5_soft': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/А5/1 стр/1 стр._DB5_А5/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_001.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_002.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_003.png')); } catch {}
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB5_А5/page_004.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB6 - hard
  'DB6_hard': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/180х240/1 стр/1 стр._DB6_60стр/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/180х240/последняя стр/последняя стр._DB6_60стр/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
  // DB6 - soft (если есть)
  'DB6_soft': (() => {
    const firstPage = (() => {
      try { return require('@/albums/pregnant/А5/1 стр/1 стр._DB6_А5/page_001.png'); } catch { return null; }
    })();
    const lastPages = (() => {
      const pages: any[] = [];
      try { pages.push(require('@/albums/pregnant/А5/последняя стр/последняя стр._DB6_А5/page_001.png')); } catch {}
      return pages;
    })();
    return { firstPage, lastPages };
  })(),
};

/**
 * Получает изображение first_page.png для альбома детей (синхронная версия для select-cover)
 * @param albumId - ID альбома (например, 'dfa_5', 'dfa_7')
 * @returns require() модуль изображения first_page.png или null
 */
export function getKidsFirstPageImage(albumId: string): any | null {
  const dfaNumber = extractDFANumber(albumId);
  if (!dfaNumber) {
    console.warn(`[getKidsFirstPageImage] Не удалось извлечь номер DFA из albumId: ${albumId}`);
    return null;
  }
  // Ищем в маппинге - сначала по оригинальному значению, потом по верхнему/нижнему регистру
  // (для dfa43 используется нижний регистр, для остальных - верхний)
  let mapping = KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber];
  if (!mapping) {
    mapping = KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber.toUpperCase()];
  }
  if (!mapping) {
    mapping = KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber.toLowerCase()];
  }
  if (!mapping || !mapping.firstPage) {
    console.warn(`[getKidsFirstPageImage] Не найдено изображение для DFA: ${dfaNumber}, albumId: ${albumId}`);
    return null;
  }
  return mapping.firstPage;
}

export function getKidsFirstLastPageModules(albumId: string): { firstPage: any | null; lastPage: any | null } {
  const dfaNumber = extractDFANumber(albumId);
  if (!dfaNumber) {
    console.warn(`[getKidsFirstLastPageModules] Не удалось извлечь номер DFA из albumId: ${albumId}`);
    return { firstPage: null, lastPage: null };
  }

  const mapping =
    KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber] ||
    KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber.toUpperCase()] ||
    KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber.toLowerCase()];

  return mapping || { firstPage: null, lastPage: null };
}

/**
 * Получает изображение page_001.png для альбома беременности (синхронная версия для select-cover)
 * @param albumId - ID альбома (например, 'pregnancy_60', 'pregnancy_db2')
 * @param formatType - Тип формата: 'hard' (180х240) или 'soft' (А5), по умолчанию 'hard'
 * @returns require() модуль изображения page_001.png или null
 */
export function getPregnancyFirstPageImage(albumId: string, formatType: 'hard' | 'soft' = 'hard'): any | null {
  const dbNumber = getPregnancyCoverPdf(albumId);
  if (!dbNumber) {
    console.warn(`[getPregnancyFirstPageImage] Не удалось получить номер DB для albumId: ${albumId}`);
    return null;
  }
  
  const mappingKey = `${dbNumber}_${formatType}`;
  const mapping = PREGNANCY_FIRST_LAST_PAGES_MAPPING[mappingKey];
  if (!mapping || !mapping.firstPage) {
    console.warn(`[getPregnancyFirstPageImage] Не найдено изображение для ${mappingKey}, albumId: ${albumId}`);
    return null;
  }
  
  return mapping.firstPage;
}

/**
 * Получает первую и последнюю страницу для альбома детей
 * @param albumId - ID альбома (например, 'dfa_5', 'dfa_7')
 * @param coverType - Тип обложки (не используется для kids, но оставлен для совместимости)
 * @returns Объект с URI первой и последней страницы или null
 */
export async function getKidsFirstLastPages(
  albumId: string | null,
  coverType: 'hard' | 'soft' = 'hard'
): Promise<{ firstPage: string | null; lastPage: string | null }> {
  if (!albumId) {
    return { firstPage: null, lastPage: null };
  }

  const dfaNumber = extractDFANumber(albumId);
  if (!dfaNumber) {
    console.warn(`[First/Last Pages] Не удалось извлечь номер DFA из albumId: ${albumId}`);
    return { firstPage: null, lastPage: null };
  }

  const mapping =
    KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber] ||
    KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber.toUpperCase()] ||
    KIDS_FIRST_LAST_PAGES_MAPPING[dfaNumber.toLowerCase()];
  if (!mapping || (!mapping.firstPage && !mapping.lastPage)) {
    console.warn(`[First/Last Pages] Не найдены страницы для DFA: ${dfaNumber}`);
    return { firstPage: null, lastPage: null };
  }

  try {
    const result: { firstPage: string | null; lastPage: string | null } = {
      firstPage: null,
      lastPage: null,
    };

    // Загружаем первую страницу
    if (mapping.firstPage) {
      try {
        const asset = Asset.fromModule(mapping.firstPage);
        await asset.downloadAsync();
        result.firstPage = asset.localUri || asset.uri;
      } catch (error) {
        console.warn(`[First/Last Pages] Ошибка загрузки первой страницы для ${dfaNumber}:`, error);
      }
    }

    // Загружаем последнюю страницу
    if (mapping.lastPage) {
      try {
        const asset = Asset.fromModule(mapping.lastPage);
        await asset.downloadAsync();
        result.lastPage = asset.localUri || asset.uri;
      } catch (error) {
        console.warn(`[First/Last Pages] Ошибка загрузки последней страницы для ${dfaNumber}:`, error);
      }
    }

    return result;
  } catch (error) {
    console.error(`[First/Last Pages] Ошибка при загрузке страниц для ${dfaNumber}:`, error);
    return { firstPage: null, lastPage: null };
  }
}

/**
 * Получает первую и последнюю страницу для альбома беременности
 * @param albumId - ID альбома (например, 'pregnancy_60', 'pregnancy_db2')
 * @param formatType - Тип формата: 'hard' (180х240) или 'soft' (А5)
 * @returns Объект с URI первой страницы и массивом URI последних страниц
 */
export async function getPregnancyFirstLastPages(
  albumId: string | null,
  formatType: 'hard' | 'soft' = 'hard'
): Promise<{ firstPage: string | null; lastPages: string[] }> {
  if (!albumId) {
    return { firstPage: null, lastPages: [] };
  }

  const dbNumber = getPregnancyCoverPdf(albumId);
  if (!dbNumber) {
    console.warn(`[First/Last Pages] Не удалось получить номер DB для albumId: ${albumId}`);
    return { firstPage: null, lastPages: [] };
  }

  const mappingKey = `${dbNumber}_${formatType}`;
  const mapping = PREGNANCY_FIRST_LAST_PAGES_MAPPING[mappingKey];
  if (!mapping || (!mapping.firstPage && mapping.lastPages.length === 0)) {
    console.warn(`[First/Last Pages] Не найдены страницы для ${mappingKey}`);
    return { firstPage: null, lastPages: [] };
  }

  try {
    const result: { firstPage: string | null; lastPages: string[] } = {
      firstPage: null,
      lastPages: [],
    };

    // Загружаем первую страницу
    if (mapping.firstPage) {
      try {
        const asset = Asset.fromModule(mapping.firstPage);
        await asset.downloadAsync();
        result.firstPage = asset.localUri || asset.uri;
      } catch (error) {
        console.warn(`[First/Last Pages] Ошибка загрузки первой страницы для ${mappingKey}:`, error);
      }
    }

    // Загружаем все последние страницы
    for (const lastPageModule of mapping.lastPages) {
      if (lastPageModule) {
        try {
          const asset = Asset.fromModule(lastPageModule);
          await asset.downloadAsync();
          const uri = asset.localUri || asset.uri;
          if (uri) {
            result.lastPages.push(uri);
          }
        } catch (error) {
          console.warn(`[First/Last Pages] Ошибка загрузки последней страницы для ${mappingKey}:`, error);
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`[First/Last Pages] Ошибка при загрузке страниц для ${mappingKey}:`, error);
    return { firstPage: null, lastPages: [] };
  }
}

/**
 * Первая/последние страницы для экспорта: GitHub + локальный форзац A5 для soft/electronic.
 */
export async function getPregnancyFirstLastPagesForExport(
  albumId: string | null,
  formatType: 'hard' | 'soft' = 'hard'
): Promise<{ firstPage: string | null; lastPages: string[] }> {
  const localPages = await getPregnancyFirstLastPages(albumId, formatType);
  const remotePages = await getPregnancyFirstLastPagesFromGitHub(albumId, formatType);

  const firstPage = localPages.firstPage || remotePages.firstPage;
  let lastPages = remotePages.lastPages.length > 0 ? remotePages.lastPages : localPages.lastPages;

  if (formatType === 'soft') {
    const closingUri = await loadPregnancyA5ClosingPageUri(albumId);
    if (closingUri && !lastPages.includes(closingUri)) {
      lastPages = [...lastPages, closingUri];
    }
  }

  return { firstPage, lastPages };
}

export async function getPregnancyFirstLastPagesFromGitHub(
  albumId: string | null,
  formatType: 'hard' | 'soft' = 'hard'
): Promise<{ firstPage: string | null; lastPages: string[] }> {
  if (!albumId) {
    return { firstPage: null, lastPages: [] };
  }

  const dbNumber = getPregnancyCoverPdf(albumId);
  if (!dbNumber) {
    console.warn(`[GitHub First/Last] Не удалось получить номер DB для albumId: ${albumId}`);
    return { firstPage: null, lastPages: [] };
  }

  const mappingKey = `${dbNumber}_${formatType}`;
  const urls = PREGNANCY_FIRST_LAST_PAGES_URLS[mappingKey];
  if (!urls) {
    console.warn(`[GitHub First/Last] Не найдены URL для ${mappingKey}`);
    return { firstPage: null, lastPages: [] };
  }

  try {
    const result: { firstPage: string | null; lastPages: string[] } = {
      firstPage: null,
      lastPages: [],
    };

    if (urls.firstPage) {
      const fileName = urls.firstPage.split('/').pop() || 'first_page.png';
      const localPath = await downloadImageToCache(
        `${GITHUB_REPO_BASE}/${encodeURI(urls.firstPage)}`,
        `${mappingKey}_first_${fileName}`
      );
      if (localPath) {
        result.firstPage = localPath;
      }
    }

    for (const lastPageUrl of urls.lastPages) {
      const fileName = lastPageUrl.split('/').pop() || 'last_page.png';
      const localPath = await downloadImageToCache(
        `${GITHUB_REPO_BASE}/${encodeURI(lastPageUrl)}`,
        `${mappingKey}_last_${fileName}`
      );
      if (localPath) {
        result.lastPages.push(localPath);
      }
    }

    return result;
  } catch (error) {
    console.error(`[GitHub First/Last] Ошибка при загрузке страниц для ${mappingKey}:`, error);
    return { firstPage: null, lastPages: [] };
  }
}

export async function getFamilyOrHolidayFirstLastPages(
  albumId: string | null,
  category?: string
): Promise<{ firstPage: string | null; lastPages: string[] }> {
  if (!albumId) {
    return { firstPage: null, lastPages: [] };
  }

  const result: { firstPage: string | null; lastPages: string[] } = {
    firstPage: null,
    lastPages: [],
  };

  try {
    const firstPageImage = getCoverForExport(albumId, category);
    if (firstPageImage) {
      try {
        const asset = Asset.fromModule(firstPageImage);
        await asset.downloadAsync();
        result.firstPage = asset.localUri || asset.uri;
      } catch (error) {
        console.warn(`[First/Last Pages] Ошибка загрузки первой страницы для ${albumId}:`, error);
      }
    }

    if (category === 'family' || albumId.startsWith('family_')) {
      const design = FAMILY_COVER_DESIGNS.find(d => d.id === albumId);
      if (design && 'lastPage' in design && design.lastPage) {
        try {
          const asset = Asset.fromModule(design.lastPage);
          await asset.downloadAsync();
          const uri = asset.localUri || asset.uri;
          if (uri) {
            result.lastPages.push(uri);
          }
        } catch (error) {
          console.warn(`[First/Last Pages] Ошибка загрузки последней страницы для ${albumId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`[First/Last Pages] Ошибка при загрузке страниц для ${albumId}:`, error);
  }

  return result;
}

function normalizeExportImageKey(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const withoutScheme = decoded.replace(/^file:\/\//i, '');
    const base = withoutScheme.split(/[/\\]/).pop() ?? withoutScheme;
    return base.toLowerCase().replace(/\.(png|jpe?g|webp)$/i, '');
  } catch {
    return uri.toLowerCase();
  }
}

/** Сравнение URI обложек (file:// vs cache path) по имени файла. */
export function isSameExportImageUri(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const ka = normalizeExportImageKey(a);
  const kb = normalizeExportImageKey(b);
  return ka.length > 0 && ka === kb;
}

function pickPregnancyClosingPage(lastPages: string[]): string | null {
  if (lastPages.length === 0) return null;
  const formzaц = lastPages.find((uri) => /last_str_/i.test(uri));
  return formzaц ?? lastPages[lastPages.length - 1] ?? null;
}

/**
 * Первая и финальная декоративные страницы для soft/electronic PDF.
 * electronic использует soft-ассеты (A5) + форзац last_str_*.
 */
export async function getExportCoverPages(
  albumId: string | null,
  category: string | null | undefined,
  formatType: 'hard' | 'soft' | 'electronic',
): Promise<{ firstPage: string | null; closingPage: string | null }> {
  if (!albumId || formatType === 'hard') {
    return { firstPage: null, closingPage: null };
  }

  const coverFormat: 'hard' | 'soft' =
    formatType === 'soft' || formatType === 'electronic' ? 'soft' : 'hard';

  if (category === 'kids') {
    const { firstPage, lastPage } = await getKidsFirstLastPages(albumId, coverFormat);
    return { firstPage, closingPage: lastPage };
  }

  if (category === 'pregnancy') {
    const { firstPage, lastPages } =
      coverFormat === 'soft'
        ? await getPregnancyFirstLastPagesForExport(albumId, 'soft')
        : await getPregnancyFirstLastPagesFromGitHub(albumId, coverFormat);

    return {
      firstPage,
      closingPage: pickPregnancyClosingPage(lastPages),
    };
  }

  if (category === 'family' || category === 'holidays' || category === 'holiday') {
    const { firstPage, lastPages } = await getFamilyOrHolidayFirstLastPages(albumId, category);
    return {
      firstPage,
      closingPage: lastPages.length > 0 ? lastPages[lastPages.length - 1] : null,
    };
  }

  // diary и blank-альбомы: null → export-pdf возьмёт первую/последнюю из внутрянки
  return { firstPage: null, closingPage: null };
}
