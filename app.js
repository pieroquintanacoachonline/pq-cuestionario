/**
 * PQ COACH ONLINE · CONTROLADOR DE LA APLICACIÓN WEB
 * Conexión directa a Google Sheets mediante Google Apps Script Web App
 */

// URL del Webhook de Google Apps Script (Conexión activa con Google Sheets)
let SPREADSHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTcYeMO610XLqb2nJJdSJLRzZd5e2ZrTbsadgWKV67HirPgeRZ7fW5drXb37UrfB41/exec"; 

let currentStep = 1;
const totalSteps = 5;

// ==========================================
// AUTOGUARDADO Y RESTAURACIÓN (LocalStorage)
// ==========================================
// ===== Ranking de favoritos: el orden en que se tocan los chips es el orden de preferencia =====
const RANKING_GRUPOS = { proteinasFav: 5, carbosFav: 5, grasasFav: 3 };
const rankOrder = { proteinasFav: [], carbosFav: [], grasasFav: [] };

function updateRankBadges() {
  Object.keys(RANKING_GRUPOS).forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
      const chip = cb.closest('.chip-item');
      if (!chip) return;
      let badge = chip.querySelector('.rank-badge');
      if (!badge) {
        badge = document.createElement('b');
        badge.className = 'rank-badge';
        chip.appendChild(badge);
      }
      const pos = rankOrder[name].indexOf(cb.value);
      chip.classList.toggle('ranked', pos !== -1);
      badge.textContent = pos !== -1 ? String(pos + 1) : '';
    });
  });
}

function onRankChange(e) {
  const cb = e.target;
  const name = cb.name;
  if (!RANKING_GRUPOS[name]) return;
  const lista = rankOrder[name];
  if (cb.checked) {
    if (lista.length >= RANKING_GRUPOS[name]) {
      cb.checked = false;
      const hint = cb.closest('.form-group') && cb.closest('.form-group').querySelector('.rank-hint');
      if (hint) { hint.classList.add('rank-hint-alert'); setTimeout(() => hint.classList.remove('rank-hint-alert'), 1600); }
      return;
    }
    if (!lista.includes(cb.value)) lista.push(cb.value);
  } else {
    const i = lista.indexOf(cb.value);
    if (i !== -1) lista.splice(i, 1);
  }
  updateRankBadges();
}

function initRanking() {
  Object.keys(RANKING_GRUPOS).forEach(name => {
    // Si había selección sin orden guardado (p. ej. borrador antiguo), se respeta el orden de pantalla
    const marcados = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value);
    rankOrder[name] = rankOrder[name].filter(v => marcados.includes(v));
    marcados.forEach(v => { if (!rankOrder[name].includes(v) && rankOrder[name].length < RANKING_GRUPOS[name]) rankOrder[name].push(v); });
    document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
      cb.checked = rankOrder[name].includes(cb.value);
      cb.addEventListener('change', onRankChange);
    });
  });
  updateRankBadges();
}

// ===== Buscador de otros alimentos (sugerencias + etiquetas) =====
const FOOD_SUGGESTIONS = [
  'Pechuga de pollo','Pierna de pollo','Muslo de pollo','Pavo','Carne de res magra','Carne molida magra','Lomo de res','Lomo de cerdo','Cerdo magro',
  'Huevos enteros','Claras de huevo','Atún al agua','Pescado blanco','Merluza','Tilapia','Trucha','Salmón','Bonito','Jurel','Pota','Camarones','Langostinos','Mariscos',
  'Lentejas','Garbanzos','Frijoles','Pallares','Arvejas','Habas','Tofu','Tempeh','Proteína whey',
  'Yogur griego','Yogur natural','Queso fresco','Queso cottage','Leche descremada','Leche deslactosada','Kéfir',
  'Arroz blanco','Arroz integral','Papa','Camote','Plátano bellaco','Yuca','Olluco','Choclo','Quinoa','Avena','Pasta / Fideos','Pan de molde','Pan integral','Pan pita','Tostadas','Tortillas','Galletas de arroz','Cereal integral','Granola',
  'Plátano','Manzana','Naranja','Mandarina','Pera','Durazno','Papaya','Piña','Sandía','Melón','Mango','Fresas','Arándanos','Uvas','Kiwi',
  'Palta','Aceite de oliva','Almendras','Nueces','Maní','Mantequilla de maní','Aceitunas','Semillas de chía','Linaza',
  'Brócoli','Espinaca','Zanahoria','Tomate','Pepino','Lechuga','Espárragos','Champiñones','Vainitas','Zapallo','Coliflor','Pimiento','Cebolla'
];

function initOtrosAlimentos() {
  const input = document.getElementById('otroAlimentoInput');
  const hidden = document.getElementById('otrosAlimentos');
  const tagsEl = document.getElementById('otrosAlimentosTags');
  const dl = document.getElementById('foodSuggestions');
  if (!input || !hidden || !tagsEl || !dl) return;
  dl.innerHTML = FOOD_SUGGESTIONS.map(f => `<option value="${f}"></option>`).join('');
  let tags = hidden.value ? hidden.value.split(',').map(t => t.trim()).filter(Boolean) : [];

  function sync() {
    hidden.value = tags.join(', ');
    tagsEl.innerHTML = '';
    tags.forEach((t, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = t + ' ';
      const x = document.createElement('button');
      x.type = 'button';
      x.setAttribute('aria-label', 'Quitar ' + t);
      x.textContent = '×';
      x.addEventListener('click', () => { tags.splice(i, 1); sync(); });
      chip.appendChild(x);
      tagsEl.appendChild(chip);
    });
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function add(valor) {
    const v = (valor || '').trim().replace(/,/g, ' ');
    if (!v || tags.length >= 15) return;
    if (!tags.some(t => t.toLowerCase() === v.toLowerCase())) tags.push(v);
    input.value = '';
    sync();
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); }
    else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); sync(); }
  });
  // Al elegir una sugerencia de la lista el navegador dispara "change"
  input.addEventListener('change', () => add(input.value));
  sync();
}
const DRAFT_KEY = 'pq_cuestionario_draft';

function saveDraft() {
  try {
    const form = document.getElementById('onboardingForm');
    if (!form) return;
    const draft = {
      values: {},
      radios: {},
      checkboxes: {},
      updatedAt: new Date().toISOString()
    };

    // Text, number, date, select, textarea
    form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select, textarea').forEach(el => {
      if (el.name) {
        draft.values[el.name] = el.value;
      }
    });

    // Radios
    form.querySelectorAll('input[type="radio"]:checked').forEach(el => {
      if (el.name) {
        draft.radios[el.name] = el.value;
      }
    });

    // Checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (el.name) {
        if (!draft.checkboxes[el.name]) draft.checkboxes[el.name] = [];
        if (el.checked) draft.checkboxes[el.name].push(el.value);
      }
    });
    Object.keys(RANKING_GRUPOS).forEach(name => { draft.checkboxes[name] = rankOrder[name].slice(); });


    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn("No se pudo autoguardar borrador en localStorage", e);
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    const form = document.getElementById('onboardingForm');
    if (!form) return;

    // Restaurar campos de texto, números, fechas, selects y textareas
    if (draft.values) {
      Object.keys(draft.values).forEach(name => {
        const el = form.querySelector(`[name="${name}"]`);
        if (el && el.type !== 'radio' && el.type !== 'checkbox') {
          el.value = draft.values[name];
        }
      });
    }

    // Restaurar radios
    if (draft.radios) {
      Object.keys(draft.radios).forEach(name => {
        const val = draft.radios[name];
        const radio = form.querySelector(`input[name="${name}"][value="${val}"]`);
        if (radio) {
          radio.checked = true;
        }
      });
    }

    // Restaurar checkboxes
    if (draft.checkboxes) {
      Object.keys(draft.checkboxes).forEach(name => {
        const checkedList = draft.checkboxes[name] || [];
        form.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
          cb.checked = checkedList.includes(cb.value);
        });
      });
      Object.keys(RANKING_GRUPOS).forEach(name => { rankOrder[name] = (draft.checkboxes[name] || []).slice(0, RANKING_GRUPOS[name]); });

    }
  } catch (e) {
    console.warn("No se pudo restaurar borrador de localStorage", e);
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // 1. Restaurar borrador previo si existe
  restoreDraft();
  initRanking();
  initOtrosAlimentos();

  const form = document.getElementById('onboardingForm');
  if (form) {
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);
  }

  // Manejo de la selección de "Todos los días"
  const chkTodos = document.getElementById('chkTodosLosDias');
  const dayCheckboxes = document.querySelectorAll('input[name="diasPesaje"]:not(#chkTodosLosDias)');

  if (chkTodos) {
    chkTodos.addEventListener('change', (e) => {
      if (e.target.checked) {
        dayCheckboxes.forEach(cb => cb.checked = true);
      }
      saveDraft();
    });

    dayCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (!cb.checked && chkTodos.checked) {
          chkTodos.checked = false;
        }
        saveDraft();
      });
    });
  }

  // Limpiar bordes rojos al interactuar con cualquier campo
  document.querySelectorAll('input, select, textarea').forEach(elem => {
    elem.addEventListener('input', () => { elem.style.borderColor = ''; });
    elem.addEventListener('change', () => { elem.style.borderColor = ''; });
  });

  // Mostrar / ocultar sección de ciclo menstrual según el sexo seleccionado
  function toggleCicloMenstrual() {
    const sexoRadio = document.querySelector('input[name="sexo"]:checked');
    const secCiclo = document.getElementById('seccionCicloMenstrual');
    const selRegularidad = document.getElementById('regularidadCiclo');
    if (!secCiclo) return;

    if (sexoRadio && sexoRadio.value === 'Mujer') {
      secCiclo.style.display = 'block';
      if (selRegularidad) selRegularidad.required = true;
    } else {
      secCiclo.style.display = 'none';
      if (selRegularidad) {
        selRegularidad.required = false;
        selRegularidad.style.borderColor = '';
      }
    }
  }

  document.querySelectorAll('input[name="sexo"]').forEach(r => {
    r.addEventListener('change', () => {
      toggleCicloMenstrual();
      saveDraft();
    });
  });
  toggleCicloMenstrual();

  // Mostrar / ocultar sección de cantidad de comidas dulces
  function toggleComidaDulce() {
    const dulceRadio = document.querySelector('input[name="gustaDulce"]:checked');
    const secDulce = document.getElementById('seccionCantidadDulce');
    if (!secDulce) return;

    if (dulceRadio && dulceRadio.value === 'Si') {
      secDulce.style.display = 'block';
    } else {
      secDulce.style.display = 'none';
    }
  }

  document.querySelectorAll('input[name="gustaDulce"]').forEach(r => {
    r.addEventListener('change', () => {
      toggleComidaDulce();
      saveDraft();
    });
  });
  toggleComidaDulce();
});

/**
 * Avanza al siguiente paso con validación previa
 */
function nextStep(step) {
  if (!validateStep(step)) {
    return;
  }

  if (step < totalSteps) {
    document.getElementById(`step-${step}`).classList.remove('active');
    currentStep = step + 1;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    updateProgress();
    window.scrollTo({ top: 100, behavior: 'smooth' });
  }
}

/**
 * Retrocede al paso anterior
 */
function prevStep(step) {
  if (step > 1) {
    document.getElementById(`step-${step}`).classList.remove('active');
    currentStep = step - 1;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    updateProgress();
    window.scrollTo({ top: 100, behavior: 'smooth' });
  }
}

/**
 * Actualiza la barra de progreso y los indicadores
 */
function updateProgress() {
  const progressPercent = (currentStep / totalSteps) * 100;
  document.getElementById('progressBar').style.width = `${progressPercent}%`;

  const pills = document.querySelectorAll('.step-pill');
  pills.forEach((pill, idx) => {
    const pillStep = idx + 1;
    pill.classList.remove('active', 'completed');
    if (pillStep === currentStep) {
      pill.classList.add('active');
    } else if (pillStep < currentStep) {
      pill.classList.add('completed');
    }
  });
}

/**
 * Valida que los campos obligatorios del paso actual estén completos y con valores válidos
 */
function validateStep(step) {
  const stepContainer = document.getElementById(`step-${step}`);
  const requiredInputs = stepContainer.querySelectorAll('[required]');
  let isValid = true;
  let firstInvalid = null;

  requiredInputs.forEach(input => {
    if (input.type === 'radio') {
      const radioGroup = stepContainer.querySelectorAll(`input[name="${input.name}"]`);
      const anyChecked = Array.from(radioGroup).some(r => r.checked);
      if (!anyChecked) {
        isValid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    } else if (!input.value || input.value.trim() === '') {
      input.style.borderColor = '#EF4444';
      isValid = false;
      if (!firstInvalid) firstInvalid = input;
    } else {
      input.style.borderColor = '';
    }
  });

  // Validaciones específicas de Paso 1 (Datos Básicos)
  if (step === 1) {
    const sexoChecked = stepContainer.querySelector('input[name="sexo"]:checked');
    if (!sexoChecked) {
      alert('⚠️ Por favor selecciona tu Sexo Biológico (Hombre o Mujer).');
      const radioGrp = stepContainer.querySelector('.radio-toggle-group');
      if (radioGrp) radioGrp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    const pesoInput = document.getElementById('peso');
    if (pesoInput) {
      const pVal = parseFloat(pesoInput.value);
      if (isNaN(pVal) || pVal < 35 || pVal > 250) {
        pesoInput.style.borderColor = '#EF4444';
        alert('⚠️ Por favor ingresa un peso válido entre 35 kg y 250 kg.');
        pesoInput.focus();
        return false;
      }
    }

    const estInput = document.getElementById('estatura');
    if (estInput) {
      const eVal = parseFloat(estInput.value);
      if (isNaN(eVal) || eVal < 120 || eVal > 230) {
        estInput.style.borderColor = '#EF4444';
        alert('⚠️ Por favor ingresa una estatura válida entre 120 cm y 230 cm.');
        estInput.focus();
        return false;
      }
    }
  }

  // Validación especial para los días de pesaje en Paso 3
  if (step === 3) {
    const pesajeCheckboxes = stepContainer.querySelectorAll('input[name="diasPesaje"]:checked');
    if (pesajeCheckboxes.length === 0) {
      alert('⚠️ Por favor selecciona al menos un día para pesarte en ayunas (o marca "Todos los días").');
      return false;
    }
  }

  // Validación de variedad de alimentos en Paso 4
  if (step === 4) {
    const proteinasChecked = stepContainer.querySelectorAll('input[name="proteinasFav"]:checked');
    if (proteinasChecked.length === 0) {
      alert('⚠️ Por favor selecciona al menos una proteína favorita para armar tu plan de comidas.');
      const sec = document.getElementById('chipsProteinas');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    const carbosChecked = stepContainer.querySelectorAll('input[name="carbosFav"]:checked');
    if (carbosChecked.length === 0) {
      alert('⚠️ Por favor selecciona al menos un carbohidrato favorito.');
      const sec = document.getElementById('chipsCarbos');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    const grasasChecked = stepContainer.querySelectorAll('input[name="grasasFav"]:checked');
    if (grasasChecked.length === 0) {
      alert('⚠️ Por favor selecciona al menos una fuente de grasas saludables favorita.');
      const sec = document.getElementById('chipsGrasas');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
  }

  if (!isValid && firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return isValid;
}

/**
 * Envío final del cuestionario a Google Sheets
 */
async function submitOnboarding() {
  if (!validateStep(5)) {
    return;
  }

  const btnSubmit = document.getElementById('btnSubmit');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '⏳ Enviando al sistema...';

  // Recolectar datos
  const form = document.getElementById('onboardingForm');
  const formData = new FormData(form);

  function getCheckboxValues(name) {
    if (RANKING_GRUPOS[name]) {
      // Formato "1. Pechuga de pollo, 2. Huevos enteros": el número es la posición en el ranking
      return rankOrder[name].map((v, i) => (i + 1) + '. ' + v).join(', ');
    }
    const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checked).map(c => c.value).join(', ');
  }

  const payload = {
    timestamp: new Date().toISOString(),
    nombre: formData.get('nombre') || '',
    objetivo: formData.get('objetivo') || '',
    email: formData.get('email') || '',
    fechaNacimiento: formData.get('fechaNacimiento') || '',
    sexo: formData.get('sexo') || '',
    peso: formData.get('peso') || '',
    estatura: formData.get('estatura') || '',
    whatsapp: formData.get('whatsapp') || '',
    instagram: formData.get('instagram') || '',
    alergias: formData.get('alergias') || '',
    digestion: getCheckboxValues('digestion'),
    medicamentos: formData.get('medicamentos') || '',
    regularidadCiclo: formData.get('regularidadCiclo') || '',
    fechaUltimaRegla: formData.get('fechaUltimaRegla') || '',
    sintomasLutea: getCheckboxValues('sintomasLutea'),
    energiaFolicular: formData.get('energiaFolicular') || '',
    comidasAlDia: formData.get('comidasAlDia') || '',
    horarioDesayuno: formData.get('horarioDesayuno') || '',
    horarioAlmuerzo: formData.get('horarioAlmuerzo') || '',
    horarioCena: formData.get('horarioCena') || '',
    balanzaCocina: formData.get('balanzaCocina') || '',
    modoPesajeAlimentos: formData.get('modoPesajeAlimentos') || '',
    diasPesaje: getCheckboxValues('diasPesaje'), // ⚖️ DÍAS DE PESAJE ACORDADOS
    horarioEntreno: formData.get('horarioEntreno') || '',
    preEntreno: formData.get('preEntreno') || '',
    proteinasFav: getCheckboxValues('proteinasFav'),
    proteinasEvitar: formData.get('proteinasEvitar') || '',
    carbosFav: getCheckboxValues('carbosFav'),
    carbosEvitar: formData.get('carbosEvitar') || '',
    grasasFav: getCheckboxValues('grasasFav'),
    otrosAlimentos: formData.get('otrosAlimentos') || '',
    lacteos: formData.get('lacteos') || '',
    gustaDulce: formData.get('gustaDulce') || '',
    numComidasDulces: (formData.get('gustaDulce') === 'Si') ? (formData.get('numComidasDulces') || '1 comida dulce al día') : '0 (Prefiere 100% salado)',
    porcionesFruta: formData.get('porcionesFruta') || '',
    frutasFav: formData.get('frutasFav') || '',
    verdurasEvitar: formData.get('verdurasEvitar') || '',
    indispensables: formData.get('indispensables') || '',
    notas: formData.get('notas') || ''
  };

  console.log("📤 Enviando datos de onboarding:", payload);

  try {
    if (SPREADSHEET_WEBHOOK_URL && SPREADSHEET_WEBHOOK_URL.trim() !== "") {
      // Enviar por POST a Google Apps Script
      await fetch(SPREADSHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    } else {
      // Modo local / Preview (simulado 1 seg)
      await new Promise(r => setTimeout(r, 1000));
    }

    // Éxito: Limpiar borrador guardado
    localStorage.removeItem(DRAFT_KEY);

    // Ocultar formulario y mostrar pantalla de celebración
    form.style.display = 'none';
    const successScreen = document.getElementById('successScreen');
    successScreen.style.display = 'block';

    // Lanzar confeti
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    // Configurar enlace de WhatsApp directo para el Coach
    const coachPhone = "51990467554";
    const cleanNombre = payload.nombre ? payload.nombre.trim() : "";
    const cleanObjetivo = payload.objetivo ? payload.objetivo.trim() : "";

    const msgWhatsApp = encodeURIComponent(
      `Hola Coach, acabo de completar mi cuestionario inicial para comenzar con mi plan.\n\n` +
      `👤 Nombre: ${cleanNombre}\n` +
      `🎯 Objetivo: ${cleanObjetivo}`
    );
    const linkWhatsApp = `https://wa.me/${coachPhone}?text=${msgWhatsApp}`;
    document.getElementById('btnAvisarWhatsApp').href = linkWhatsApp;

    window.scrollTo({ top: 100, behavior: 'smooth' });

  } catch (error) {
    console.error("Error al enviar el formulario:", error);
    alert("Hubo un detalle de conexión, pero tus respuestas han sido guardadas. Por favor avisa a Piero por WhatsApp.");
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '🚀 Reintentar Envío';
  }
}
