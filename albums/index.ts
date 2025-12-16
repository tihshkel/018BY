export interface PhotoPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface FreePhoto {
  id: string;
  uri: string;
  position: PhotoPosition;
}

export interface AlbumField {
  id: string;
  type: 'text' | 'image' | 'date';
  label: string;
  placeholder?: string;
  value?: string | null;
  required?: boolean;
}

export interface AlbumPage {
  id: string;
  title: string;
  fields: AlbumField[];
  freePhotos?: FreePhoto[];
}

export interface AlbumSection {
  id: string;
  title: string;
  pages: AlbumPage[];
}

export interface AlbumTemplate {
  id: string;
  name: string;
  description: string;
  category: 'pregnancy' | 'kids' | 'family' | 'wedding' | 'travel';
  pages: number;
  thumbnailPath?: string;
  pdfPath?: string | number | any;
  hasPdfTemplate?: boolean; // Указывает, есть ли готовый PDF шаблон
  sections: AlbumSection[];
}

export const albumTemplates: AlbumTemplate[] = [
  {
    id: 'pregnancy_60',
    name: 'Дневник беременности в твердой обложке',
    description: 'Дневник беременности в твердой обложке',
    category: 'pregnancy',
    pages: 60,
    pdfPath: require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр.pdf'),
    thumbnailPath: require('../assets/images/albums/DB1_0.png'),
    hasPdfTemplate: true,
    sections: [], // Пустые секции, так как это готовый PDF
  },
  {
    id: 'pregnancy_a5',
    name: 'Дневник беременности А5 в мягкой обложке',
    description: 'Дневник беременности А5 в мягкой обложке',
    category: 'pregnancy',
    pages: 60,
    pdfPath: require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf'),
    thumbnailPath: require('../assets/images/albums/DB1_п.png'),
    hasPdfTemplate: true,
    sections: [], // Пустые секции, так как это готовый PDF
  },
  {
    id: 'pregnancy_db2',
    name: 'Дневник беременности в твердой обложке',
    description: 'Дневник беременности в твердой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB2_0.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db2_soft',
    name: 'Дневник беременности А5 в мягкой обложке',
    description: 'Дневник беременности А5 в мягкой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB2_п.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db3',
    name: 'Дневник беременности в твердой обложке',
    description: 'Дневник беременности в твердой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB3_0.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db3_soft',
    name: 'Дневник беременности А5 в мягкой обложке',
    description: 'Дневник беременности А5 в мягкой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB3_п.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db4',
    name: 'Дневник беременности в твердой обложке',
    description: 'Дневник беременности в твердой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB4_0.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db4_soft',
    name: 'Дневник беременности А5 в мягкой обложке',
    description: 'Дневник беременности А5 в мягкой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB4_п.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db5',
    name: 'Дневник беременности в твердой обложке',
    description: 'Дневник беременности в твердой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB5_0.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_db5_soft',
    name: 'Дневник беременности А5 в мягкой обложке',
    description: 'Дневник беременности А5 в мягкой обложке',
    category: 'pregnancy',
    pages: 60,
    thumbnailPath: require('../assets/images/albums/DB5_п.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  // Дополнительные альбомы DFA (Фотоальбом от 0 до 1 года)
  {
    id: 'dfa_7',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA7.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_8',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA8.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_9',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA9.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_14',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA14.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_15',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA15.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_16',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA16.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_19',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA19.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_21',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA21.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_23',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA23.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_24',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA24.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_25',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA25.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_26',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA26.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_27',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA27.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_28',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA28.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_29',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA29.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_31',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA31.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_46',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA46.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_47',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA47.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_50',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA50.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_52',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA52.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_53',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA53.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_57',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA57.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_59',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA59.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_60',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA60.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_71',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA71.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_72',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA72.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_74',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA74.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_207',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA207.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_208',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA208.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_300',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA300.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_301',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA301.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_302',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA302.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_304',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA304.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_305',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA305.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_306',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA306.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_307',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA307.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_308',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA308.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_309',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA309 (2).png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'dfa_5',
    name: 'Фотоальбом от 0 до 1 года',
    description: 'Фотоальбом от 0 до 1 года',
    category: 'kids',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/DFA5.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_2',
    name: 'Дневник беременности в твердой обложке',
    description: 'Дневник беременности в твердой обложке',
    category: 'pregnancy',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/2.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'pregnancy_2_3',
    name: 'Дневник беременности А5 в мягкой обложке',
    description: 'Дневник беременности А5 в мягкой обложке',
    category: 'pregnancy',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/2.3.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'album_rozovyy',
    name: 'Розовый альбом',
    description: 'Нежный розовый альбом для фотографий',
    category: 'family',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/розовый.png'),
    hasPdfTemplate: false,
    sections: [],
  },
  {
    id: 'album_pilot',
    name: 'Пилотный альбом',
    description: 'Пилотный альбом для фотографий',
    category: 'family',
    pages: 50,
    thumbnailPath: require('../assets/images/albums/пилот.png'),
    hasPdfTemplate: false,
    sections: [],
  },
];

export function getAllAlbumTemplates(): AlbumTemplate[] {
  return albumTemplates;
}

export function getAlbumTemplateById(id: string): AlbumTemplate | undefined {
  return albumTemplates.find(template => template.id === id);
}

export function getAlbumTemplatesByCategory(category: AlbumTemplate['category']): AlbumTemplate[] {
  return albumTemplates.filter(template => template.category === category);
}
