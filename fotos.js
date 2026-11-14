// Subida de fotos del gimnasio · PQ Coach Online
// Cada foto se reduce en el navegador (lado mayor 1600 px, JPEG) y se envía sola al Apps Script (tipo: "foto_gimnasio").
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTcYeMO610XLqb2nJJdSJLRzZd5e2ZrTbsadgWKV67HirPgeRZ7fW5drXb37UrfB41/exec";
const MAX_POR_SUBIDA = 30;
const LADO_MAX = 1600;
const CALIDAD = 0.8;

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get('e')) $('email').value = params.get('e');

function reducir(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('No se pudo reducir la foto')), 'image/jpeg', CALIDAD);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la foto')); };
    img.src = url;
  });
}
function aBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('No se pudo leer la foto'));
    r.readAsDataURL(blob);
  });
}
async function enviar(payload) {
  const resp = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  return resp.json();
}

$('fotos').addEventListener('change', () => {
  const lista = $('lista'); lista.innerHTML = '';
  const files = [...$('fotos').files].slice(0, MAX_POR_SUBIDA);
  files.forEach((f, i) => { const li = document.createElement('li'); li.id = 'f' + i; li.innerHTML = '<span></span><span class="wait">En espera</span>'; li.firstChild.textContent = f.name; lista.appendChild(li); });
  $('err').textContent = $('fotos').files.length > MAX_POR_SUBIDA ? 'Elegiste ' + $('fotos').files.length + ' fotos; se subirán las primeras ' + MAX_POR_SUBIDA + '. Después puedes subir el resto.' : '';
  $('resumen').textContent = '';
});

$('btnSubir').addEventListener('click', async () => {
  const email = $('email').value.trim().toLowerCase();
  const files = [...$('fotos').files].slice(0, MAX_POR_SUBIDA);
  const err = $('err'); err.textContent = '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Escribe un correo válido.'; return; }
  if (!files.length) { err.textContent = 'Elige al menos una foto.'; return; }
  const btn = $('btnSubir'); btn.disabled = true; btn.textContent = 'Subiendo…';
  let ok = 0, fallos = 0, detener = '';
  for (let i = 0; i < files.length && !detener; i++) {
    const estado = document.querySelector('#f' + i + ' span:last-child');
    estado.className = 'wait'; estado.textContent = 'Subiendo…';
    try {
      const blob = await reducir(files[i]);
      const data = await aBase64(blob);
      const r = await enviar({ tipo: 'foto_gimnasio', email, nombre: files[i].name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', data, ultima: i === files.length - 1 });
      if (r.status === 'ok') { ok++; estado.className = 'ok'; estado.textContent = 'Subida'; }
      else { fallos++; estado.className = 'bad'; estado.textContent = r.message || 'Error'; if (r.fatal) detener = r.message; }
    } catch (e) { fallos++; estado.className = 'bad'; estado.textContent = 'Falló, reintenta'; }
    $('resumen').textContent = ok + ' de ' + files.length + ' subidas';
  }
  btn.disabled = false; btn.textContent = 'Subir fotos';
  if (detener) err.textContent = detener;
  else if (fallos) err.textContent = fallos + ' foto(s) no se subieron. Vuelve a elegirlas y toca "Subir fotos".';
  else $('resumen').textContent = '✅ Listo: ' + ok + ' foto(s) subidas. Tu coach ya las puede ver.';
});
