(() => {
  const $ = (sel) => document.querySelector(sel);
  const params = new URLSearchParams(location.search);
  // Keep this URL *encoded* in the link you use:
  // ?file=%2Fessay-coach-instant%2Fassets%2Fbook%2Fcourse-book.pdf
  let pdfUrl = params.get('file') || '/essay-coach-instant/assets/book/course-book.pdf';

  // PDF.js from CDN + worker
  if (window['pdfjsLib']) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
  }

  const canvas = $('#pdf_canvas');
  const ctx = canvas.getContext('2d');
  const pageNumInput = $('#page_num');
  const pageCountSpan = $('#page_count');
  const btnPrev = $('#prev');
  const btnNext = $('#next');
  const btnZoomIn = $('#zoom_in');
  const btnZoomOut = $('#zoom_out');
  const btnFit = $('#fit');
  const linkDownload = $('#download');
  linkDownload.href = pdfUrl;

  let pdfDoc = null;
  let pageNum = 1;
  let scale = 1.25;
  let pageRendering = false;
  let pageNumPending = null;

  function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTask.promise.then(() => {
        pageRendering = false;
        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
    });
    pageNumInput.value = num;
  }

  function queueRenderPage(num) {
    if (pageRendering) pageNumPending = num;
    else renderPage(num);
  }

  function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  }

  function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  }

  function onZoom(f) {
    scale = Math.max(0.25, Math.min(5, scale * f));
    queueRenderPage(pageNum);
  }

  function fitToWidth() {
    const containerWidth = document.getElementById('viewer').clientWidth - 32;
    pdfDoc.getPage(pageNum).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      scale = Math.max(0.25, Math.min(5, containerWidth / viewport.width));
      queueRenderPage(pageNum);
    });
  }

  btnPrev.addEventListener('click', onPrevPage);
  btnNext.addEventListener('click', onNextPage);
  btnZoomIn.addEventListener('click', () => onZoom(1.1));
  btnZoomOut.addEventListener('click', () => onZoom(0.9));
  btnFit.addEventListener('click', fitToWidth);
  pageNumInput.addEventListener('change', () => {
    let val = parseInt(pageNumInput.value, 10) || 1;
    val = Math.min(Math.max(val, 1), pdfDoc.numPages || 1);
    pageNum = val;
    queueRenderPage(pageNum);
  });

  pdfjsLib.getDocument(pdfUrl).promise.then((doc) => {
    pdfDoc = doc;
    pageCountSpan.textContent = '/ ' + pdfDoc.numPages;
    pageNum = 1;
    fitToWidth(); // first render
  }).catch((err) => {
    console.error('Failed to load PDF:', err);
    alert('Could not load the PDF file. Check the "file=" URL or CORS.');
  });

  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(fitToWidth, 250);
  });
})();
