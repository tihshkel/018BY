export type ExportFormatType = 'electronic' | 'hard' | 'soft';

export type ExportFormatOption = {
  id: ExportFormatType;
  name: string;
  type: ExportFormatType;
  margins: string;
  size: string;
  orientation: string;
  description: string;
};

export function getExportFormatOptions(
  category: string | null | undefined,
  lineGuideId?: string | null,
): ExportFormatOption[] {
  const isSquare =
    category === 'kids' ||
    lineGuideId === 'family_blank_21x21' ||
    lineGuideId === 'holidays_birthday_60';
  const isPortraitBlank = lineGuideId === 'family_blank' || lineGuideId === 'holidays_blank';
  const isDiaryPortrait =
    lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple';
  const size = isSquare
    ? '210 × 210 мм'
    : isPortraitBlank || isDiaryPortrait
      ? '180 × 240 мм'
      : 'A5 (148 × 210 мм)';
  const orientation = isSquare ? 'Квадратная' : 'Вертикальная';
  const electronicMargins = isDiaryPortrait ? 'без полей' : '10 мм';

  return [
    {
      id: 'electronic',
      name: 'Электронная версия',
      type: 'electronic',
      margins: electronicMargins,
      size,
      orientation,
      description: 'Для просмотра на устройстве и отправки близким',
    },
    {
      id: 'hard',
      name: 'Твёрдая обложка',
      type: 'hard',
      margins: '15 мм',
      size: isSquare ? '210 × 210 мм' : '180 × 240 мм',
      orientation,
      description: 'PDF для печати в типографии',
    },
    {
      id: 'soft',
      name: 'Мягкая обложка',
      type: 'soft',
      margins: '10 мм',
      size,
      orientation,
      description: 'Компактный формат для печати',
    },
  ];
}

export function getExportFormatSummaryNote(type: ExportFormatType): string {
  if (type === 'electronic') {
    return 'PDF для просмотра и отправки близким. Не предназначен для печати.';
  }
  if (type === 'hard') {
    return 'PDF для типографии: разворот обложки и внутренние страницы скачиваются отдельно.';
  }
  return 'PDF для типографии: обложка и страницы в одном файле.';
}

export function getExportReviewListHeading(type: ExportFormatType): string {
  if (type === 'electronic') {
    return 'Состав электронной версии';
  }
  return 'Состав для печати';
}

export function getExportReviewDownloadLabel(type: ExportFormatType): string {
  if (type === 'electronic') {
    return 'Скачать PDF для просмотра';
  }
  return 'Продолжить к созданию PDF';
}
