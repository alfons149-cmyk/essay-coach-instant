import { units } from './course-data.js';

const content = document.getElementById('unit-content');
const select = document.getElementById('unit-select');
const status = document.getElementById('reader-status');
let requestNumber = 0;
let loadedUnit = null;
for (const unit of units) {
  const option = document.createElement('option');
  option.value = String(unit.number);
  option.textContent = `Unit ${unit.number} · ${unit.title}`;
  select.append(option);
}
function selectedUnit() {
  const value = Number(new URL(location.href).searchParams.get('unit'));
  return Number.isInteger(value) && value >= 1 && value <= units.length ? value : 1;
}
function scrollToTarget() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
  const target = id ? document.getElementById(id) : content.querySelector('h1');
  if (target && content.contains(target)) {
    for (let p = target.parentElement; p && p !== content; p = p.parentElement) {
      if (p.tagName === 'DETAILS') p.open = true;
    }
    target.scrollIntoView({ block: 'start' });
    if (target.matches('h1,h2,h3')) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
}
async function loadUnit(number) {
  const request = ++requestNumber;
  select.value = String(number);
  status.textContent = `Loading Unit ${number}…`;
  content.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(`units/unit${String(number).padStart(2, '0')}.html?v=integrated-1`);
    if (!response.ok) throw new Error('Unable to load unit');
    const markup = await response.text();
    if (request !== requestNumber) return;
    content.innerHTML = markup;
    loadedUnit = number;
    document.title = `Unit ${number}: ${units[number - 1].title} | Alfons Sergeant`;
    status.textContent = `Part ${units[number - 1].part} · Unit ${number} of ${units.length}`;
    content.setAttribute('aria-busy', 'false');
    requestAnimationFrame(scrollToTarget);
  } catch {
    if (request !== requestNumber) return;
    loadedUnit = null;
    content.innerHTML = '<p>This unit could not be loaded. Check your connection and try again.</p><button type="button" id="retry-unit">Try again</button> <a href="index.html">Course route</a>';
    content.setAttribute('aria-busy', 'false');
    status.textContent = `Unit ${number} is unavailable.`;
    document.getElementById('retry-unit').addEventListener('click', () => loadUnit(number));
  }
}
select.addEventListener('change', () => {
  const url = new URL(location.href);
  url.searchParams.set('unit', select.value);
  url.hash = '';
  history.pushState(null, '', url);
  loadUnit(Number(select.value));
});
content.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname) return;
  event.preventDefault();
  history.pushState(null, '', url);
  const number = selectedUnit();
  if (number === loadedUnit) scrollToTarget(); else loadUnit(number);
});
window.addEventListener('popstate', () => {
  const number = selectedUnit();
  if (number === loadedUnit) scrollToTarget(); else loadUnit(number);
});
window.addEventListener('hashchange', scrollToTarget);
// Honour the app's return link only within this origin and app directory.
const returnValue = new URL(location.href).searchParams.get('return');
if (returnValue) {
  try {
    const returnURL = new URL(returnValue, location.href);
    const appRoot = new URL('../../', location.href);
    if (returnURL.origin === appRoot.origin && returnURL.pathname.startsWith(appRoot.pathname)) {
      document.getElementById('back-to-app').href = returnURL.href;
    }
  } catch { /* Keep the standard app link. */ }
}
loadUnit(selectedUnit());
