async function loadI18n(lang){
const res = await fetch(`./assets/i18n/${lang}.json`);
if(!res.ok) throw new Error('i18n load failed');
return res.json();
}
function applyI18n(dict){
document.querySelectorAll('[data-i18n]').forEach(el=>{
const key=el.getAttribute('data-i18n');
if(dict[key]) el.textContent = dict[key];
});
}
