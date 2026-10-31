/**
 * ARMA TU MENÚ · el atleta elige alimentos (sin escribir) para cada comida que definió en el paso 3.
 * Se guarda como texto "Comida 1 (07:30)::Huevo entero, crudo;;Avena en hojuelas, cruda||Comida 2 ..." en el campo oculto #menuCliente.
 * El Excel lo pasa al constructor de dieta y las cantidades las calcula el coach (macros), no el atleta.
 */
(function () {
  const LIMITES = { proteinas: 2, huevos_lacteos: 3, carbos: 2, panes: 2, frutas: 2, verduras: 3, grasas: 2, dulces: 1 };
  const ABRE_EN = {
    ligera: ['huevos_lacteos', 'panes', 'frutas'],
    fuerte: ['proteinas', 'carbos', 'verduras'],
    snack: ['huevos_lacteos', 'frutas', 'grasas']
  };
  const CONSEJO = {
    ligera: 'Desayuno: lo habitual es 1–2 fuentes de proteína (huevo, yogur), 1 carbohidrato (avena, pan) y 1 fruta.',
    fuerte: 'Plato fuerte: 1 proteína, 1–2 carbohidratos, verduras y 1 grasa saludable.',
    snack: 'Snack: algo ligero, por ejemplo 1 lácteo o proteína, 1 fruta y un toque de grasa.'
  };
  let LISTA = null, cargando = false;
  const elegido = {}; // { 'Comida 1': Set(valor) }

  function tipoComida(horaTxt, idx, total) {
    const m = /(\d{1,2}):(\d{2})/.exec(horaTxt || '');
    const h = m ? Number(m[1]) + Number(m[2]) / 60 : null;
    if (h === null) return idx === 0 ? 'ligera' : 'fuerte';
    if (h < 11) return 'ligera';
    if (h < 16) return 'fuerte';
    if (h < 19) return 'snack';
    return idx === total - 1 && h >= 21 ? 'snack' : 'fuerte';
  }

  function comidasDefinidas() {
    return Array.from(document.querySelectorAll('#mealsList input[type="time"]')).filter(i => i.value).map(i => i.value).sort();
  }

  async function cargarLista() {
    if (LISTA || cargando) return;
    cargando = true;
    try {
      const guardada = sessionStorage.getItem('pq_lista_menu');
      if (guardada) { LISTA = JSON.parse(guardada); return; }
      const r = await fetch(SPREADSHEET_WEBHOOK_URL + '?foods=1');
      LISTA = await r.json();
      if (LISTA && LISTA.grupos) sessionStorage.setItem('pq_lista_menu', JSON.stringify(LISTA));
    } catch (e) { LISTA = null; } finally { cargando = false; }
  }

  function sync() {
    const horas = comidasDefinidas();
    const partes = [];
    horas.forEach((h, i) => {
      const nombre = 'Comida ' + (i + 1);
      const sel = elegido[nombre];
      if (sel && sel.size) partes.push(nombre + ' (' + h + ')::' + Array.from(sel).join(';;'));
    });
    const el = document.getElementById('menuCliente');
    if (el) el.value = partes.join('||');
    try { localStorage.setItem('pq_menu_cliente', JSON.stringify(Object.fromEntries(Object.entries(elegido).map(([k, v]) => [k, Array.from(v)])))); } catch (e) {}
  }

  function contarGrupo(nombre, g) {
    const sel = elegido[nombre] || new Set();
    return g.items.filter(it => sel.has(it.v)).length;
  }

  function pintar() {
    const cont = document.getElementById('menuBuilder');
    if (!cont) return;
    const horas = comidasDefinidas();
    if (!horas.length) { cont.innerHTML = '<p class="field-hint">Primero define tus comidas y sus horas en el paso 3 (Rutina). Luego vuelve aquí a armar tu menú.</p>'; return; }
    if (!LISTA || !LISTA.grupos) { cont.innerHTML = '<p class="field-hint">No pudimos cargar la lista de alimentos ahora. Puedes continuar: tu coach armará tu menú con tus gustos del paso anterior.</p>'; return; }
    try { const g = JSON.parse(localStorage.getItem('pq_menu_cliente') || '{}'); Object.keys(g).forEach(k => { if (!elegido[k]) elegido[k] = new Set(g[k]); }); } catch (e) {}
    cont.innerHTML = '';
    horas.forEach((hora, idx) => {
      const nombre = 'Comida ' + (idx + 1);
      const tipo = tipoComida(hora, idx, horas.length);
      if (!elegido[nombre]) elegido[nombre] = new Set();
      const card = document.createElement('div');
      card.className = 'menu-card';
      card.innerHTML = `<div class="menu-card-head"><b>${nombre}</b> · ${hora} <span class="menu-tipo">${tipo === 'ligera' ? '☕ Desayuno' : tipo === 'snack' ? '🍎 Snack' : '🍽️ Plato fuerte'}</span><span class="menu-count" id="mc-${idx}"></span></div><small class="field-hint">${CONSEJO[tipo]}</small>`;
      if (idx > 0) {
        const copia = document.createElement('select');
        copia.className = 'menu-copy';
        copia.innerHTML = '<option value="">📋 Copiar elecciones de otra comida…</option>' + horas.slice(0, idx).map((_, k) => `<option value="Comida ${k + 1}">Igual que la Comida ${k + 1}</option>`).join('');
        copia.addEventListener('change', () => { if (copia.value && elegido[copia.value]) { elegido[nombre] = new Set(elegido[copia.value]); sync(); pintar(); } });
        card.appendChild(copia);
      }
      const orden = LISTA.grupos.slice().sort((a, b) => (ABRE_EN[tipo].includes(a.id) ? 0 : 1) - (ABRE_EN[tipo].includes(b.id) ? 0 : 1));
      orden.forEach(g => {
        const det = document.createElement('details');
        det.className = 'menu-grupo';
        if (ABRE_EN[tipo].includes(g.id)) det.open = true;
        const n = contarGrupo(nombre, g);
        det.innerHTML = `<summary>${g.titulo} <small>(${n}/${LIMITES[g.id] || 2})</small></summary><small class="field-hint">${g.ayuda} · máximo ${LIMITES[g.id] || 2}</small>`;
        const chips = document.createElement('div');
        chips.className = 'chips-container';
        g.items.forEach(it => {
          const lab = document.createElement('label');
          lab.className = 'chip-item';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = elegido[nombre].has(it.v);
          cb.addEventListener('change', () => {
            if (cb.checked) {
              if (contarGrupo(nombre, g) >= (LIMITES[g.id] || 2)) { cb.checked = false; alert('Para esta comida elige máximo ' + (LIMITES[g.id] || 2) + ' en "' + g.titulo + '". Quita uno si quieres cambiarlo.'); return; }
              elegido[nombre].add(it.v);
            } else elegido[nombre].delete(it.v);
            sync();
            const s = det.querySelector('summary small'); if (s) s.textContent = `(${contarGrupo(nombre, g)}/${LIMITES[g.id] || 2})`;
            const total = Array.from(elegido[nombre]).length; const mc = document.getElementById('mc-' + idx); if (mc) mc.textContent = total ? total + ' alimentos' : '';
          });
          const sp = document.createElement('span');
          sp.textContent = it.l;
          lab.appendChild(cb); lab.appendChild(sp);
          chips.appendChild(lab);
        });
        det.appendChild(chips);
        card.appendChild(det);
      });
      cont.appendChild(card);
      const mc = document.getElementById('mc-' + idx); if (mc) { const total = elegido[nombre].size; mc.textContent = total ? total + ' alimentos' : ''; }
    });
    sync();
  }

  window.renderMenuBuilder = async function () {
    const cont = document.getElementById('menuBuilder');
    if (cont) cont.innerHTML = '<p class="field-hint">⏳ Cargando alimentos…</p>';
    await cargarLista();
    pintar();
  };
})();
