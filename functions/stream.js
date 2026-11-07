export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const fileId = url.searchParams.get('id');

  if (!fileId) {
    return new Response('Parámetro id requerido', { status: 400 });
  }

  // Normalizar id si viene URL completa
  let cleanId = fileId;
  if (cleanId.includes('/d/')) {
    const m = cleanId.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) cleanId = m[1];
  }

  const driveUrl = `https://drive.usercontent.google.com/download?id=${cleanId}&export=download`;

  // Pasar cabecera Range para streaming nativo fluido en iPhone/Android
  const reqHeaders = new Headers();
  const range = request.headers.get('Range');
  if (range) {
    reqHeaders.set('Range', range);
  }
  reqHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

  try {
    const driveResp = await fetch(driveUrl, {
      headers: reqHeaders,
      redirect: 'follow'
    });

    // Construir cabeceras optimizadas para reproducción nativa inline en Safari y Android
    const newHeaders = new Headers(driveResp.headers);
    newHeaders.set('Content-Disposition', 'inline');
    newHeaders.set('Content-Type', 'video/mp4');
    newHeaders.set('Accept-Ranges', 'bytes');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=86400');
    newHeaders.delete('Content-Security-Policy');
    newHeaders.delete('X-Content-Security-Policy');
    newHeaders.delete('Cross-Origin-Embedder-Policy');
    newHeaders.delete('Cross-Origin-Opener-Policy');
    newHeaders.delete('X-Frame-Options');

    return new Response(driveResp.body, {
      status: driveResp.status,
      statusText: driveResp.statusText,
      headers: newHeaders
    });
  } catch (err) {
    return new Response(`Error al transmitir video: ${err.message}`, { status: 502 });
  }
}
