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

test('all combinations of metro, unit-count and renovation filters behave consistently', async ({ page }) => {
  const metroFilter = page.locator('#reiListingMetroFilter');
  const unitsFilter = page.locator('#reiListingUnitsFilter');
  const renovationFilter = page.locator('#reiListingRenovationFilter');
  const search = page.locator('#reiListingSearch');
  const visibleCards = page.locator('#reiHomeListingCatalog article[role="button"]:visible');
  for (const metro of ['all', '10', '15']) {
    for (const units of ['all', '2', '3']) {
      for (const renovation of ['all', 'yes', 'attic']) {
        await metroFilter.selectOption(metro);
        await unitsFilter.selectOption(units);
        await renovationFilter.selectOption(renovation);
        await search.fill('');
        const cards = await visibleCards.evaluateAll(nodes => nodes.map(node => ({
          search: node.dataset.search || '',
          metro: node.dataset.metro === '' ? null : Number(node.dataset.metro),
          units: Number(node.dataset.units || 0),
          renovation: node.dataset.reno,
          attic: node.dataset.attic
        })));
        for (const card of cards) {
          if (metro !== 'all') expect(card.metro).not.toBeNull();
          if (metro !== 'all') expect(card.metro).toBeLessThanOrEqual(Number(metro));
          if (units !== 'all') expect(card.units).toBeGreaterThanOrEqual(Number(units));
          if (renovation === 'yes') expect(card.renovation).toBe('yes');
          if (renovation === 'attic') expect(card.attic).toBe('yes');
        }
      }
    }
  }
  await metroFilter.selectOption('all');
  await unitsFilter.selectOption('all');
  await renovationFilter.selectOption('all');
  await search.fill('Hejtmanská');
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.first()).toContainText('Hejtmanská');
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
