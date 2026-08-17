// pdfjs-dist is loaded lazily (client-only) so the PDF worker/canvas code
// never ends up in a server bundle — call this from a useEffect, not at
// module scope.
let pdfjsPromise: ReturnType<typeof importPdfjs> | null = null;

async function importPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  return pdfjsLib;
}

export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = importPdfjs();
  }
  return pdfjsPromise;
}
