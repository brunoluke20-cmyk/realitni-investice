(() => {
  'use strict';
  const tools = [
    ['index.html', '🏠', 'Přehled nástrojů'],
    ['investicni-kalkulacka.html', '🧮', 'Investiční kalkulačka'],
    ['odhad-zastavni-hodnoty.html', '🏦', 'Odhad zástavní hodnoty'],
    ['spravce-projektu.html', '📋', 'Správce projektu a prohlídky'],
    ['call-brief.html', '📞', 'Příprava na telefonát'],
    ['lukrativita-okoli.html', '📍', 'Lukrativita okolí']
  ];
  const current = location.pathname.split('/').pop() || 'index.html';
  // Snapshot the current listing before navigating so the next tool receives the same property.
  function syncCurrentListing() {
    try {
      const read = (...ids) => {
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && String(el.value || '').trim()) return String(el.value).trim();
        }
        return '';
      };
      const old = JSON.parse(localStorage.getItem('rei-shared-project-v1') || '{}');
      const address = read('locationAnalysisAddress', 'listingAddress', 'address');
      const name = read('name', 'listingName', 'projectName') || old.name || old.title || address;
      const url = read('listingURL', 'url', 'listingUrl') || old.url || old.listingURL || '';
      const price = read('listingPrice', 'price', 'purchase') || old.price || old.listingPrice || '';
      const area = read('listingArea', 'area') || old.area || old.listingArea || '';
      const next = { ...old, name, title: name || old.title || '', address: address || old.address || old.location || '', location: address || old.location || old.address || '', url, listingURL: url, price, listingPrice: price, area, listingArea: area, updatedAt: new Date().toISOString() };
      localStorage.setItem('rei-shared-project-v1', JSON.stringify(next));
    } catch (_e) {}
  }
  document.addEventListener('click', event => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch (_e) { return; }
    if (target.origin !== location.origin || !tools.some(([href]) => href === target.pathname.split('/').pop())) return;
    syncCurrentListing();
  }, true);
  const style = document.createElement('style');
  style.textContent = `
    #reiMenuButton{display:none}
    #reiMenuShade{position:fixed;inset:0;background:rgba(9,20,34,.5);z-index:2147482000;opacity:0;visibility:hidden;transition:opacity .22s,visibility .22s}
    #reiMenuShade.rei-open{opacity:1;visibility:visible}
    #reiSideMenu{position:fixed;inset:0 auto 0 0;width:min(86vw,330px);background:#fff;z-index:2147482001;transform:translateX(-105%);transition:transform .24s ease;box-shadow:12px 0 36px #08182a30;padding:22px 16px;overflow-y:auto;color:#17212b;font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
    #reiSideMenu.rei-open{transform:translateX(0)}
    #reiSideMenu *{box-sizing:border-box}
    #reiSideMenu .rei-menu-head{padding:8px 8px 18px;border-bottom:1px solid #e4e9ef;margin-bottom:12px}
    #reiSideMenu .rei-menu-head strong{display:block;font-size:18px}
    #reiSideMenu .rei-menu-head small{color:#647180}
    #reiSideMenu a{display:flex;align-items:center;gap:10px;padding:13px 11px;border-radius:10px;color:#263548;text-decoration:none;margin:4px 0;font-weight:600}
    #reiSideMenu a.rei-current{background:#eaf0ff;color:#173fa8}
    #reiSideMenu a:focus-visible,#reiMenuButton:focus-visible,#reiMenuClose:focus-visible{outline:3px solid #7da2ff;outline-offset:2px}
    #reiMenuClose{float:right;border:0;border-radius:9px;background:#eef2f7;padding:8px 12px;font:inherit;cursor:pointer}
    @media(max-width:680px){
      #reiMenuButton{display:flex;position:fixed;top:10px;left:10px;z-index:2147481999;align-items:center;gap:8px;border:1px solid #ffffff55;border-radius:11px;background:#13243a;color:#fff;padding:10px 13px;font:600 14px/1.2 system-ui,sans-serif;box-shadow:0 3px 12px #08182a35;cursor:pointer}
      body>header{padding-top:68px!important}
      #projectToolsNav,#sharedProjectTools{display:none!important}
      #reiSideMenu{padding-top:max(18px,env(safe-area-inset-top))}
    }
    @media(min-width:681px){#reiMenuShade,#reiSideMenu{display:none!important}}
  `;
  document.head.appendChild(style);
  const button = document.createElement('button');
  button.id = 'reiMenuButton';
  button.type = 'button';
  button.setAttribute('aria-label', 'Otevřít menu nástrojů');
  button.setAttribute('aria-controls', 'reiSideMenu');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true" style="font-size:20px;line-height:16px">☰</span><span>Nástroje</span>';
  const shade = document.createElement('div');
  shade.id = 'reiMenuShade';
  shade.setAttribute('aria-hidden', 'true');
  const menu = document.createElement('nav');
  menu.id = 'reiSideMenu';
  menu.setAttribute('aria-label', 'Přepínání nástrojů');
  menu.setAttribute('aria-hidden', 'true');
  menu.innerHTML = '<div class="rei-menu-head"><button id="reiMenuClose" type="button" aria-label="Zavřít menu">✕</button><strong>Realitní investice</strong><small>Přepnout nástroj</small></div>' +
    tools.map(([href, icon, label]) => '<a href="' + href + '"' + (href === current ? ' class="rei-current" aria-current="page"' : '') + '><span aria-hidden="true">' + icon + '</span><span>' + label + '</span>' + (href === current ? '<span style="margin-left:auto" aria-hidden="true">✓</span>' : '') + '</a>').join('') +
    '<p style="font-size:12px;color:#647180;margin:20px 8px 0">Vyplněné údaje zůstávají uložené v tomto prohlížeči.</p>';
  document.body.append(button, shade, menu);
  const closeButton = menu.querySelector('#reiMenuClose');
  function setOpen(open) {
    shade.classList.toggle('rei-open', open);
    menu.classList.toggle('rei-open', open);
    button.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    shade.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) closeButton.focus();
    else button.focus();
  }
  button.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));
  shade.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('rei-open')) setOpen(false); });
})();