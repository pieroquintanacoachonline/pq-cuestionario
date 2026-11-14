// Cuestionario de entrenamiento · PQ Coach Online
// Envía las respuestas al mismo Apps Script del cuestionario de nutrición (tipo: "entrenamiento").
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTcYeMO610XLqb2nJJdSJLRzZd5e2ZrTbsadgWKV67HirPgeRZ7fW5drXb37UrfB41/exec";
const COACH_PHONE = "51990601120";
const TERMINOS = ['Volumen de entrenamiento (series por semana)', 'Series efectivas', 'Intensidad', 'Repeticiones en reserva (RIR)', 'Fallo muscular'];
const NIVELES = ['Sí', 'No'];
const $ = (id) => document.getElementById(id);
const form = $('entForm');
const steps = [...document.querySelectorAll('.form-step')];
let cur = 0;

function show(i) {
  cur = i;
  steps.forEach((s, k) => s.classList.toggle('active', k === i));
  document.querySelectorAll('.step-pill').forEach((p, k) => p.classList.toggle('active', k === i));
  $('progressBar').style.width = ((i + 1) / steps.length * 100) + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Conceptos: una fila por concepto, Sí / No
TERMINOS.forEach((t, i) => {
  const row = document.createElement('div');
  row.className = 'term-row';
  row.innerHTML = '<b>' + t + '</b><div class="chips-container">' + NIVELES.map((n) =>
    '<label class="chip-item"><input type="radio" name="term' + i + '" value="' + n + '"><span>' + n + '</span></label>').join('') + '</div>';
  $('terms').appendChild(row);
});

function checked(name) { return [...form.querySelectorAll('input[name="' + name + '"]:checked')].map((x) => x.value); }
function val(id) { return ($(id).value || '').trim(); }

function validar(i) {
  if (i === 0) {
    const e = val('email');
    if (!val('nombre')) return 'Escribe tu nombre y apellido.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Escribe un correo válido.';
  }
  if (i === 2 && checked('diasNo').length >= 7) return 'Necesitas al menos un día disponible para entrenar.';
  return '';
}

// Si viene del cuestionario de nutrición (o con ?e= / ?n=), el correo y el nombre ya llegan puestos
const qs = new URLSearchParams(location.search);
if (qs.get('e')) $('email').value = qs.get('e');
if (qs.get('n')) $('nombre').value = qs.get('n');
const VIENE_DE_NUTRICION = qs.get('from') === 'nutri';

// ¿El correo ya está registrado en el sistema (tiene su carpeta)? Devuelve true / false, o null si no se pudo consultar.
async function correoRegistrado(email) {
  try {
    const r = await fetch(WEBHOOK_URL + '?chk=' + encodeURIComponent(email));
    const j = await r.json();
    return j && typeof j.ok === 'boolean' ? j.ok : null;
  } catch (e) { return null; }
}

document.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', async () => {
  const msg = validar(cur);
  const box = $('err-' + (cur + 1));
  if (box) { box.innerHTML = ''; box.textContent = msg; }
  if (msg) return;
  if (cur === 0) {
    b.disabled = true; const t = b.textContent; b.textContent = 'Revisando tu correo…';
    const ok = await correoRegistrado(val('email').toLowerCase());
    b.disabled = false; b.textContent = t;
    if (ok === false) {
      box.innerHTML = VIENE_DE_NUTRICION
        ? 'Estamos terminando de preparar tu expediente. Espera unos 2 minutos y toca "Siguiente" otra vez.'
        : 'No encontramos ese correo. Usa el mismo del cuestionario de nutrición. Si aún no lo llenas, <a href="index.html" style="color:#93c5fd;text-decoration:underline">hazlo primero aquí</a>.';
      return;
    }
  }
  show(Math.min(cur + 1, steps.length - 1));
}));
document.querySelectorAll('[data-prev]').forEach((b) => b.addEventListener('click', () => show(Math.max(cur - 1, 0))));

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = $('btnEnviar');
  const err = $('err-4');
  err.textContent = '';
  for (let i = 0; i < 3; i++) { const m = validar(i); if (m) { show(i); const b = $('err-' + (i + 1)); if (b) b.textContent = m; return; } }
  const terminos = {};
  TERMINOS.forEach((t, i) => { const r = form.querySelector('input[name="term' + i + '"]:checked'); terminos[t] = r ? r.value : ''; });
  const payload = {
    tipo: 'entrenamiento',
    nombre: val('nombre'), email: val('email').toLowerCase(),
    tiempoEntrenando: val('tiempoEntrenando'), terminos,
    rutinaActual: val('rutinaActual'), lesiones: val('lesiones'), ejerciciosMolestan: val('ejerciciosMolestan'),
    diasNo: checked('diasNo'), tiempoSesion: val('tiempoSesion'), cardioPasos: val('cardioPasos'),
    favEspalda: val('favEspalda'), favPechoHombro: val('favPechoHombro'), favBicepsTriceps: val('favBicepsTriceps'), favPierna: val('favPierna')
  };
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const resp = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    const r = await resp.json();
    if (r.status !== 'ok') throw new Error(r.message || 'No se pudo enviar');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Enviar cuestionario';
    err.textContent = (e && e.message && !/fetch|network|json/i.test(e.message)) ? e.message : 'No pudimos confirmar el envío. Revisa tu conexión y vuelve a intentarlo.';
    return;
  }
  form.style.display = 'none';
  $('successScreen').style.display = 'block';
  const nombre = payload.nombre.split(' ')[0];
  $('btnWa').href = 'https://wa.me/' + COACH_PHONE + '?text=' + encodeURIComponent('Hola, soy ' + nombre + ', ya envié mi cuestionario de entrenamiento.');
  $('btnFotos').href = 'fotos.html?e=' + encodeURIComponent(payload.email);
  if (document.querySelector('.progress-container')) document.querySelector('.progress-container').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

show(0);
