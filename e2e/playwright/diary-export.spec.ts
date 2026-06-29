import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import { expect, test, type Page } from '@playwright/test';

const ROOT = path.join(__dirname, '../..');
const RESULTS_DIR = path.join(ROOT, 'test-results', 'diary-audit');

type DiaryInterior = 'diary_interior_brown' | 'diary_interior_purple';

async function seedGuestSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('@has_seen_onboarding', 'true');
    localStorage.setItem('@user_name', 'Playwright E2E');
  });
}

async function createDiary(
  page: Page,
  interiorId: DiaryInterior,
  pageCountLabel: string,
) {
  await seedGuestSession(page);
  await page.goto('/projects');
  await expect(page.getByTestId('project-category-diary')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('project-category-diary').click();
  await page.getByTestId('cover-diary_dd1').click();
  await page.getByTestId('select-action-edit').click();
  await page.getByTestId(`interior-${interiorId}`).click();
  await page.getByTestId('interior-continue').click();
  await expect(page.getByText(pageCountLabel)).toBeVisible({ timeout: 180_000 });
  await expect(page.getByTestId('album-export-button')).toBeVisible();
}

async function openPagePreview(page: Page, pageNumber: number, totalPages: number) {
  await page.getByTestId(`page-card-${pageNumber}`).click();
  await expect(page.getByText(new RegExp(`Страница ${pageNumber} из ${totalPages}`))).toBeVisible({
    timeout: 30_000,
  });
}

async function goBackToAlbumPages(page: Page) {
  const back = page.locator('[aria-label="Назад"], [accessibilitylabel="Назад"]').first();
  if (await back.isVisible().catch(() => false)) {
    await back.click();
    return;
  }
  await page.goBack();
}

async function fillPageWithLongText(
  page: Page,
  pageNumber: number,
  totalPages: number,
  longText: string,
) {
  await page.getByTestId(`page-card-${pageNumber}`).click();
  await page.getByRole('button', { name: 'Заполнить страницу' }).click();
  await expect(page.getByTestId('form-save')).toBeVisible({ timeout: 20_000 });

  const firstInput = page.locator('input, textarea').first();
  await expect(firstInput).toBeVisible();
  await firstInput.fill(longText);

  await page.getByTestId('form-save').click();
  await expect(page.getByText(new RegExp(`Страница ${pageNumber} из ${totalPages}`))).toBeVisible({
    timeout: 30_000,
  });

  await page.screenshot({
    path: path.join(
      RESULTS_DIR,
      'screenshots',
      `brown-p${String(pageNumber).padStart(2, '0')}-long-text.png`,
    ),
    fullPage: true,
  });

  await goBackToAlbumPages(page);
}

async function fillMyDayMood(page: Page, pageNumber: number, totalPages: number) {
  await page.getByTestId(`page-card-${pageNumber}`).click();
  await page.getByRole('button', { name: 'Заполнить страницу' }).click();
  await expect(page.getByTestId('form-save')).toBeVisible({ timeout: 20_000 });

  const moodOption = page.getByText('🙂', { exact: true });
  await expect(moodOption).toBeVisible();
  await moodOption.click();

  await page.getByTestId('form-save').click();
  await expect(page.getByText(new RegExp(`Страница ${pageNumber} из ${totalPages}`))).toBeVisible({
    timeout: 30_000,
  });

  await page.screenshot({
    path: path.join(
      RESULTS_DIR,
      'screenshots',
      `brown-p${String(pageNumber).padStart(2, '0')}-mood.png`,
    ),
    fullPage: true,
  });

  await goBackToAlbumPages(page);
}

async function fillPageSmoke(page: Page, pageNumber: number, totalPages: number) {
  await page.getByTestId(`page-card-${pageNumber}`).click();
  await page.getByRole('button', { name: 'Заполнить страницу' }).click();
  await expect(page.getByTestId('form-save')).toBeVisible({ timeout: 20_000 });

  const count = await page.locator('input, textarea').count();
  expect(count).toBeGreaterThan(0);
  if (pageNumber === 3) {
    expect(count).toBe(1);
  }

  await page.getByTestId('form-save').click();
  await expect(page.getByText(new RegExp(`Страница ${pageNumber} из ${totalPages}`))).toBeVisible();
  await goBackToAlbumPages(page);
}

async function assertBrownDiaryPdfDimensions(pdfPath: string) {
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes);
  const pagesToCheck = Math.min(doc.getPageCount(), 5);

  for (let i = 0; i < pagesToCheck; i += 1) {
    const { width, height } = doc.getPage(i).getSize();
    expect(width, `page ${i + 1} width`).toBeCloseTo(510, 0);
    expect(height, `page ${i + 1} height`).toBeCloseTo(680, 0);
  }
}

async function previewAllPages(
  page: Page,
  prefix: 'brown' | 'purple',
  totalPages: number,
) {
  fs.mkdirSync(path.join(RESULTS_DIR, 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(RESULTS_DIR, 'failures'), { recursive: true });

  const failures: { page: number; error: string }[] = [];
  const successes: number[] = [];

  for (let n = 1; n <= totalPages; n += 1) {
    try {
      await openPagePreview(page, n, totalPages);
      await page.screenshot({
        path: path.join(RESULTS_DIR, 'screenshots', `${prefix}-p${String(n).padStart(2, '0')}.png`),
        fullPage: true,
      });
      await goBackToAlbumPages(page);
      await expect(page.getByTestId('album-export-button')).toBeVisible({ timeout: 20_000 });
      successes.push(n);
    } catch (err) {
      failures.push({ page: n, error: err instanceof Error ? err.message : String(err) });
      await page
        .screenshot({
          path: path.join(RESULTS_DIR, 'failures', `${prefix}-p${n}-fail.png`),
          fullPage: true,
        })
        .catch(() => {});
    }
  }

  const report = { album: prefix, totalPages, successes, failures };
  fs.writeFileSync(
    path.join(RESULTS_DIR, `${prefix}-preview-report.json`),
    JSON.stringify(report, null, 2),
  );
  return report;
}

function writeCombinedSummary(extra: Record<string, unknown>) {
  const auditPath = path.join(RESULTS_DIR, 'audit-report.json');
  const audit = fs.existsSync(auditPath)
    ? JSON.parse(fs.readFileSync(auditPath, 'utf8'))
    : null;

  const summary = {
    generatedAt: new Date().toISOString(),
    staticAudit: audit?.summary ?? null,
    ...extra,
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, 'full-test-summary.json'),
    JSON.stringify(summary, null, 2),
  );

  const lines = [
    '# Отчёт Playwright: личные дневники',
    '',
    `Дата: ${summary.generatedAt}`,
    '',
    '## Статический аудит (100 страниц)',
    audit
      ? `- ${audit.summary.ok}/${audit.summary.total} OK, ошибок: ${audit.summary.errors}`
      : '- не выполнен',
    '',
    '## UI-тесты',
  ];

  for (const [key, value] of Object.entries(extra)) {
    lines.push(`- **${key}**: ${JSON.stringify(value)}`);
  }

  lines.push('', '## Артефакты', `- Скриншоты: \`test-results/diary-audit/screenshots/\``);
  lines.push(`- HTML-отчёт Playwright: \`playwright-html-report/index.html\``);
  lines.push(`- JSON Playwright: \`test-results/diary-audit/playwright-results.json\``);

  fs.writeFileSync(path.join(RESULTS_DIR, 'full-test-summary.md'), lines.join('\n'));
}

test.describe.configure({ mode: 'serial' });

test('static audit: all brown/purple pages pass slot-field check', () => {
  execSync('node scripts/diary-full-page-audit.js', { cwd: ROOT, stdio: 'inherit' });
  execSync('npm run audit:diary-field-semantic:fail', { cwd: ROOT, stdio: 'inherit' });
  execSync('npm run audit:diary-brown-text-baseline:fail', { cwd: ROOT, stdio: 'inherit' });
  expect(fs.existsSync(path.join(RESULTS_DIR, 'audit-report.json'))).toBeTruthy();
});

test('brown diary: preview 60 pages + fill smoke + export smoke', async ({ page }) => {
  test.setTimeout(1_800_000);

  await createDiary(page, 'diary_interior_brown', 'из 60 страниц');
  const preview = await previewAllPages(page, 'brown', 60);

  for (const pageNumber of [3, 6, 7, 16, 31]) {
    await fillPageSmoke(page, pageNumber, 60);
  }

  await fillMyDayMood(page, 16, 60);

  const longText =
    'Это длинный тестовый текст для проверки переноса слов на линии макета коричневого дневника без обрезания посередине.';
  for (const pageNumber of [6, 13, 31]) {
    await fillPageWithLongText(page, pageNumber, 60, longText);
  }

  let exportStatus: 'ok' | 'failed' = 'failed';
  let exportError: string | undefined;
  let pdfDimensionsOk = false;
  try {
    await page.getByTestId('album-export-button').click();
    await expect(page.getByTestId('export-format-electronic')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('export-format-electronic').click();
    await page.getByTestId('export-start').click();
    await expect(
      page.getByTestId('export-done-home').or(page.getByText('Электронная версия')),
    ).toBeVisible({ timeout: 300_000 });
    await expect(page.getByText('Книга готова')).toBeVisible({ timeout: 60_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
    const openButton = page.getByRole('button', { name: 'Открыть' });
    await expect(openButton).toBeVisible({ timeout: 30_000 });
    await openButton.click();

    const download = await downloadPromise;
    const pdfPath = path.join(RESULTS_DIR, 'brown-electronic.pdf');
    await download.saveAs(pdfPath);
    await assertBrownDiaryPdfDimensions(pdfPath);
    pdfDimensionsOk = true;

    await page.screenshot({
      path: path.join(RESULTS_DIR, 'brown-export-done.png'),
      fullPage: true,
    });
    exportStatus = 'ok';
  } catch (err) {
    exportError = err instanceof Error ? err.message : String(err);
    await page
      .screenshot({
        path: path.join(RESULTS_DIR, 'brown-export-fail.png'),
        fullPage: true,
      })
      .catch(() => {});
  }

  writeCombinedSummary({
    brownPreview: {
      passed: preview.failures.length === 0,
      successCount: preview.successes.length,
      failureCount: preview.failures.length,
      failures: preview.failures,
    },
    brownFillPages: [3, 6, 7, 16, 31],
    brownMoodPage: 16,
    brownLongTextPages: [6, 13, 31],
    brownExport: { status: exportStatus, pdfDimensionsOk, error: exportError },
  });

  expect(preview.failures, JSON.stringify(preview.failures, null, 2)).toEqual([]);
  expect(exportStatus, exportError).toBe('ok');
  expect(pdfDimensionsOk).toBe(true);
});

test('purple diary: preview 40 pages + fill page 3', async ({ page }) => {
  test.setTimeout(1_200_000);

  await createDiary(page, 'diary_interior_purple', 'из 40 страниц');
  const preview = await previewAllPages(page, 'purple', 40);

  await page.getByTestId('page-card-3').click();
  await page.getByRole('button', { name: 'Заполнить страницу' }).click();
  await expect(page.getByTestId('form-save')).toBeVisible();
  expect(await page.locator('input, textarea').count()).toBe(1);

  const existingSummaryPath = path.join(RESULTS_DIR, 'full-test-summary.json');
  const existing = fs.existsSync(existingSummaryPath)
    ? JSON.parse(fs.readFileSync(existingSummaryPath, 'utf8'))
    : {};

  writeCombinedSummary({
    ...existing,
    purplePreview: {
      passed: preview.failures.length === 0,
      successCount: preview.successes.length,
      failureCount: preview.failures.length,
      failures: preview.failures,
    },
    purpleFillPage3: { fields: 1 },
  });

  expect(preview.failures, JSON.stringify(preview.failures, null, 2)).toEqual([]);
});
