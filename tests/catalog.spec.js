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

test('mixed listing search has no investment-versus-renovation choice and filters metro and unit count', async ({ page }) => {
  await expect(page.locator('#reiListingRenovationFilter')).toHaveCount(0);
  const metroFilter = page.locator('#reiListingMetroFilter');
  const unitsFilter = page.locator('#reiListingUnitsFilter');
  const search = page.locator('#reiListingSearch');
  const visibleCards = page.locator('#reiHomeListingCatalog article[role="button"]:visible');
  const allCards = page.locator('#reiHomeListingCatalog article[role="button"]');
  const renoTypes = await allCards.evaluateAll(nodes => new Set(nodes.map(node => node.dataset.reno)).size);
  expect(renoTypes).toBeGreaterThan(1); // mixed set: renovation candidates and other opportunities
  for (const metro of ['all', '10', '15']) {
    for (const units of ['all', '2', '3']) {
      await metroFilter.selectOption(metro);
      await unitsFilter.selectOption(units);
      await search.fill('');
      const cards = await visibleCards.evaluateAll(nodes => nodes.map(node => ({
        search: node.dataset.search || '',
        metro: node.dataset.metro === '' ? null : Number(node.dataset.metro),
        units: Number(node.dataset.units || 0)
      })));
      for (const card of cards) {
        if (metro !== 'all') {
          expect(card.metro).not.toBeNull();
          expect(card.metro).toBeLessThanOrEqual(Number(metro));
        }
        if (units !== 'all') expect(card.units).toBeGreaterThanOrEqual(Number(units));
      }
    }
  }
  await metroFilter.selectOption('all');
  await unitsFilter.selectOption('all');
  await search.fill('Hejtmanská');
  expect(await visibleCards.count()).toBeGreaterThan(0);
  const matchingTexts = await visibleCards.allTextContents();
  expect(matchingTexts.every(text => text.includes('Hejtmanská'))).toBeTruthy();
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


test('all main tools load without uncaught JavaScript errors', async ({ page }) => {
  const routes = [
    '/index.html',
    '/investicni-kalkulacka.html',
    '/investicni-kalkulacka-nova.html',
    '/odhad-zastavni-hodnoty.html',
    '/spravce-projektu.html',
    '/call-brief.html',
    '/lukrativita-okoli.html'
  ];
  for (const route of routes) {
    const errors = [];
    const onPageError = error => errors.push(error.message);
    page.on('pageerror', onPageError);
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response && response.ok(), route + ' should return HTTP 200').toBeTruthy();
    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors, 'Uncaught page errors on ' + route).toEqual([]);
    page.off('pageerror', onPageError);
  }
});

test('empty source feed explains that portal connectors are not configured', async ({ page }) => {
  await page.getByRole('button', { name: /Aktualizovat inzeráty/ }).click();
  await expect(page.locator('#reiListingRefreshStatus')).toContainText('Žádné nové nabídky');
  await expect(page.locator('#reiListingRefreshStatus')).toContainText('automatické zdroje inzertních portálů');
});
