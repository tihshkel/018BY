import { expect, test, type Page } from '@playwright/test';

type DesignedAlbumScenario = {
  name: string;
  params: {
    celebration: string;
    coverType: string;
    interiorType: string;
  };
  totalPages: number;
  pagesToPreview: number[];
  pageToFill: number;
};

const SCENARIOS: DesignedAlbumScenario[] = [
  {
    name: 'pregnancy 60',
    params: {
      celebration: 'pregnancy',
      coverType: 'pregnancy_60',
      interiorType: 'pregnancy_60',
    },
    totalPages: 60,
    pagesToPreview: [6, 9, 52, 54, 60],
    pageToFill: 9,
  },
  {
    name: 'pregnancy A5',
    params: {
      celebration: 'pregnancy',
      coverType: 'pregnancy_a5',
      interiorType: 'pregnancy_a5',
    },
    totalPages: 48,
    pagesToPreview: [5, 29, 48],
    pageToFill: 5,
  },
  {
    name: 'kids 48',
    params: {
      celebration: 'kids',
      coverType: 'dfa_7',
      interiorType: 'kids_48',
    },
    totalPages: 48,
    pagesToPreview: [1, 5, 7, 9, 10],
    pageToFill: 1,
  },
  {
    name: 'birthday 48',
    params: {
      celebration: 'holidays',
      coverType: 'holiday_dfa34',
      interiorType: 'holidays_birthday_60',
    },
    totalPages: 48,
    pagesToPreview: [2, 40, 48],
    pageToFill: 2,
  },
];

async function seedGuestSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('@has_seen_onboarding', 'true');
    localStorage.setItem('@user_name', 'Playwright E2E');
  });
}

function albumPagesUrl(scenario: DesignedAlbumScenario): string {
  const params = new URLSearchParams(scenario.params);
  return `/album-pages?${params.toString()}`;
}

async function openAlbumPages(page: Page, scenario: DesignedAlbumScenario) {
  await seedGuestSession(page);
  await page.goto(albumPagesUrl(scenario));

  const viewAll = page.getByRole('button', { name: 'Посмотреть все страницы' });
  if (await viewAll.isVisible({ timeout: 180_000 }).catch(() => false)) {
    await viewAll.click();
  }

  await expect(page.getByTestId('album-export-button')).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText('Содержание альбома')).toBeVisible();
}

async function goBackToAlbumPages(page: Page) {
  const back = page.locator('[aria-label="Назад"], [accessibilitylabel="Назад"]').first();
  if (await back.isVisible().catch(() => false)) {
    await back.click();
    return;
  }
  await page.goBack();
}

async function openPreview(page: Page, pageNumber: number, totalPages: number) {
  const sectionStart = Math.floor((pageNumber - 1) / 15) * 15 + 1;
  const sectionEnd = Math.min(sectionStart + 14, totalPages);
  const sectionTitle = page.getByText(`Страницы ${sectionStart}–${sectionEnd}`).first();
  if (await sectionTitle.isVisible().catch(() => false)) {
    await sectionTitle.click();
  }
  await page.getByTestId(`page-card-${pageNumber}`).click();
  await expect(page.getByText(new RegExp(`Страница ${pageNumber} из ${totalPages}`))).toBeVisible({
    timeout: 30_000,
  });
}

async function fillOnePage(page: Page, scenario: DesignedAlbumScenario) {
  await openPreview(page, scenario.pageToFill, scenario.totalPages);
  await page.getByRole('button', { name: 'Заполнить страницу' }).click();
  await expect(page.getByTestId('form-save')).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('input, textarea').count()).toBeGreaterThan(0);
  await page.getByTestId('form-save').click();
  await expect(
    page.getByText(new RegExp(`Страница ${scenario.pageToFill} из ${scenario.totalPages}`)),
  ).toBeVisible();
  await goBackToAlbumPages(page);
}

async function exportElectronicPdf(page: Page) {
  await page.getByTestId('album-export-button').click();
  await expect(page.getByTestId('export-format-electronic')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('export-format-electronic').click();
  await page.getByTestId('export-start').click();
  await expect(
    page.getByTestId('export-done-home').or(page.getByText('Электронная версия')),
  ).toBeVisible({ timeout: 300_000 });
}

test.describe('designed albums: preview/fill/export smoke', () => {
  test.describe.configure({ mode: 'serial' });

  for (const scenario of SCENARIOS) {
    test(`${scenario.name}: representative pages and electronic export`, async ({ page }) => {
      test.setTimeout(600_000);

      await openAlbumPages(page, scenario);

      for (const pageNumber of scenario.pagesToPreview) {
        await openPreview(page, pageNumber, scenario.totalPages);
        await goBackToAlbumPages(page);
        await expect(page.getByTestId('album-export-button')).toBeVisible();
      }

      await fillOnePage(page, scenario);
      await exportElectronicPdf(page);
    });
  }
});
