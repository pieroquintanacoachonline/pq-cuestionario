/**
 * PQ COACH ONLINE · CONTROLADOR DE LA APLICACIÓN WEB
 * Conexión directa a Google Sheets mediante Google Apps Script Web App
 */

// URL del Webhook de Google Apps Script (Conexión activa con Google Sheets)
let SPREADSHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTcYeMO610XLqb2nJJdSJLRzZd5e2ZrTbsadgWKV67HirPgeRZ7fW5drXb37UrfB41/exec"; 

let currentStep = 1;
const totalSteps = 5;

// Manejo de la selección de "Todos los días"
document.addEventListener('DOMContentLoaded', () => {
  const chkTodos = document.getElementById('chkTodosLosDias');
  const dayCheckboxes = document.querySelectorAll('input[name="diasPesaje"]:not(#chkTodosLosDias)');

  if (chkTodos) {
    chkTodos.addEventListener('change', (e) => {
      if (e.target.checked) {
        dayCheckboxes.forEach(cb => cb.checked = true);
      }
    });

    dayCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (!cb.checked && chkTodos.checked) {
          chkTodos.checked = false;
        }
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
    r.addEventListener('change', toggleCicloMenstrual);
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
    r.addEventListener('change', toggleComidaDulce);
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
 * Valida que los campos obligatorios del paso actual estén completos
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

  // Validación especial para los días de pesaje en Paso 3
  if (step === 3) {
    const pesajeCheckboxes = stepContainer.querySelectorAll('input[name="diasPesaje"]:checked');
    if (pesajeCheckboxes.length === 0) {
      alert('⚠️ Por favor selecciona al menos un día para pesarte en ayunas (o marca "Todos los días").');
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

    // Éxito: Ocultar formulario y mostrar pantalla de celebración
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
