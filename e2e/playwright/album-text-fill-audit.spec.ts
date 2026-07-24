import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

const ROOT = path.join(__dirname, '../..');
const RESULTS_DIR = path.join(ROOT, 'test-results', 'album-text-audit');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');

const LOGIN_EMAIL = 'shkelcode@gmail.com';
const LOGIN_PASSWORD = '12345678';

const IPHONE_VIEWPORT = { width: 390, height: 844 };

type AlbumScenario = {
  id: string;
  name: string;
  params: Record<string, string>;
  totalPages: number;
  viaProjectFlow?: 'diary-brown' | 'diary-purple';
};

const ALBUM_SCENARIOS: AlbumScenario[] = [
  {
    id: 'pregnancy_60',
    name: 'Беременность 60 стр',
    params: { celebration: 'pregnancy', coverType: 'pregnancy_60', interiorType: 'pregnancy_60' },
    totalPages: 60,
  },
  {
    id: 'pregnancy_a5',
    name: 'Беременность A5',
    params: { celebration: 'pregnancy', coverType: 'pregnancy_a5', interiorType: 'pregnancy_a5' },
    totalPages: 48,
  },
  {
    id: 'kids_48',
    name: 'Детский 0–1 год',
    params: { celebration: 'kids', coverType: 'dfa_7', interiorType: 'kids_48' },
    totalPages: 48,
  },
  {
    id: 'holidays_birthday_60',
    name: 'День рождения 48 стр',
    params: {
      celebration: 'holidays',
      coverType: 'holiday_dfa34',
      interiorType: 'holidays_birthday_60',
    },
    totalPages: 48,
  },
  {
    id: 'family_blank_21x21',
    name: 'Семейный blank 21×21',
    params: { celebration: 'family', coverType: 'album_rozovyy', interiorType: 'family_blank_21x21' },
    totalPages: 20,
  },
  {
    id: 'family_blank_21x21',
    name: 'Свадебный blank 21×21',
    params: {
      celebration: 'wedding',
      coverType: 'wedding_sa1',
      interiorType: 'family_blank_21x21',
    },
    totalPages: 20,
  },
  {
    id: 'holidays_blank',
    name: 'Праздничный blank',
    params: {
      celebration: 'holidays',
      coverType: 'holiday_dfa61',
      interiorType: 'holidays_blank',
    },
    totalPages: 20,
  },
  {
    id: 'diary_interior_brown',
    name: 'Дневник коричневый',
    params: {},
    totalPages: 60,
    viaProjectFlow: 'diary-brown',
  },
  {
    id: 'diary_interior_purple',
    name: 'Дневник фиолетовый',
    params: {},
    totalPages: 40,
    viaProjectFlow: 'diary-purple',
  },
];

type OverflowIssue = {
  text: string;
  clientWidth: number;
  scrollWidth: number;
  clientHeight: number;
  scrollHeight: number;
};

type PageAuditResult = {
  page: number;
  filled: boolean;
  inputCount: number;
  overflowIssues: OverflowIssue[];
  screenshot?: string;
  error?: string;
};

type AlbumAuditReport = {
  albumId: string;
  albumName: string;
  totalPages: number;
  pagesWithIssues: number;
  pages: PageAuditResult[];
};

function ensureDirs() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function generateMeaningfulText(hint: string, maxLen: number): string {
  const lower = hint.toLowerCase();
  let base =
    'Это осмысленный текст для проверки переноса строк на макете альбома без обрезания.';

  if (lower.includes('дата') || lower.includes('date') || lower.includes('когда')) {
    base = '15 марта 2025 года — важный день нашей семьи';
  } else if (lower.includes('имя') || lower.includes('name') || lower.includes('зовут')) {
    base = 'Анна Мария Иванова';
  } else if (lower.includes('вес') || lower.includes('weight') || lower.includes('кг')) {
    base = '3.45 кг';
  } else if (lower.includes('рост') || lower.includes('height') || lower.includes('см')) {
    base = '52 см';
  } else if (lower.includes('люблю') || lower.includes('love')) {
    base =
      'Обниматься с мамой, смотреть мультики, играть с игрушками и слушать колыбельные перед сном';
  } else if (lower.includes('умею') || lower.includes('can') || lower.includes('научил')) {
    base = 'Говорить «мама» и «папа», ходить, строить башни из кубиков и аплодировать';
  } else if (lower.includes('место') || lower.includes('родил') || lower.includes('больниц')) {
    base = 'Роддом №3, г. Минск';
  } else if (lower.includes('врач') || lower.includes('doctor')) {
    base = 'Доктор Смирнова Елена Петровна';
  } else if (lower.includes('коммент') || lower.includes('замет') || lower.includes('истор')) {
    base =
      'Сегодня был замечательный день: мы гуляли в парке, смеялись и делали первые семейные фотографии';
  } else if (lower.includes('пожелан') || lower.includes('wish')) {
    base = 'Здоровья, счастья и тёплых объятий нашей семье на долгие годы';
  }

  if (maxLen <= 20) {
    return base.slice(0, maxLen);
  }

  let result = base;
  const filler = ' — важный момент, который хочется сохранить в альбоме навсегда.';
  while (result.length < Math.floor(maxLen * 0.92)) {
    result += filler;
  }
  return result.slice(0, maxLen);
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('@has_seen_onboarding', 'true');
  });
}

async function login(page: Page) {
  await seedSession(page);
  await page.goto('/login');
  await page.setViewportSize(IPHONE_VIEWPORT);

  await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('login-email').fill(LOGIN_EMAIL);
  await page.getByTestId('login-password').fill(LOGIN_PASSWORD);
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('home-greeting')).toBeVisible({ timeout: 120_000 });
}

async function goToProjects(page: Page) {
  const projectsTab = page.getByTestId('tab-projects');
  if (await projectsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await projectsTab.click();
  } else {
    await page.goto('/projects');
  }
  await expect(page.getByTestId('project-category-pregnancy')).toBeVisible({ timeout: 60_000 });
}

async function openDiaryAlbum(page: Page, interiorId: 'diary_interior_brown' | 'diary_interior_purple') {
  await goToProjects(page);
  await expect(page.getByTestId('project-category-diary')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('project-category-diary').click();
  await page.getByTestId('cover-diary_dd1').click();
  await page.getByTestId('select-action-edit').click();
  await page.getByTestId(`interior-${interiorId}`).click();
  await page.getByTestId('interior-continue').click();
  await expect(page.getByTestId('album-export-button')).toBeVisible({ timeout: 180_000 });
}

async function openAlbumPages(page: Page, scenario: AlbumScenario) {
  if (scenario.viaProjectFlow === 'diary-brown') {
    await openDiaryAlbum(page, 'diary_interior_brown');
    return;
  }
  if (scenario.viaProjectFlow === 'diary-purple') {
    await openDiaryAlbum(page, 'diary_interior_purple');
    return;
  }

  const params = new URLSearchParams(scenario.params);
  await page.goto(`/album-pages?${params.toString()}`);

  const viewAll = page.getByRole('button', { name: 'Посмотреть все страницы' });
  if (await viewAll.isVisible({ timeout: 180_000 }).catch(() => false)) {
    await viewAll.click();
  }

  await expect(page.getByTestId('album-export-button')).toBeVisible({ timeout: 180_000 });
}

async function expandPageSection(page: Page, pageNumber: number, totalPages: number) {
  const sectionStart = Math.floor((pageNumber - 1) / 15) * 15 + 1;
  const sectionEnd = Math.min(sectionStart + 14, totalPages);
  const sectionTitle = page.getByText(`Страницы ${sectionStart}–${sectionEnd}`).first();
  if (await sectionTitle.isVisible().catch(() => false)) {
    await sectionTitle.click();
  }
}

async function goBackToAlbumPages(page: Page) {
  const back = page.locator('[aria-label="Назад"], [accessibilitylabel="Назад"]').first();
  if (await back.isVisible().catch(() => false)) {
    await back.click();
    return;
  }
  await page.goBack();
}

async function detectTextOverflow(page: Page): Promise<OverflowIssue[]> {
  return page.evaluate(() => {
    const issues: OverflowIssue[] = [];
    const elements = document.querySelectorAll('div, span, p, textarea, input');

    elements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const text = (el.textContent ?? el.getAttribute('value') ?? '').trim();
      if (text.length < 4) return;

      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return;

      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const sw = el.scrollWidth;
      const sh = el.scrollHeight;

      if (cw < 8 || ch < 8) return;

      const horizontalOverflow = sw > cw + 2;
      const verticalOverflow = sh > ch + 2;

      if (horizontalOverflow || verticalOverflow) {
        issues.push({
          text: text.slice(0, 100),
          clientWidth: cw,
          scrollWidth: sw,
          clientHeight: ch,
          scrollHeight: sh,
        });
      }
    });

    return issues;
  });
}

async function fillInputField(input: Locator, index: number) {
  const maxLengthAttr = await input.getAttribute('maxlength');
  const placeholder = (await input.getAttribute('placeholder')) ?? '';
  const ariaLabel = (await input.getAttribute('aria-label')) ?? '';
  const name = (await input.getAttribute('name')) ?? '';
  const hint = `${placeholder} ${ariaLabel} ${name} field-${index}`;
  const maxLen = maxLengthAttr ? Number.parseInt(maxLengthAttr, 10) : 120;
  const text = generateMeaningfulText(hint, Number.isFinite(maxLen) ? maxLen : 120);
  if (text) {
    await input.fill(text);
  }
}

async function fillFormFields(page: Page): Promise<number> {
  const moodEmoji = page.getByText('🙂', { exact: true });
  if (await moodEmoji.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await moodEmoji.click();
  }

  const freeTemplate = page.getByText('Свободная страница');
  if (await freeTemplate.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await freeTemplate.click();
    const freeText = page.getByPlaceholder('Введите текст');
    if (await freeText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await freeText.fill(
        'Наша семейная история — тёплые моменты, которые мы храним в этом альбоме.',
      );
    }
  }

  const inputs = page.locator('input:not([type="hidden"]), textarea');
  const count = await inputs.count();

  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    if (!(await input.isVisible().catch(() => false))) continue;
    const type = (await input.getAttribute('type')) ?? 'text';
    if (type === 'checkbox' || type === 'radio' || type === 'file') continue;
    await fillInputField(input, i);
  }

  return count;
}

async function auditAlbumPage(
  page: Page,
  scenario: AlbumScenario,
  pageNumber: number,
): Promise<PageAuditResult> {
  const result: PageAuditResult = {
    page: pageNumber,
    filled: false,
    inputCount: 0,
    overflowIssues: [],
  };

  try {
    await expandPageSection(page, pageNumber, scenario.totalPages);
    await page.getByTestId(`page-card-${pageNumber}`).click({ timeout: 30_000 });
    await expect(
      page.getByText(new RegExp(`Страница ${pageNumber} из ${scenario.totalPages}`)),
    ).toBeVisible({ timeout: 30_000 });

    const fillButton = page.getByRole('button', { name: 'Заполнить страницу' });
    if (await fillButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fillButton.click();
      await expect(
        page.getByTestId('form-save').or(page.getByTestId('unified-editor-save')),
      ).toBeVisible({ timeout: 30_000 });

      result.inputCount = await fillFormFields(page);
      result.filled = result.inputCount > 0;

      const saveButton = page.getByTestId('form-save').or(page.getByTestId('unified-editor-save'));
      await saveButton.click();
      await expect(
        page.getByText(new RegExp(`Страница ${pageNumber} из ${scenario.totalPages}`)),
      ).toBeVisible({ timeout: 30_000 });
    }

    await page.waitForTimeout(800);
    result.overflowIssues = await detectTextOverflow(page);

    if (result.overflowIssues.length > 0 || result.filled) {
      const suffix = result.overflowIssues.length > 0 ? 'overflow' : 'filled';
      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        `${scenario.id}-p${String(pageNumber).padStart(3, '0')}-${suffix}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = path.relative(ROOT, screenshotPath);
    }

    await goBackToAlbumPages(page);
    await expect(page.getByTestId('album-export-button')).toBeVisible({ timeout: 30_000 });
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    const failPath = path.join(
      SCREENSHOTS_DIR,
      `${scenario.id}-p${String(pageNumber).padStart(3, '0')}-error.png`,
    );
    await page.screenshot({ path: failPath, fullPage: true }).catch(() => {});
    result.screenshot = path.relative(ROOT, failPath);

    try {
      await goBackToAlbumPages(page);
    } catch {
      await page.goto(
        `/album-pages?${new URLSearchParams(scenario.params).toString()}`,
      );
    }
  }

  return result;
}

async function auditAlbum(page: Page, scenario: AlbumScenario): Promise<AlbumAuditReport> {
  ensureDirs();
  await page.setViewportSize(IPHONE_VIEWPORT);
  await login(page);
  await openAlbumPages(page, scenario);

  const pages: PageAuditResult[] = [];

  for (let n = 1; n <= scenario.totalPages; n += 1) {
    const pageResult = await auditAlbumPage(page, scenario, n);
    pages.push(pageResult);

    if (n % 5 === 0 || n === scenario.totalPages) {
      const partial = {
        albumId: scenario.id,
        albumName: scenario.name,
        totalPages: scenario.totalPages,
        pagesWithIssues: pages.filter((p) => p.overflowIssues.length > 0).length,
        progress: `${n}/${scenario.totalPages}`,
        pages,
      };
      fs.writeFileSync(
        path.join(RESULTS_DIR, `${scenario.id}-partial.json`),
        JSON.stringify(partial, null, 2),
      );
    }
  }

  const report: AlbumAuditReport = {
    albumId: scenario.id,
    albumName: scenario.name,
    totalPages: scenario.totalPages,
    pagesWithIssues: pages.filter((p) => p.overflowIssues.length > 0).length,
    pages,
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, `${scenario.id}-report.json`),
    JSON.stringify(report, null, 2),
  );

  return report;
}

test.describe.configure({ mode: 'serial' });

test.describe('album text fill audit (iOS viewport)', () => {
  test.beforeAll(() => {
    ensureDirs();
  });

  test('login with user account', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    await goToProjects(page);
  });

  for (const scenario of ALBUM_SCENARIOS) {
    test(`fill & audit: ${scenario.name}`, async ({ page }) => {
      test.setTimeout(3_600_000);

      const report = await auditAlbum(page, scenario);

      const summaryPath = path.join(RESULTS_DIR, 'summary.json');
      const existing = fs.existsSync(summaryPath)
        ? JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
        : { albums: [] as AlbumAuditReport[], generatedAt: new Date().toISOString() };

      existing.albums = existing.albums.filter((a: AlbumAuditReport) => a.albumId !== scenario.id);
      existing.albums.push(report);
      existing.generatedAt = new Date().toISOString();
      existing.pagesWithIssuesTotal = existing.albums.reduce(
        (sum: number, a: AlbumAuditReport) => sum + a.pagesWithIssues,
        0,
      );

      fs.writeFileSync(summaryPath, JSON.stringify(existing, null, 2));

      const errors = report.pages.filter((p) => p.error);
      expect(errors, `Ошибки навигации: ${JSON.stringify(errors, null, 2)}`).toEqual([]);

      if (report.pagesWithIssues > 0) {
        console.log(
          `[${scenario.id}] Найдено страниц с переполнением текста: ${report.pagesWithIssues}`,
        );
      }
    });
  }
});
