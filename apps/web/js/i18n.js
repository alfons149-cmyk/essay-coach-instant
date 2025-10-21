async function loadI18n(lang) {
  const url = `./assets/i18n/${lang}.json`;
  console.log('[i18n] fetching', url);
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('[i18n] load failed: ' + res.status + ' ' + url);
  const dict = await res.json();
  window.__i18n = window.__i18n || {};
  window.__i18n[lang] = dict;
  return dict;
}
function applyI18n(dict) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict && dict[key]) el.textContent = dict[key];
  });
}
