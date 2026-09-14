import { units } from './course-data.js';
const $ = id => document.getElementById(id);
const routes = {1:['01-Part-1-Basisroute.pdf',125],2:['05-Part-2-Basisroute.pdf',45],3:['06-Part-3-Basisroute.pdf',61],4:['07-Part-4-Basisroute.pdf',48]};
const params = new URL(location.href).searchParams;
const requestedUnit = units.find(u => u.number === Number(params.get('unit')));
const requestedPart = Number(params.get('part'));
$('part').value = String(requestedUnit?.part || (routes[requestedPart] ? requestedPart : 1));
let pdfURL = null;
function show(view) {
  for (const name of ['pdf','book']) {
    $(name + '-pane').hidden = name !== view;
    $('show-' + name).setAttribute('aria-pressed', String(name === view));
  }
}
function book() {
  const unit = units.find(u => u.number === Number($('unit').value));
  const url = 'reader.html?unit=' + unit.number;
  $('book').src = url;
  $('open-book').href = url;
  $('reference').textContent = 'PDF practice: ' + unit.pdf + '.';
}
function part(preferred) {
  const n = Number($('part').value);
  const [filename,page] = routes[n];
  $('route').textContent = 'Use ' + filename + '. Foundation route starts on PDF page ' + page + ' in the revised edition.';
  $('unit').replaceChildren();
  for (const unit of units.filter(u => u.part === n)) {
    const option = document.createElement('option');
    option.value = unit.number; option.textContent = 'Unit ' + unit.number + ' · ' + unit.title;
    $('unit').append(option);
  }
  if (preferred && units.some(u => u.part === n && u.number === preferred)) $('unit').value = preferred;
  book();
}
$('part').addEventListener('change', () => {
  $('pdf').removeAttribute('src'); $('pdf').hidden = true; $('fallback').hidden = true;
  $('open-pdf').removeAttribute('href');
  if (pdfURL) URL.revokeObjectURL(pdfURL);
  pdfURL = null; $('file').value = '';
  $('message').textContent = 'Choose the PDF for this part from your device.';
  part(); show('pdf');
});
$('file').addEventListener('change', () => {
  const file = $('file').files[0];
  if (!file) return;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
    $('message').textContent = 'Please choose a PDF file.'; return;
  }
  const previous = pdfURL;
  pdfURL = URL.createObjectURL(file);
  $('pdf').src = pdfURL;
  $('pdf').hidden = false; $('fallback').hidden = false; $('open-pdf').href = pdfURL;
  $('message').textContent = 'Selected: ' + file.name + '. Check that it matches Part ' + $('part').value + '.';
  if (previous) URL.revokeObjectURL(previous);
  show('pdf');
});
$('unit').addEventListener('change', book);
$('show-pdf').addEventListener('click', () => show('pdf'));
$('show-book').addEventListener('click', () => show('book'));
part(requestedUnit?.number);
