// js/admin.js
const API_URL = '/api/grupos';

let gruposData = [];
let grupoAEliminar = null;
let filtroPlataformaActual = 'todas';

// ============================================
// CATEGORÍAS CONFIG
// ============================================
const CATEGORIAS = {
  'compra-venta': { label: 'Compra/Venta', emoji: '🛒', color: '#25D366' },
  'empleos':      { label: 'Empleos',      emoji: '💼', color: '#F59E0B' },
  'inmuebles':    { label: 'Inmuebles',     emoji: '🏠', color: '#3B82F6' },
  'ropa':   { label: 'Ropas',    emoji: '👕', color: '#8B5CF6' },
  'educacion':    { label: 'Educación',     emoji: '📚', color: '#EC4899' },
  'deportes':     { label: 'Deportes',      emoji: '⚽', color: '#EF4444' },
  'otro':         { label: 'Otro',          emoji: '📌', color: '#8ba0ae' }
};

function getCategoria(key) {
  return CATEGORIAS[key] || CATEGORIAS['otro'];
}

function badgeCategoria(key) {
  const c = getCategoria(key);
  return `<span style="background:${c.color}20;color:${c.color};border:1px solid ${c.color}40;border-radius:20px;padding:2px 8px;font-size:0.65rem;font-weight:600;">
    ${c.emoji} ${c.label}
  </span>`;
}

// ============================================
// PLATAFORMAS CONFIG
// ============================================
const PLATAFORMAS = {
  whatsapp: { label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', validar: link => link.startsWith('http') },
  telegram:  { label: 'Telegram',  icon: 'fab fa-telegram',  color: '#229ED9', validar: link => link.startsWith('http') },
  facebook:  { label: 'Facebook',  icon: 'fab fa-facebook',  color: '#1877F2', validar: link => link.startsWith('http') },
  discord:   { label: 'Discord',   icon: 'fab fa-discord',   color: '#5865F2', validar: link => link.startsWith('http') },
  otro:      { label: 'Otro',      icon: 'fas fa-link',      color: '#8ba0ae', validar: link => link.startsWith('http') }
};

function getPlataforma(key) {
  return PLATAFORMAS[key] || PLATAFORMAS.otro;
}

function badgePlataforma(key) {
  const p = getPlataforma(key);
  return `<span class="badge-plataforma" style="background:${p.color}20; color:${p.color}; border:1px solid ${p.color}40;">
    <i class="${p.icon}"></i> ${p.label}
  </span>`;
}

// ============================================
// CARGAR GRUPOS
// ============================================
async function cargarGrupos() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      gruposData = data.grupos || [];
    } else {
      const localRes = await fetch('data/grupos.json');
      const data = await localRes.json();
      gruposData = data.grupos || [];
    }
    renderizarTabla();
    actualizarEstadisticas();
  } catch (error) {
    mostrarNotificacion('❌ Error al cargar grupos: ' + error.message, 'error');
  }
}

// ============================================
// RENDERIZAR TABLA
// ============================================
function renderizarTabla() {
  const tbody = document.getElementById('adminGruposBody');
  if (!tbody) return;

  let datos = gruposData;
  if (filtroPlataformaActual !== 'todas') {
    datos = gruposData.filter(g => (g.plataforma || 'whatsapp') === filtroPlataformaActual);
  }

  if (datos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:2rem; color:#8ba0ae;">
          <i class="fas fa-inbox" style="font-size:1.5rem; display:block; margin-bottom:0.5rem;"></i>
          No hay grupos registrados
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = datos.map(grupo => {
    const idStr    = grupo.id || '';
    const grupoJSON = JSON.stringify(grupo).replace(/"/g, '&quot;');
    return `
    <tr data-id="${idStr}">
      <td>${idStr.slice(-6)}</td>
      <td>
        <div class="grupo-nombre">
          ${grupo.nombre || 'Sin nombre'}
          ${grupo.destacado ? '<span class="badge-destacado-admin"><i class="fas fa-star"></i></span>' : ''}
        </div>
      </td>
      <td>${badgePlataforma(grupo.plataforma || 'whatsapp')}</td>
      <td>${badgeCategoria(grupo.categoria || 'compra-venta')}</td>
      <td><span class="ciudad-badge">${grupo.ubicacion || 'N/A'}</span></td>
      <td>${grupo.miembros || 0}</td>
      <td>
        <label class="switch">
          <input type="checkbox" ${grupo.destacado ? 'checked' : ''}
                 onchange="toggleDestacado('${idStr}', this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <div class="acciones-btns">
          <button class="btn-edit" onclick="abrirModal(${grupoJSON})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-delete" onclick="abrirConfirmacion('${idStr}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const searchInput = document.getElementById('searchGrupos');
  if (searchInput) filtrarGruposAdmin(searchInput.value);
}

// ============================================
// ESTADÍSTICAS
// ============================================
function actualizarEstadisticas() {
  const total     = gruposData.length;
  const destacados = gruposData.filter(g => g.destacado).length;
  const ciudades  = new Set(gruposData.map(g => g.ubicacion).filter(Boolean)).size;

  const elTotal    = document.getElementById('totalGrupos');
  const elDest     = document.getElementById('totalDestacados');
  const elCiudades = document.getElementById('totalCiudades');

  if (elTotal)    elTotal.textContent    = total;
  if (elDest)     elDest.textContent     = destacados;
  if (elCiudades) elCiudades.textContent = ciudades;
}

// ============================================
// GUARDAR GRUPO
// ============================================
async function guardarGrupo(e) {
  e.preventDefault();

  const id = document.getElementById('editId').value;
  const plataformaSeleccionada = document.querySelector('input[name="plataforma"]:checked')?.value || 'whatsapp';
  const categoriaSeleccionada  = document.querySelector('input[name="categoria"]:checked')?.value  || 'compra-venta';

  const datos = {
    nombre:      document.getElementById('fNombre').value.trim(),
    descripcion: document.getElementById('fDescripcion').value.trim(),
    ubicacion:   document.getElementById('fCiudad').value,
    link:        document.getElementById('fEnlace').value.trim(),
    miembros:    parseInt(document.getElementById('fMiembros').value) || 0,
    activos:     parseInt(document.getElementById('fActivos').value)  || 0,
    destacado:   document.getElementById('fDestacado').checked,
    plataforma:  plataformaSeleccionada,
    categoria:   categoriaSeleccionada
  };

  if (!datos.nombre || datos.nombre.length < 3) {
    mostrarNotificacion('❌ El nombre debe tener al menos 3 caracteres', 'error');
    return;
  }
  if (!datos.link || !datos.link.startsWith('http')) {
    mostrarNotificacion('❌ Ingresa un enlace válido', 'error');
    return;
  }

  try {
    let response;
    if (id) {
      response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, datos })
      });
    } else {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo: datos })
      });
    }

    const result = await response.json();

    if (response.ok && result.success) {
      await cargarGrupos();
      cerrarModal();
      mostrarNotificacion('✅ Grupo guardado exitosamente');
    } else {
      mostrarNotificacion('❌ Error: ' + (result.error || 'Error al guardar'), 'error');
    }
  } catch (error) {
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// ============================================
// ELIMINAR GRUPO
// ============================================
async function eliminarGrupo() {
  if (!grupoAEliminar) return;

  try {
    const response = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: grupoAEliminar })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      await cargarGrupos();
      cerrarConfirmacion();
      mostrarNotificacion('🗑️ Grupo eliminado correctamente');
      grupoAEliminar = null;
    } else {
      mostrarNotificacion('❌ Error: ' + (result.error || 'Error al eliminar'), 'error');
    }
  } catch (error) {
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// ============================================
// TOGGLE DESTACADO
// ============================================
async function toggleDestacado(id, checked) {
  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, datos: { destacado: checked } })
    });

    if (response.ok) {
      await cargarGrupos();
      mostrarNotificacion(checked ? '⭐ Destacado activado' : '⭐ Destacado desactivado');
    }
  } catch (error) {
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// ============================================
// MODAL CREAR/EDITAR
// ============================================
function abrirModal(grupo = null) {
  const modal  = document.getElementById('modalGrupo');
  const form   = document.getElementById('formGrupo');
  const titulo = document.getElementById('modalTitulo');

  form.reset();
  document.getElementById('editId').value = '';
  document.querySelector('input[name="plataforma"][value="whatsapp"]').checked = true;
  document.querySelector('input[name="categoria"][value="compra-venta"]').checked = true;
  actualizarHintEnlace('whatsapp');

  if (grupo) {
    titulo.innerHTML = '<i class="fas fa-edit"></i> Editar Grupo';
    document.getElementById('editId').value       = grupo.id        || '';
    document.getElementById('fNombre').value      = grupo.nombre    || '';
    document.getElementById('fDescripcion').value = grupo.descripcion || '';
    document.getElementById('fCiudad').value      = grupo.ubicacion || '';
    document.getElementById('fEnlace').value      = grupo.link      || '';
    document.getElementById('fMiembros').value    = grupo.miembros  || 0;
    document.getElementById('fActivos').value     = grupo.activos   || 0;
    document.getElementById('fDestacado').checked = Boolean(grupo.destacado);

    // Plataforma
    const plat  = grupo.plataforma || 'whatsapp';
    const radio = document.querySelector(`input[name="plataforma"][value="${plat}"]`);
    if (radio) radio.checked = true;
    actualizarHintEnlace(plat);

    // Categoría
    const cat      = grupo.categoria || 'compra-venta';
    const radioCat = document.querySelector(`input[name="categoria"][value="${cat}"]`);
    if (radioCat) radioCat.checked = true;

  } else {
    titulo.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Grupo';
  }

  modal.style.display = 'flex';
}

function cerrarModal() {
  const modal = document.getElementById('modalGrupo');
  if (modal) modal.style.display = 'none';
}

function abrirConfirmacion(id) {
  grupoAEliminar = id;
  const modal = document.getElementById('modalConfirmacion');
  if (modal) modal.style.display = 'flex';
}

function cerrarConfirmacion() {
  grupoAEliminar = null;
  const modal = document.getElementById('modalConfirmacion');
  if (modal) modal.style.display = 'none';
}

// ============================================
// HINT DINÁMICO DEL ENLACE
// ============================================
const HINTS = {
  whatsapp: 'Ej: https://chat.whatsapp.com/ABC123...',
  telegram:  'Ej: https://t.me/nombre_del_grupo',
  facebook:  'Ej: https://www.facebook.com/groups/...',
  discord:   'Ej: https://discord.gg/codigo...',
  otro:      'Pega el enlace de invitación del grupo'
};

function actualizarHintEnlace(plataforma) {
  const hint  = document.getElementById('enlaceHint');
  const input = document.getElementById('fEnlace');
  if (hint)  hint.textContent  = HINTS[plataforma] || HINTS.otro;
  if (input) input.placeholder = HINTS[plataforma] || HINTS.otro;
}

// ============================================
// FILTRAR TABLA
// ============================================
function filtrarGruposAdmin(texto) {
  const filas = document.querySelectorAll('#adminGruposBody tr');
  const q = (texto || '').toLowerCase();
  filas.forEach(fila => {
    fila.style.display = fila.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ============================================
// NOTIFICACIONES
// ============================================
function mostrarNotificacion(mensaje, tipo = 'success') {
  let el = document.getElementById('notificacion');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notificacion';
    el.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;z-index:9999;font-weight:600;display:none;color:#fff;';
    document.body.appendChild(el);
  }
  el.textContent = mensaje;
  el.style.background = tipo === 'error' ? '#e74c3c' : '#25D366';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  cargarGrupos();

  document.getElementById('btnNuevoGrupo')?.addEventListener('click', () => abrirModal());
  document.getElementById('closeModalBtn')?.addEventListener('click', cerrarModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', cerrarModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', eliminarGrupo);
  document.getElementById('cancelConfirmBtn')?.addEventListener('click', cerrarConfirmacion);
  document.getElementById('formGrupo')?.addEventListener('submit', guardarGrupo);
  document.getElementById('searchGrupos')?.addEventListener('input', e => filtrarGruposAdmin(e.target.value));

  document.querySelectorAll('input[name="plataforma"]').forEach(radio => {
    radio.addEventListener('change', () => actualizarHintEnlace(radio.value));
  });

  document.querySelectorAll('.btn-plataforma').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-plataforma').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      filtroPlataformaActual = btn.dataset.plataforma;
      renderizarTabla();
    });
  });
});
