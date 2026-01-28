import { getAllAlbumTemplates, type AlbumTemplate } from '@/albums';

export interface ProjectCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ProjectProduct {
  id: string;
  name: string;
  description: string;
  pages: number;
  sections: number;
  hasReminders: boolean;
  coverImage?: NonNullable<AlbumTemplate['thumbnailPath']>;
  category: string;
}

export const projectCategories: ProjectCategory[] = [
  { id: 'pregnancy', name: 'Ожидание чуда', icon: 'heart-outline' },
  { id: 'kids', name: 'Первые годы малыша', icon: 'flower-outline' },
  { id: 'family', name: 'Семья', icon: 'people-outline' },
  { id: 'wedding', name: 'Любовь и свадьба', icon: 'diamond-outline' },
  { id: 'holidays', name: 'Праздники и события', icon: 'gift-outline' },
  { id: 'diary', name: 'Мои истории: дневники', icon: 'book-outline' },
];

export const buildProjectProducts = () => {
  const albumTemplates = getAllAlbumTemplates();

  const productsMap: Record<string, ProjectProduct[]> = {
    pregnancy: [],
    kids: [],
    wedding: [],
    family: [],
    holidays: [],
    diary: [],
  };

  albumTemplates.forEach(album => {
    const projectProduct: ProjectProduct = {
      id: album.id,
      name: album.name,
      description: album.description,
      pages: album.pages,
      sections: Math.floor(album.pages / 2),
      hasReminders:
        album.category === 'pregnancy' ||
        album.category === 'kids' ||
        album.category === 'wedding',
      coverImage: album.thumbnailPath,
      category: album.category,
    };

    if (album.category === 'travel') {
      productsMap.holidays.push(projectProduct);
      return;
    }

    if (productsMap[album.category]) {
      productsMap[album.category].push(projectProduct);
    }
  });

  return productsMap;
};

