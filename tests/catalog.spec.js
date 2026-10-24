import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#reiHomeListingCatalog').waitFor();
  // The login gate is an external service dependency; tests focus on catalog behavior.
  await page.addStyleTag({ content: '#reiSharedAuthGate{display:none!important} #reiSharedLogout{display:none!important}' });
  await expect(page.locator('#reiListingRefreshButton')).toBeVisible();
  await expect(page.locator('#reiHomeListingCatalog article[role="button"]').first()).toBeVisible();
});

test('catalog renders only house-style listings and preserves chooser', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Bytové a vícegenerační domy' })).toBeVisible();
  const cards = page.locator('#reiHomeListingCatalog article[role="button"]');
  expect(await cards.count()).toBeGreaterThan(0);
  await cards.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: /Investiční kalkulačka/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Odhad hodnoty nemovitosti/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lukrativita okolí/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Brief na telefonát/ })).toBeVisible();
});

test('metro, unit-count, renovation and text filters combine', async ({ page }) => {
  const cards = page.locator('#reiHomeListingCatalog article[role="button"]');
  const initialCount = await cards.count();
  await page.locator('#reiListingMetroFilter').selectOption('10');
  let visible = page.locator('#reiHomeListingCatalog article[role="button"]:visible');
  expect(await visible.count()).toBeGreaterThan(0);
  expect(await visible.count()).toBeLessThanOrEqual(initialCount);

  await page.locator('#reiListingUnitsFilter').selectOption('3');
  expect(await visible.count()).toBeGreaterThan(0);
  await page.locator('#reiListingRenovationFilter').selectOption('yes');
  expect(await visible.count()).toBeGreaterThan(0);
  await page.locator('#reiListingSearch').fill('Hejtmanská');
  await expect(visible).toHaveCount(1);
  await expect(visible.first()).toContainText('Hejtmanská');
});

test('refresh merges new feed entries and deduplicates repeated URLs', async ({ page }) => {
  const fixture = {
    version: 1,
    note: 'Testovací zdroj',
    listings: [{
      title: 'Testovací bytový dům – Praha',
      url: 'https://example.com/testovaci-bytovy-dum-001',
      address: 'Praha 4',
      price: 12000000,
      floorArea: 180,
      layout: '3 bytové jednotky',
      metro: 'Metro – 7 minut pěšky',
      potential: 'Rekonstrukce a půdní vestavba',
      notes: 'Testovací záznam, ne reálná nabídka.'
    }]
  };
  await page.route('**/listings-feed.json*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(fixture)
  }));
  await page.getByRole('button', { name: /Aktualizovat inzeráty/ }).click();
  const testCard = page.locator('#reiHomeListingCatalog article[role="button"]').filter({ hasText: 'Testovací bytový dům – Praha' });
  await expect(testCard).toHaveCount(1);
  await expect(page.locator('#reiListingRefreshStatus')).toContainText('Přidáno 1');
  await page.getByRole('button', { name: /Aktualizovat inzeráty/ }).click();
  await expect(testCard).toHaveCount(1);
  await expect(page.locator('#reiListingRefreshStatus')).toContainText('Žádné nové nabídky');
});

test('malicious listing title is rendered as text, not HTML', async ({ page }) => {
  await page.route('**/listings-feed.json*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ listings: [{
      title: '<img src=x onerror=alert(1)> bytový dům',
      url: 'https://example.com/test-safe-render-002',
      address: 'Praha',
      layout: '2 bytové jednotky'
    }] })
  }));
  await page.getByRole('button', { name: /Aktualizovat inzeráty/ }).click();
  const card = page.locator('#reiHomeListingCatalog article[role="button"]').filter({ hasText: '<img src=x onerror=alert(1)> bytový dům' });
  await expect(card).toHaveCount(1);
  await expect(card.locator('img')).toHaveCount(0);
});

test('empty source feed explains that portal connectors are not configured', async ({ page }) => {
  await page.getByRole('button', { name: /Aktualizovat inzeráty/ }).click();
  await expect(page.locator('#reiListingRefreshStatus')).toContainText('Žádné nové nabídky');
  await expect(page.locator('#reiListingRefreshStatus')).toContainText('automatické zdroje inzertních portálů');
});
