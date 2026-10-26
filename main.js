/* CasualWax landing prototype: language, currency, reel, print picker, quick add, entrances.
   In the Shopify theme, language and currency come from Shopify Markets (localization form);
   this file only imitates that so the prototype can be reviewed in all four markets. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem('cw.' + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('cw.' + k, v); } catch { /* storage unavailable */ } },
  };

  /* ---------- content: written by the admin panel into site-data.js (window.CW_DATA) ----------
     Shopify: texts are theme translations, products and prices come from the catalogue and
     Markets, the waxes from a metaobject behind the "Wax" product option. */
  const D = window.CW_DATA;
  const live = (list) => list.filter((x) => x.status === 'live');
  const PRODUCTS = live(D.products);
  /* Wax panels on sale. photos: the products that have a real photo in this wax
     (assets/products/{piece}-{id}-800.webp and -1600.webp); the admin fills it in on publish.
     Every other piece shows a preview rendered into its green-patch model by wax-render.js.
     place: optional { scale, rotate, x, y, shade } for the rendered preview. */
  const WAX = live(D.waxes);
  const T = { en: { ...D.texts.en }, fr: { ...D.texts.fr } };
  for (const lang of ['en', 'fr']) {
    PRODUCTS.forEach((p) => {
      T[lang]['p.' + p.id] = p.name[lang];
      T[lang]['p.' + p.id + '.l'] = p.line[lang];
      T[lang]['image.' + p.id] = p.alt[lang];
    });
    WAX.forEach((w) => { T[lang]['image.' + w.id] = w.alt[lang]; });
  }
  const CURRENCIES = D.settings.currencies;
  const PRICES = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.prices]));
  const LOCALE = { EUR: { en: 'en-IE', fr: 'fr-FR' }, GBP: { en: 'en-GB', fr: 'fr-FR' }, CAD: { en: 'en-CA', fr: 'fr-CA' }, USD: { en: 'en-US', fr: 'fr-FR' } };
  const PRINTS = Object.fromEntries(WAX.map((w) => [w.id, w.name]));

  /* ---------- detect language and currency, no market first ---------- */
  function detect() {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    const lang = /^fr\b/i.test(langs[0]) ? 'fr' : 'en';
    const region = (langs[0].split('-')[1] || '').toUpperCase();
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    let cur = { GB: 'GBP', CA: 'CAD', US: 'USD', FR: 'EUR', BE: 'EUR', LU: 'EUR' }[region];
    if (!cur) {
      if (/^Europe\/London/.test(tz)) cur = 'GBP';
      else if (/^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns)/.test(tz)) cur = 'CAD';
      else if (/^America\//.test(tz)) cur = 'USD';
      else if (/^Europe\//.test(tz)) cur = 'EUR';
      else cur = lang === 'fr' ? 'EUR' : 'USD';
    }
    return { lang, cur };
  }
  const guess = detect();
  const qs = new URLSearchParams(location.search); /* ?lang=fr&cur=CAD, for reviewing each market */
  if (T[qs.get('lang')]) store.set('lang', qs.get('lang'));
  if (qs.get('cur') && CURRENCIES.includes(qs.get('cur').toUpperCase())) store.set('cur', qs.get('cur').toUpperCase());
  const state = {
    lang: T[store.get('lang')] ? store.get('lang') : guess.lang,
    cur: CURRENCIES.includes(store.get('cur')) ? store.get('cur') : CURRENCIES.includes(guess.cur) ? guess.cur : CURRENCIES[0],
    print: WAX.some((w) => w.id === D.settings.defaultWax) ? D.settings.defaultWax : WAX[0].id,
    cart: 0,
  };
  const t = (k) => (T[state.lang][k] ?? T.en[k] ?? '');

  function applyImageAlts() {
    $$('img[data-image-print]').forEach((img) => {
      const piece = img.hasAttribute('data-worn')
        ? `${t('image.worn')} ${t('p.' + img.dataset.product).toLowerCase()}`
        : t('image.' + img.dataset.product);
      img.alt = `${piece}. ${PRINTS[img.dataset.imagePrint]}: ${t('image.' + img.dataset.imagePrint)}. ${t(img.hasAttribute('data-preview') ? 'image.preview' : 'image.concept')}.`;
    });
    $$('img[data-detail]').forEach((img) => {
      img.alt = `${t('details.' + img.dataset.detail)} ${t('image.concept')}.`;
    });
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
    $$('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === state.lang)));
    const tl = $('[data-action="toggle-lang"]'); if (tl) tl.setAttribute('aria-label', t('aria.lang'));
    applyCurrency();
    applyImageAlts();
  }
  function applyCurrency() {
    const fmt = new Intl.NumberFormat(LOCALE[state.cur][state.lang], { style: 'currency', currency: state.cur, maximumFractionDigits: 0, minimumFractionDigits: 0 });
    $$('[data-price]').forEach((el) => { const p = PRICES[el.dataset.price]; if (p) el.textContent = fmt.format(p[state.cur]); });
    $$('[data-currency-select]').forEach((s) => { s.value = state.cur; });
  }
  function setLang(l) { state.lang = l; store.set('lang', l); applyLang(); }

  document.addEventListener('click', (e) => {
    const lb = e.target.closest('[data-set-lang]'); if (lb) setLang(lb.dataset.setLang);
    if (e.target.closest('[data-action="toggle-lang"]')) setLang(state.lang === 'en' ? 'fr' : 'en');
  });
  $$('[data-currency-select]').forEach((s) => s.addEventListener('change', () => { state.cur = s.value; store.set('cur', s.value); applyCurrency(); }));

  /* ---------- phone menu ---------- */
  const menuBtn = $('[data-action="menu"]'); const menu = $('#menu');
  if (menuBtn && menu) {
    const close = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    menuBtn.addEventListener('click', () => {
      const open = menu.hidden; menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { close(); menuBtn.focus(); } });
  }

  /* ---------- collections: the active row swaps the picture ---------- */
  const rows = $$('[data-rows] .row');
  const setCol = (key) => {
    rows.forEach((r) => r.classList.toggle('is-active', r.dataset.col === key));
    $$('[data-col-art]').forEach((a) => a.classList.toggle('is-active', a.dataset.colArt === key));
  };
  rows.forEach((r) => {
    r.addEventListener('pointerenter', () => setCol(r.dataset.col));
    r.addEventListener('focusin', () => setCol(r.dataset.col));
  });
  if ('IntersectionObserver' in window && rows.length) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setCol(e.target.dataset.col); }), { rootMargin: '-48% 0px -48% 0px' });
    rows.forEach((r) => io.observe(r));
  }

  /* ---------- wax on each piece: the photo when there is one, otherwise a rendered preview ---------- */
  const featured = $('.featured');
  const waxOf = (id) => WAX.find((w) => w.id === id);
  const hasPhoto = (wax, piece) => (wax.photos || []).includes(piece);
  const modelOf = (piece) => (D.products.find((p) => p.id === piece) || {}).model || `assets/models/${piece}.webp`;

  // One card per live product, in the admin's order. The cards in the HTML stand in for the
  // Shopify product-card snippet; a new product reuses the first one as its template.
  function sizeOptions(select, p) {
    select.replaceChildren(...(p.sizes || [null]).map((v) => {
      const o = document.createElement('option');
      if (v) { o.textContent = v; o.selected = v === p.defaultSize; } else { o.dataset.i18n = 'onesize'; o.textContent = t('onesize'); }
      return o;
    }));
  }
  if (featured) {
    const list = $('[data-products]', featured);
    const html = new Map($$('.product', list).map((c) => [c.dataset.product, c]));
    const template = list.firstElementChild;
    list.replaceChildren(...PRODUCTS.map((p) => {
      let card = html.get(p.id);
      if (!card) {
        card = template.cloneNode(true);
        card.dataset.product = p.id;
        const img = $('[data-product-image]', card);
        img.removeAttribute('srcset'); img.removeAttribute('src');
        img.dataset.product = p.id; img.dataset.imagePrint = '';
        $$('[data-i18n^="p."]', card).forEach((el) => { el.dataset.i18n = el.dataset.i18n.replace(/^p\.[^.]+/, 'p.' + p.id); });
        $('[data-price]', card).dataset.price = p.id;
        $('[data-studio-link]', card).href = `studio.html?piece=${p.id}`;
      }
      const select = $('select', card);
      select.id = 'size-' + p.id;
      $('label', card).htmlFor = select.id;
      sizeOptions(select, p);
      return card;
    }));
    // The print picker lists the live waxes.
    const sw = $('[data-swatches]', featured);
    if (sw) sw.replaceChildren(...WAX.map((w) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(w.id === state.print));
      b.dataset.setPrint = w.id;
      const i = document.createElement('img');
      Object.assign(i, { src: w.tile, alt: '', width: 40, height: 40, decoding: 'async' });
      const name = document.createElement('span');
      name.textContent = w.name;
      b.append(i, name);
      return b;
    }));
  }
  const cards = featured ? $$('.product', featured) : [];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const models = new Map(); const tiles = new Map(); const previews = new Map();
  const once = (map, key, make) => {
    if (!map.has(key)) map.set(key, make().catch((err) => { map.delete(key); throw err; }));
    return map.get(key);
  };

  // Models and tiles load only when a customer first picks a wax without photos.
  // model: a picture whose sewn patch is painted pure green (#00FF00).
  const prepared = (model) => once(models, model, async () => {
    const img = await WaxRender.loadImage(model);
    return WaxRender.prepare(img, Math.min(img.naturalWidth, 1600));
  });
  function preview(model, wax) {
    return once(previews, `${model}|${wax.id}`, async () => {
      const [prep, fab] = await Promise.all([
        prepared(model),
        once(tiles, wax.id, () => WaxRender.fabric(wax.tile, wax.repeat)),
      ]);
      const canvas = WaxRender.render(prep, fab, wax.place);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
      return URL.createObjectURL(blob);
    });
  }

  // The picture for a piece in a wax, decoded and ready to swap in.
  async function pictureFor(piece, wax, sizes) {
    if (!hasPhoto(wax, piece)) return { src: await preview(modelOf(piece), wax), srcset: '', preview: true };
    const path = `assets/products/${piece}-${wax.id}`;
    const s = { src: `${path}-800.webp`, srcset: `${path}-800.webp 800w, ${path}-1600.webp 1600w`, preview: false };
    const next = new Image();
    next.sizes = sizes;
    next.srcset = s.srcset;
    next.src = s.src;
    await next.decode();
    return s;
  }
  const source = (card, wax) => pictureFor(card.dataset.product, wax, $('[data-product-image]', card).sizes);

  function check(card, id) {
    $$('[data-card-wax]', card).forEach((b) => {
      const on = b.dataset.cardWax === id;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }

  function wear(card, wax, s) {
    const img = $('[data-product-image]', card);
    if (s.srcset) img.srcset = s.srcset; else img.removeAttribute('srcset');
    img.src = s.src;
    img.dataset.imagePrint = wax.id;
    img.toggleAttribute('data-preview', s.preview);
    card.dataset.wax = wax.id;
    $$('[data-print-name]', card).forEach((el) => { el.textContent = wax.name; });
    check(card, wax.id);
    linkStudio(card);
  }

  // The card opens the studio on its piece, in the wax it is wearing.
  function linkStudio(card) {
    $$('[data-studio-link]', card).forEach((a) => { a.href = `studio.html?piece=${card.dataset.product}&wax=${card.dataset.wax}`; });
  }

  // The swatch answers at once; the picture blurs while the next one loads, then sharpens into it.
  // The blur holds at least 140ms so a cached picture still reads as a change. Keys swap instantly.
  const settle = (animate) => (animate ? wait(140) : null);

  async function dress(card, id, instant) {
    const wax = waxOf(id); if (!wax) return;
    const request = (card.waxRequest = (card.waxRequest || 0) + 1);
    const animate = !reduced && !instant && card.dataset.wax !== id;
    check(card, id);
    card.classList.toggle('is-switching', animate);
    card.setAttribute('aria-busy', 'true');
    let s;
    try {
      [s] = await Promise.all([source(card, wax), settle(animate)]);
    } catch {
      if (request !== card.waxRequest) return;
      check(card, card.dataset.wax);
      card.classList.remove('is-switching');
      card.removeAttribute('aria-busy');
      return;
    }
    if (request !== card.waxRequest) return;
    wear(card, wax, s);
    applyImageAlts();
    card.classList.remove('is-switching');
    card.removeAttribute('aria-busy');
  }

  // The print picker re-dresses every piece at once.
  let printRequest = 0;
  let requestedPrint = state.print;
  const markPrint = (key) => $$('[data-set-print]', featured).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setPrint === key)));
  async function setPrint(key, scroll, instant) {
    const wax = waxOf(key); if (!wax || !featured) return;
    requestedPrint = key;
    const request = ++printRequest;
    cards.forEach((c) => { c.waxRequest = (c.waxRequest || 0) + 1; c.classList.remove('is-switching'); c.removeAttribute('aria-busy'); });
    if (scroll) featured.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    const changing = cards.filter((c) => c.dataset.wax !== key);
    const animate = !reduced && !instant && changing.length > 0;
    markPrint(key);
    changing.forEach((c) => check(c, key));
    featured.classList.toggle('is-switching', animate);
    let sources;
    try {
      [sources] = await Promise.all([Promise.all(changing.map((c) => source(c, wax))), settle(animate)]);
    } catch {
      if (request !== printRequest) return;
      requestedPrint = state.print;
      markPrint(state.print);
      changing.forEach((c) => check(c, c.dataset.wax));
      featured.classList.remove('is-switching');
      return;
    }
    if (request !== printRequest) return;
    state.print = key;
    featured.dataset.print = key;
    changing.forEach((c, i) => wear(c, wax, sources[i]));
    $$('[data-print-name]', $('.featured-pin', featured)).forEach((el) => { el.textContent = wax.name; });
    applyImageAlts();
    featured.classList.remove('is-switching');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set-print]'); if (!b) return;
    const fromCard = !featured.contains(b);
    if (fromCard) e.preventDefault();
    setPrint(b.dataset.setPrint, fromCard);
  });

  // Each card gets its own wax swatches (Shopify: the "Wax" option of that product).
  cards.forEach((card) => {
    card.dataset.wax = $('[data-product-image]', card).dataset.imagePrint;
    const group = document.createElement('div');
    group.className = 'card-wax';
    group.setAttribute('role', 'radiogroup');
    group.dataset.i18nLabel = 'wax.choose';
    WAX.forEach((w) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.cardWax = w.id;
      b.setAttribute('aria-label', w.name);
      b.title = w.name;
      const on = w.id === card.dataset.wax;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      const swatch = document.createElement('img');
      Object.assign(swatch, { src: w.tile, alt: '', width: 40, height: 40, loading: 'lazy', decoding: 'async' });
      b.append(swatch);
      group.append(b);
    });
    group.addEventListener('click', (e) => { const b = e.target.closest('[data-card-wax]'); if (b) dress(card, b.dataset.cardWax); });
    group.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const now = WAX.findIndex((w) => w.id === card.dataset.wax);
      const k = WAX[(now + dir + WAX.length) % WAX.length].id;
      dress(card, k, true);
      $(`[data-card-wax="${k}"]`, group).focus();
    });
    const stage = $('.stage', card);
    const pic = $('[data-product-image]', stage);
    const picLink = document.createElement('a');
    picLink.className = 'stage-link';
    picLink.dataset.studioLink = '';
    picLink.tabIndex = -1;                       // the product name carries the same link for keyboards
    picLink.setAttribute('aria-hidden', 'true');
    pic.replaceWith(picLink);
    picLink.append(pic);
    linkStudio(card);
    const tag = document.createElement('span');
    tag.className = 'stage-tag';
    tag.dataset.i18n = 'wax.preview';
    stage.append(tag);
    stage.after(group);
  });

  /* ---------- hero: pick the wax and the piece. The field takes the wax's own colour, a band of the
     print is sewn across it, and the piece wears it. It plays by itself until the visitor takes over. ---------- */
  const hero = $('[data-hero]');
  if (hero && WAX.length && PRODUCTS.length) {
    const fig = $('[data-hero-stage]', hero);
    const img = $('[data-hero-img]', hero);
    const band = $('[data-hero-band]', hero);
    const waxBox = $('[data-hero-wax]', hero);
    const pieceBox = $('[data-hero-pieces]', hero);
    const H = { piece: PRODUCTS.some((p) => p.id === 'hoodie') ? 'hoodie' : PRODUCTS[0].id, wax: state.print };

    // The page keeps its dark ground: the wax shows in the band and on the piece only.
    const tones = new Map();
    const tone = (wax) => once(tones, wax.id, async () => {
      const tile = await WaxRender.loadImage(wax.tile);
      return { aspect: tile.naturalWidth / tile.naturalHeight, svg: /\.svg($|\?)/i.test(wax.tile) };
    });

    // The band: each new print is sewn in from the left over the last one, then keeps drifting.
    const shift = document.createElement('span');
    shift.className = 'hero-band-shift';
    band.append(shift);
    $$('.hero-band-run', band).forEach((r) => r.remove());
    function sew(wax, tn, animate) {
      const run = document.createElement('span');
      run.className = 'hero-band-run';
      const h = Math.max(1, shift.clientHeight);
      const th = tn.svg ? h / 2 : h;                         // a drawn tile repeats twice in the band's height
      const tw = Math.round(th * tn.aspect);
      run.style.setProperty('--tile', `url("${wax.tile}")`);
      run.style.setProperty('--tw', tw + 'px');
      run.style.setProperty('--loom', (tw / 26).toFixed(2) + 's');
      run.style.backgroundSize = `${tw}px ${th}px`;
      run.style.backgroundRepeat = 'repeat';
      const old = $$('.hero-band-run', shift);
      if (animate) run.classList.add('is-sewing');
      shift.append(run);
      if (!animate) { old.forEach((o) => o.remove()); return; }
      void run.offsetWidth;
      run.classList.add('is-sewn');
      run.addEventListener('transitionend', () => old.forEach((o) => o.remove()), { once: true });
    }

    // Swatches and pieces: radio groups with arrow keys.
    const radio = (box, attr, label, child) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset[attr] = label.id;
      if (label.i18n) b.dataset.i18nLabel = label.i18n;
      b.setAttribute('aria-label', label.text); b.title = label.text;
      b.append(child); box.append(b); return b;
    };
    WAX.forEach((w) => {
      const i = document.createElement('img');
      Object.assign(i, { src: w.tile, alt: '', width: 44, height: 44, decoding: 'async' });
      radio(waxBox, 'heroWax', { id: w.id, text: w.name }, i);
    });
    const thumbs = new Map();
    PRODUCTS.forEach((p) => {
      const i = document.createElement('img');
      Object.assign(i, { alt: '', width: 52, height: 65, decoding: 'async' });
      thumbs.set(p.id, i);
      radio(pieceBox, 'heroPiece', { id: p.id, text: t('p.' + p.id), i18n: 'p.' + p.id }, i);
    });
    const check = (box, attr, id) => $$('[role="radio"]', box).forEach((b) => {
      const on = b.dataset[attr] === id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
    });

    let req = 0;
    async function dressPiece(instant) {
      const r = ++req; const wax = waxOf(H.wax); const animate = !reduced && !instant;
      fig.classList.toggle('is-switching', animate); fig.setAttribute('aria-busy', 'true');
      try {
        const [s] = await Promise.all([pictureFor(H.piece, wax, img.sizes), settle(animate)]);
        if (r !== req) return;
        if (s.srcset) img.srcset = s.srcset; else img.removeAttribute('srcset');
        img.src = s.src; img.dataset.product = H.piece; img.dataset.imagePrint = wax.id;
        img.toggleAttribute('data-preview', s.preview);
        applyImageAlts();
      } catch { /* keep the current picture */ }
      if (r === req) { caption(); fig.classList.remove('is-switching'); fig.removeAttribute('aria-busy'); }
    }
    // The choice is marked at once; the name, price and link change with the picture, so they never disagree.
    function marks() { check(waxBox, 'heroWax', H.wax); check(pieceBox, 'heroPiece', H.piece); }
    function caption() {
      const wax = waxOf(H.wax);
      const name = $('[data-hero-name]', hero); name.dataset.i18n = 'p.' + H.piece; name.textContent = t('p.' + H.piece);
      $('[data-hero-print]', hero).textContent = wax.name;
      $('[data-hero-price]', hero).dataset.price = H.piece;
      $$('[data-hero-link]', hero).forEach((a) => { a.href = `studio.html?piece=${H.piece}&wax=${wax.id}`; });
      applyCurrency();
    }
    const label = () => { marks(); caption(); };
    async function setHeroWax(id, instant) {
      const wax = waxOf(id); if (!wax) return;
      H.wax = id; marks(); dressPiece(instant);
      PRODUCTS.forEach((p) => pictureFor(p.id, wax, '52px').then((s) => { if (H.wax === id) thumbs.get(p.id).src = s.src; }).catch(() => {}));
      try {
        const tn = await tone(wax);
        if (H.wax !== id) return;
        sew(wax, tn, !reduced && !instant);
      } catch { /* the band keeps the last print */ }
    }
    function setHeroPiece(id, instant) { if (id === H.piece) return; H.piece = id; marks(); dressPiece(instant); align(); }

    // The band runs at the height of the piece's own panel, as if the panel carried on across the field.
    let panelAt = 0.4;
    function place() {
      const want = fig.offsetTop + fig.offsetHeight * panelAt - band.offsetHeight / 2;
      // never behind the text beside the piece (wide screens put it in the same row)
      const floor = Math.min(fig.offsetTop + fig.offsetHeight, ...$$('.hero-foot, .hero-piece', hero).map((e) => e.offsetTop - 20).filter((y) => y > fig.offsetTop));
      const top = Math.min(Math.max(want, fig.offsetTop), floor - band.offsetHeight);
      band.style.translate = `0 ${Math.round(top - band.offsetTop)}px`;
    }
    function align() {
      const id = H.piece;
      prepared(modelOf(id)).then((p) => {
        if (id !== H.piece || !p.found) return;
        panelAt = (p.box.y0 + p.box.y1) / 2 / p.h;
        place();
      }).catch(() => {});
    }

    // It plays by itself (a new piece every few seconds, a new wax after each round) until the
    // visitor picks something; it rests while hovered, focused, off screen or in a hidden tab.
    let timer = null; let held = false; let seen = true; let round = 0; let taken = false;
    const tick = () => {
      const ids = PRODUCTS.map((p) => p.id); const n = (ids.indexOf(H.piece) + 1) % ids.length;
      if (n === 0 && ++round) { const w = WAX[(WAX.findIndex((x) => x.id === H.wax) + 1) % WAX.length]; H.piece = ids[0]; setHeroWax(w.id); }
      else setHeroPiece(ids[n]);
    };
    const run = () => { const go = !reduced && !taken && !held && seen && !document.hidden; if (go && !timer) timer = setInterval(tick, 3400); if (!go && timer) { clearInterval(timer); timer = null; } };
    const take = () => { taken = true; run(); };
    fig.addEventListener('pointerenter', () => { held = true; run(); });
    fig.addEventListener('pointerleave', () => { held = false; run(); });
    hero.addEventListener('focusin', () => { held = true; run(); });
    hero.addEventListener('focusout', () => { held = false; run(); });
    document.addEventListener('visibilitychange', run);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); }, { threshold: 0.35 }).observe(hero);

    waxBox.addEventListener('click', (e) => { const b = e.target.closest('[data-hero-wax]'); if (!b) return; take(); setHeroWax(b.dataset.heroWax); setPrint(b.dataset.heroWax, false, true); });
    pieceBox.addEventListener('click', (e) => { const b = e.target.closest('[data-hero-piece]'); if (b) { take(); setHeroPiece(b.dataset.heroPiece); } });
    const arrows = (box, attr, list, set) => box.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault(); take();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const k = list[(list.indexOf(H[attr]) + dir + list.length) % list.length];
      set(k, true); $(`[data-hero-${attr}="${k}"]`, box).focus();
    });
    arrows(waxBox, 'wax', WAX.map((w) => w.id), (k, i) => { setHeroWax(k, i); setPrint(k, false, true); });
    arrows(pieceBox, 'piece', PRODUCTS.map((p) => p.id), setHeroPiece);

    // A swipe across the piece changes it (phones); the swipe does not open the link.
    let sx = null; let swiped = false;
    fig.addEventListener('pointerdown', (e) => { sx = e.clientX; swiped = false; });
    fig.addEventListener('pointerup', (e) => {
      if (sx == null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) < 40) return;
      swiped = true; take();
      const ids = PRODUCTS.map((p) => p.id);
      setHeroPiece(ids[(ids.indexOf(H.piece) + (dx < 0 ? 1 : -1) + ids.length) % ids.length]);
    });
    fig.addEventListener('click', (e) => { if (swiped) { e.preventDefault(); swiped = false; } });

    // The band follows the pointer a little; scrolling away pulls the sentence apart.
    if (!reduced) {
      let target = 0; let x = 0; let raf = 0;
      const halves = $$('.hero-half', hero);
      const frame = () => {
        raf = 0;
        x += (target - x) * 0.08;
        shift.style.translate = `${x.toFixed(1)}px 0`;
        const p = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight)));
        halves.forEach((h, i) => { h.style.translate = `${(i ? 1 : -1) * p * 14}vw 0`; });
        if (Math.abs(target - x) > 0.3) raf = requestAnimationFrame(frame);
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) hero.addEventListener('pointermove', (e) => { target = (e.clientX / innerWidth - 0.5) * -40; kick(); });
      addEventListener('scroll', kick, { passive: true });
    }

    label();
    const first = waxOf(H.wax);
    PRODUCTS.forEach((p) => pictureFor(p.id, first, '52px').then((s) => { thumbs.get(p.id).src = s.src; }).catch(() => {}));
    tone(first).then((tn) => sew(first, tn, !reduced)).catch(() => {});   // the first band is sewn in on arrival
    if (H.piece !== 'hoodie' || !hasPhoto(first, H.piece)) dressPiece(true);
    align();
    addEventListener('resize', () => { place(); tone(waxOf(H.wax)).then((tn) => sew(waxOf(H.wax), tn, false)); });
    run();
    document.addEventListener('click', (e) => { if (e.target.closest('[data-set-lang], [data-action="toggle-lang"]')) label(); });
  }

  // Sideways scrollers fade their right edge until the end is reached.
  const fadeEdge = (el) => {
    if (!el) return;
    const edge = () => el.classList.toggle('is-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    el.addEventListener('scroll', edge, { passive: true });
    addEventListener('resize', edge);
    edge();
  };
  const sw = $('[data-swatches]');
  fadeEdge(sw);
  if (sw) sw.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const keys = Object.keys(PRINTS); const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const k = keys[(keys.indexOf(requestedPrint) + dir + keys.length) % keys.length];
    setPrint(k, false, true); $(`[data-set-print="${k}"]`, sw).focus(); e.preventDefault();
  });
  $$('[data-set-print]', sw || document).forEach((b) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; });
  if (sw) new MutationObserver(() => $$('[data-set-print]', sw).forEach((b) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; })).observe(sw, { subtree: true, attributes: true, attributeFilter: ['aria-checked'] });

  /* ---------- quick add (Shopify: POST /cart/add.js with the variant id) ---------- */
  const toast = $('[data-toast]'); let toastTimer;
  // leaves faster than it arrived
  const hideToast = () => {
    if (reduced) { toast.hidden = true; return; }
    toast.classList.add('is-leaving');
    toastTimer = setTimeout(() => { toast.hidden = true; toast.classList.remove('is-leaving'); }, 180);
  };
  $$('[data-quick-add]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const card = form.closest('[data-product]');
    const name = `${t('p.' + card.dataset.product)}, ${PRINTS[card.dataset.wax]}`;
    const size = form.size.value;
    state.cart += 1;
    $$('[data-cart-count]').forEach((c) => { c.textContent = state.cart; c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); });
    const btn = $('.button', form); btn.textContent = t('added'); btn.classList.add('is-added');
    setTimeout(() => { btn.textContent = t('add'); btn.classList.remove('is-added'); }, 1600);
    $('[data-toast-text]', toast).textContent = `${t('toast.added')} ${name}, ${size}`;
    toast.classList.remove('is-leaving'); toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 4000);
  }));

  /* ---------- newsletter (Shopify: customer form) ---------- */
  const signup = $('[data-signup]');
  if (signup) signup.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = signup.email; const msg = $('[data-signup-msg]', signup);
    if (!input.checkValidity() || !input.value) { msg.textContent = t('signup.bad'); input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    input.removeAttribute('aria-invalid'); msg.textContent = t('signup.ok'); signup.reset();
  });

  /* ---------- entrances: heading, then text, then picture ---------- */
  const groups = [
    ['.collections', '.col-stage, .head, .row, .note'],
    ['.featured', '.product'],
    ['.prints .print-frame', '.print-card'],
    ['.made', '.made-title'],
    ['.sheet', '.sheet-name, .sheet-text, .sheet-pic'],
    ['.trust-body', '.head, .trust-facts > div'],
    ['.signup', '.signup-pic, .signup-title, .signup-body p, .signup-form'],
    ['.site-footer', '.footer-name, .footer-places li, .footer-links > div'],
  ];
  // The hero picture is not part of the entrance: it is the first thing to see, so it is there from the first paint.
  $$('.hero-half, .hero-wax, .hero-foot > *, .hero-piece > *').forEach((el, n) => { el.setAttribute('data-rise', ''); el.style.setProperty('--i', n); });
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    groups.forEach(([scope, parts]) => $$(scope).forEach((s) => $$(parts, s).forEach((el, n) => {
      el.setAttribute('data-reveal', ''); el.style.setProperty('--i', Math.min(n, 6)); io.observe(el);
    })));
  }

  const fit = () => $$('.footer-name').forEach((el) => {
    el.style.fontSize = '';
    const avail = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) * 2;
    el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail / el.scrollWidth) + 'px';
  });
  addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit); else fit();

  /* ---------- studio page: one piece, every wax, product and worn views ---------- */
  const studio = $('[data-studio]');
  if (studio) {
    const PIECES = PRODUCTS.map((p) => p.id);
    const product = (id) => PRODUCTS.find((p) => p.id === id);
    /* Every view of a piece: the green-patch product model first, then the worn shots
       (MODELS.md: fictional models whose chroma-green sewn panel WaxRender replaces with
       each fabric; source images are never shown directly). */
    const VIEWS = Object.fromEntries(PRODUCTS.map((p) => [p.id, [
      { src: p.model },
      ...(p.worn || []).map((src) => ({ src, worn: true })),
    ]]));

    const q = new URLSearchParams(location.search);
    const s = {
      piece: PIECES.includes(q.get('piece')) ? q.get('piece') : PIECES.includes('hoodie') ? 'hoodie' : PIECES[0],
      wax: waxOf(q.get('wax')) ? q.get('wax') : state.print,
      view: 0,
    };
    const panel = $('[data-studio-panel]', studio);
    const fig = $('[data-studio-stage]', studio);
    const stageImg = $('[data-studio-img]', studio);
    const piecesEl = $('[data-studio-pieces]', studio);
    const waxEl = $('[data-studio-wax]', studio);
    const viewsEl = $('[data-studio-views]', studio);
    const compareEl = $('[data-studio-compare]', studio);
    const sizeEl = $('[data-studio-size]', studio);

    const decoded = (src) => { const i = new Image(); i.src = src; return i.decode().then(() => src); };

    // The visitor's own placement of each wax (size, rotation, position, folds), from "Adjust the print".
    // Kept per wax for this visit; it only changes the preview, never the piece ordered.
    const adjusted = new Map();
    const placeOf = (wax) => adjusted.get(wax.id) || wax.place;
    const drawnUrls = new Map();                     // the last few adjusted renders, oldest dropped first
    function drawn(model, wax, place) {
      const key = `${model}|${wax.id}|${JSON.stringify(place)}`;
      if (!drawnUrls.has(key)) {
        drawnUrls.set(key, (async () => {
          const [prep, fab] = await Promise.all([prepared(model), once(tiles, wax.id, () => WaxRender.fabric(wax.tile, wax.repeat))]);
          const canvas = WaxRender.render(prep, fab, place);
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
          return URL.createObjectURL(blob);
        })());
        while (drawnUrls.size > 40) { const [k, p] = drawnUrls.entries().next().value; drawnUrls.delete(k); p.then((u) => setTimeout(() => URL.revokeObjectURL(u), 4000)).catch(() => {}); }
      }
      return drawnUrls.get(key);
    }
    // The product view shows the real photo when this wax has one and is not adjusted; every other view is drawn.
    async function picture(piece, view, waxId) {
      const wax = waxOf(waxId); const v = VIEWS[piece][view];
      const own = adjusted.get(wax.id);
      if (own) return { src: await drawn(v.src, wax, own), preview: true };
      if (!v.worn && view === 0 && hasPhoto(wax, piece)) return { src: await decoded(`assets/products/${piece}-${wax.id}-1600.webp`), preview: false };
      return { src: await preview(v.src, wax), preview: true };
    }
    // A worn shot (2:3) is narrower than its frame: paint the frame with the photo's own edge colour
    // so the bands at its sides read as more wall, not as a box.
    const edgeTone = (img) => {
      const frame = img.closest('.stage');
      if (!frame) return;
      if (!img.hasAttribute('data-worn')) { frame.style.background = ''; return; }
      const paint = () => {
        const c = document.createElement('canvas');
        c.width = 8; c.height = 32;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 8, 32);
        const d = ctx.getImageData(0, 0, 8, 32).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = 0; y < 32; y++) for (const x of [0, 7]) { const i = (y * 8 + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        frame.style.background = `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`;
        img.style.background = 'transparent';
      };
      if (img.complete && img.naturalWidth) paint(); else img.addEventListener('load', paint, { once: true });
    };
    const tagImage = (img, piece, view, waxId, pic) => {
      img.src = pic.src;
      img.dataset.product = piece;
      img.dataset.imagePrint = waxId;
      img.width = VIEWS[piece][view].worn ? 1024 : 800;
      img.height = VIEWS[piece][view].worn ? 1536 : 1000;
      img.toggleAttribute('data-preview', pic.preview);
      img.toggleAttribute('data-worn', !!VIEWS[piece][view].worn);
      if (!VIEWS[piece][view].worn) img.style.background = '';
      edgeTone(img);
    };

    const button = (cls, attrs, ...kids) => {
      const b = document.createElement('button');
      b.type = 'button';
      if (cls) b.className = cls;
      Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
      b.append(...kids);
      return b;
    };
    const span = (key, text) => { const e = document.createElement('span'); if (key) e.dataset.i18n = key; e.textContent = text; return e; };
    const swatch = (wax) => { const i = document.createElement('img'); Object.assign(i, { src: wax.tile, alt: '', width: 40, height: 40, decoding: 'async' }); return i; };

    PIECES.forEach((p) => piecesEl.append(button('', { 'data-piece': p, 'aria-pressed': 'false' }, span('p.' + p, t('p.' + p)))));
    WAX.forEach((w) => waxEl.append(button('', { role: 'radio', 'data-wax': w.id, 'aria-checked': 'false', tabindex: '-1' }, swatch(w), span('', w.name))));

    // Main picture: blurs while the next one is prepared, then sharpens into it (keys: instant).
    let showing = 0;
    async function show(instant) {
      const r = ++showing;
      const animate = !reduced && !instant;
      fig.classList.toggle('is-switching', animate);
      try {
        const [pic] = await Promise.all([picture(s.piece, s.view, s.wax), settle(animate)]);
        if (r !== showing) return;
        tagImage(stageImg, s.piece, s.view, s.wax, pic);
        applyImageAlts();
      } catch { /* keep the current picture */ }
      if (r === showing) fig.classList.remove('is-switching');
    }

    // A listed worn shot whose file is missing (not made yet) drops out instead of showing an empty frame.
    function drawViews() {
      const views = VIEWS[s.piece];
      const live = () => { viewsEl.hidden = viewsEl.children.length < 2; };
      viewsEl.replaceChildren(...views.map((v, n) => {
        if (v.missing) return null;
        const img = document.createElement('img');
        img.alt = '';
        Object.assign(img, { width: v.worn ? 1024 : 800, height: v.worn ? 1536 : 1000, decoding: 'async' });
        const b = button('stage', { 'aria-pressed': String(n === s.view), 'data-view': n }, img, span(v.worn ? 'studio.view.worn' : 'studio.view.product', t(v.worn ? 'studio.view.worn' : 'studio.view.product')));
        picture(s.piece, n, s.wax).then((pic) => { img.src = pic.src; img.toggleAttribute('data-worn', !!v.worn); edgeTone(img); }).catch(() => {
          if (!v.worn) return;
          v.missing = true;
          b.remove();
          live();
        });
        return b;
      }).filter(Boolean));
      live();
    }

    function drawCompare() {
      const piece = s.piece; const view = s.view;
      compareEl.replaceChildren(...WAX.map((w) => {
        const img = document.createElement('img');
        Object.assign(img, { width: 800, height: 1000, decoding: 'async' });
        const tag = span('wax.preview', t('wax.preview'));
        tag.className = 'stage-tag';
        const pic = document.createElement('span');
        pic.className = 'stage';
        pic.append(img, tag);
        const name = span('', w.name);
        name.className = 'studio-compare-name';
        const li = document.createElement('li');
        li.append(button('studio-compare-tile', { 'data-wax': w.id, 'aria-pressed': String(w.id === s.wax) }, pic, name));
        picture(piece, view, w.id).then((p) => {
          if (piece !== s.piece || view !== s.view) return;
          tagImage(img, piece, view, w.id, p);
          applyImageAlts();
        }).catch(() => {});
        return li;
      }));
    }

    function sync() {
      const wax = waxOf(s.wax);
      panel.dataset.product = s.piece;
      panel.dataset.wax = s.wax;
      const name = $('[data-studio-piece]', panel);
      name.dataset.i18n = 'p.' + s.piece; name.textContent = t('p.' + s.piece);
      const line = $('[data-studio-line]', panel);
      line.dataset.i18n = 'p.' + s.piece + '.l'; line.textContent = t(line.dataset.i18n);
      $('[data-studio-price]', panel).dataset.price = s.piece;
      $$('[data-print-name]', panel).forEach((el) => { el.textContent = wax.name; });
      $$('[data-piece]', piecesEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.piece === s.piece)));
      $$('[data-wax]', waxEl).forEach((b) => {
        const on = b.dataset.wax === s.wax;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      $$('[data-wax]', compareEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wax === s.wax)));
      document.title = `${t('p.' + s.piece)}, ${wax.name} · CasualWax`;
      applyCurrency();
      const url = new URL(location.href);
      url.searchParams.set('piece', s.piece);
      url.searchParams.set('wax', s.wax);
      history.replaceState(null, '', url);
    }

    const setSizes = () => sizeOptions(sizeEl, product(s.piece));

    function setPiece(p) {
      if (p === s.piece) return;
      s.piece = p; s.view = 0;
      setSizes(); sync(); show(); drawViews(); drawCompare();
    }
    function setWax(id, instant) {
      if (!waxOf(id) || id === s.wax) return;
      s.wax = id;
      sync(); show(instant); drawViews(); readAdjust();
    }

    // Adjust the print: the sliders follow the current wax; dragging redraws the main picture live,
    // letting go redraws the views and this wax's tile in the comparison.
    const adjustEl = $('[data-studio-adjust]', studio);
    const DEFAULTS = { scale: 1, rotate: 0, x: 0, y: 0, shade: 1 };
    const fmt = { scale: (v) => `×${v.toFixed(2)}`, rotate: (v) => `${v}°`, x: (v) => String(v), y: (v) => String(v), shade: (v) => `${Math.round(v * 100)}%` };
    function readAdjust() {
      if (!adjustEl) return;
      const p = { ...DEFAULTS, ...(placeOf(waxOf(s.wax)) || {}) };
      $$('[data-adjust]', adjustEl).forEach((r) => { const k = r.dataset.adjust; r.value = p[k]; $(`[data-adjust-out="${k}"]`, adjustEl).textContent = fmt[k](+p[k]); });
    }
    let busy = false; let again = false;
    async function redraw() {
      if (busy) { again = true; return; }
      busy = true;
      do { again = false; await show(true); } while (again);   // the latest values only, one render at a time
      busy = false;
    }
    if (adjustEl) {
      adjustEl.addEventListener('input', (e) => {
        const r = e.target.closest('[data-adjust]'); if (!r) return;
        const wax = waxOf(s.wax);
        const p = { ...DEFAULTS, ...(placeOf(wax) || {}), [r.dataset.adjust]: +r.value };
        adjusted.set(wax.id, p);
        $(`[data-adjust-out="${r.dataset.adjust}"]`, adjustEl).textContent = fmt[r.dataset.adjust](+r.value);
        redraw();
      });
      adjustEl.addEventListener('change', (e) => { if (e.target.closest('[data-adjust]')) { drawViews(); drawCompare(); } });
      $('[data-adjust-reset]', adjustEl).addEventListener('click', () => {
        adjusted.delete(s.wax); readAdjust(); show(); drawViews(); drawCompare();
      });
      $('[data-adjust-download]', adjustEl).addEventListener('click', async () => {
        const wax = waxOf(s.wax); const v = VIEWS[s.piece][s.view];
        const src = adjusted.has(wax.id) ? await drawn(v.src, wax, adjusted.get(wax.id)) : (await picture(s.piece, s.view, s.wax)).src;
        const a = document.createElement('a');
        a.href = src; a.download = `casualwax-${s.piece}-${wax.id}${v.worn ? '-worn' : ''}.webp`;
        document.body.append(a); a.click(); a.remove();
      });
      readAdjust();
    }

    piecesEl.addEventListener('click', (e) => { const b = e.target.closest('[data-piece]'); if (b) setPiece(b.dataset.piece); });
    waxEl.addEventListener('click', (e) => { const b = e.target.closest('[data-wax]'); if (b) setWax(b.dataset.wax); });
    waxEl.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const k = WAX[(WAX.findIndex((w) => w.id === s.wax) + dir + WAX.length) % WAX.length].id;
      setWax(k, true);
      $(`[data-wax="${k}"]`, waxEl).focus();
    });
    viewsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]'); if (!b) return;
      s.view = +b.dataset.view;
      $$('[data-view]', viewsEl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      show(); drawCompare();
    });
    compareEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-wax]'); if (!b) return;
      setWax(b.dataset.wax);
      if (fig.getBoundingClientRect().bottom < 0) fig.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });

    // the tab title follows a language switch (the page's own listener has already re-labelled the page)
    document.addEventListener('click', (e) => { if (e.target.closest('[data-set-lang], [data-action="toggle-lang"]')) sync(); });

    setSizes(); sync(); show(true); drawViews(); drawCompare();
    fadeEdge(piecesEl);
  }

  /* ---------- journal: index, home teaser, article (Shopify: blog / featured-blog / article) ---------- */
  const POSTS = window.CW_POSTS || [];
  const local = (v) => (v && typeof v === 'object' ? (v[state.lang] ?? v.en) : v);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const minutes = (post) => {
    const words = local(post.body).reduce((n, b) => n + (b.p || '').split(/\s+/).length, 0);
    return `${Math.max(1, Math.round(words / 200))} ${t('journal.read')}`;
  };
  const postHref = (post) => `article.html?post=${post.slug}`;

  function postCard(post, size) {
    const card = el('article', `post-card post-card--${size}`);
    const a = el('a', 'post-link'); a.href = postHref(post);
    const fig = el('figure', 'post-pic');
    const img = el('img');
    Object.assign(img, { src: post.cover, alt: local(post.coverAlt), loading: 'lazy', decoding: 'async', width: 1600, height: 1000 });
    fig.append(img);
    const body = el('div', 'post-text');
    body.append(el(size === 'feature' ? 'h2' : 'h3', 'post-title', local(post.title)), el('p', 'post-dek', local(post.dek)), el('p', 'post-meta', minutes(post)));
    a.append(fig, body);
    card.append(a);
    return card;
  }

  function renderJournal() {
    const list = $('[data-journal-list]');
    if (list) list.replaceChildren(...POSTS.map((p, n) => postCard(p, n === 0 ? 'feature' : 'card')));
    const teaser = $('[data-journal-teaser]');
    if (teaser) teaser.replaceChildren(...POSTS.slice(0, 3).map((p) => postCard(p, 'card')));
    const article = $('[data-article]');
    if (!article) return;
    const post = POSTS.find((p) => p.slug === new URLSearchParams(location.search).get('post')) || null;
    if (!post) { $('[data-article-title]', article).textContent = t('journal.missing'); return; }
    document.title = `${local(post.title)} · CasualWax`;
    const cover = $('[data-article-cover]', article);
    Object.assign(cover, { src: post.cover, alt: local(post.coverAlt) });
    const credit = $('[data-article-credit]', article);
    const by = local(post.coverCredit);
    credit.hidden = !by;
    credit.textContent = by ? `${t('journal.cover')} ${by}` : '';
    $('[data-article-title]', article).textContent = local(post.title);
    $('[data-article-dek]', article).textContent = local(post.dek);
    $('[data-article-meta]', article).textContent = minutes(post);
    $('[data-article-body]', article).replaceChildren(...local(post.body).map((b) => {
      if (b.h) return el('h2', 'article-h', b.h);
      if (b.img) {
        const f = el('figure', 'article-fig');
        const i = el('img');
        Object.assign(i, { src: b.img, alt: b.alt, loading: 'lazy', decoding: 'async' });
        f.append(i, el('figcaption', '', b.cap));
        return f;
      }
      return el('p', 'article-p', b.p);
    }));
    const cta = $('[data-article-cta]', article);
    cta.href = post.cta.href;
    cta.textContent = local(post.cta.label);
    $('[data-article-more]', article).replaceChildren(...POSTS.filter((p) => p !== post).slice(0, 2).map((p) => postCard(p, 'card')));
  }
  renderJournal();
  document.addEventListener('click', (e) => { if (e.target.closest('[data-set-lang], [data-action="toggle-lang"]')) renderJournal(); });

  /* ---------- social accounts (footer), set in the admin ---------- */
  const SOCIAL = D.settings.social || {};
  $$('[data-social]').forEach((a) => {
    const url = SOCIAL[a.dataset.social];
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; return; }
    a.dataset.placeholder = 'social';                       // account not set yet: stay on the page
    a.addEventListener('click', (e) => e.preventDefault());
  });

  applyLang();
  setPrint(state.print, false, true);
})();
