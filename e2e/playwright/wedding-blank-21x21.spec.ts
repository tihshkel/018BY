import { expect, test, type Page } from '@playwright/test';

async function seedGuestSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('@has_seen_onboarding', 'true');
    localStorage.setItem('@user_name', 'Playwright E2E');
  });
}

test.describe('wedding blank 21x21: free page editor', () => {
  test('opens square blank album and free page form shell', async ({ page }) => {
    test.setTimeout(300_000);

    await seedGuestSession(page);
    const params = new URLSearchParams({
      celebration: 'wedding',
      coverType: 'wedding_sa1',
      interiorType: 'family_blank_21x21',
    });
    await page.goto(`/album-pages?${params.toString()}`);

    const viewAll = page.getByRole('button', { name: 'Посмотреть все страницы' });
    if (await viewAll.isVisible({ timeout: 180_000 }).catch(() => false)) {
      await viewAll.click();
    }

    await expect(page.getByTestId('album-export-button')).toBeVisible({ timeout: 180_000 });
    await page.getByTestId('page-card-1').click();
    await page.getByRole('button', { name: 'Заполнить страницу' }).click();
    await expect(page.getByTestId('form-save')).toBeVisible({ timeout: 30_000 });

    const freeTemplate = page.getByText('Свободная страница');
    if (await freeTemplate.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await freeTemplate.click();
      await expect(page.getByText('Добавить фото')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByPlaceholder('Введите текст')).toBeVisible();
    }

    await page.getByTestId('form-save').click();
    await expect(page.getByText(/Страница 1 из/)).toBeVisible({ timeout: 30_000 });
  });
});
