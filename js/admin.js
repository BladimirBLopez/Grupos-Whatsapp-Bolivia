// js/admin.js
const API_URL = '/api/grupos';

function getToken() {
  return sessionStorage.getItem('qigrupos_token') || '';
}

function headersAdmin() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': getToken()
  };
}

let gruposData = [];
let grupoAEliminar = null;
let filtroPlataformaActual = 'todas';
let filtroCiudadActual = 'todas';
let filtroSoloReportados = false;
let formModificado = false;
let categoriasData = [];
let dragSrcIndex = null;
let imagenPreviewUrl = '';
let previewTimeout = null;

// ============================================
// CATEGORÍAS CONFIG
// ============================================
const CATEGORIAS = {
  'compra-venta': { label: 'Compra/Venta', emoji: '🛒', color: '#25D366' },
  'empleos':      { label: 'Empleos',      emoji: '💼', color: '#F59E0B' },
  'inmuebles':    { label: 'Inmuebles',    emoji: '🏠', color: '#3B82F6' },
  'ropa':         { label: 'Ropas',        emoji: '👕', color: '#8B5CF6' },
  'citas':        { label: 'Citas/Amigos', emoji: '💬', color: '#EC4899' },
  'futbol':       { label: 'Streaming',    emoji: '🎬', color: '#EF4444' },
  'otro':         { label: 'Otros',        emoji: '🗂️', color: '#8ba0ae' }
};

function getCategoria(slug) {
  const cat = categoriasData.find(c => c.slug === slug);
  if (cat) return { label: cat.label, emoji: cat.emoji, color: '#25D366' };
  return { label: slug || 'Otro', emoji: '🗂️', color: '#8ba0ae' };
}

function badgeCategoria(slug) {
  const c = getCategoria(slug);
  return `<span class="badge-categoria" title="${c.label}" style="background:#25D36620;border:1px solid #25D36640;">
    ${c.emoji}
  </span>`;
}

// ============================================
// PLATAFORMAS CONFIG
// ============================================
const PLATAFORMAS = {
  whatsapp:  { label: 'WhatsApp',  icon: 'fab fa-whatsapp',  color: '#25D366', validar: link => link.startsWith('http') },
  telegram:  { label: 'Telegram',  icon: 'fab fa-telegram',  color: '#229ED9', validar: link => link.startsWith('http') },
  facebook:  { label: 'Facebook',  icon: 'fab fa-facebook',  color: '#1877F2', validar: link => link.startsWith('http') },
  instagram: { label: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C', validar: link => link.startsWith('http') },
  otro:      { label: 'Otro',      icon: 'fas fa-link',      color: '#8ba0ae', validar: link => link.startsWith('http') }
};

function getPlataforma(key) {
  return PLATAFORMAS[key] || PLATAFORMAS.otro;
}

function badgePlataforma(key) {
  const p = getPlataforma(key);
  return `<span class="badge-plataforma" title="${p.label}" style="background:${p.color}20; color:${p.color}; border:1px solid ${p.color}40;">
    <i class="${p.icon}"></i>
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
    datos = datos.filter(g => (g.plataforma || 'whatsapp') === filtroPlataformaActual);
  }
  if (filtroCiudadActual !== 'todas') {
    datos = datos.filter(g => g.ubicacion === filtroCiudadActual);
  }
  if (filtroSoloReportados) {
    datos = datos.filter(g => (g.reportes || 0) > 0);
  }

  if (datos.length === 0) {
    tbody.innerHTML = `<tr><td class="td-vacio" colspan="8" style="text-align:center;padding:2rem;color:#8ba0ae;">
      <i class="fas fa-inbox" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;"></i>No hay grupos que coincidan con este filtro
    </td></tr>`;
    return;
  }

  tbody.innerHTML = datos.map(grupo => {
    const idStr = grupo.id || '';
    const grupoJSON = JSON.stringify(grupo).replace(/"/g, '&quot;');
    const nombreSeguroTitle = (grupo.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
    <tr data-id="${idStr}">
      <td>${idStr.slice(-6)}</td>
      <td>
        <div class="grupo-nombre">
          ${grupo.imagen ? `<img src="${grupo.imagen}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:4px;vertical-align:middle;" onerror="this.style.display='none'">` : ''}
          ${grupo.nombre || 'Sin nombre'}
          ${grupo.destacado ? '<span class="badge-destacado-admin"><i class="fas fa-star"></i></span>' : ''}
          ${(grupo.reportes || 0) > 0 ? `<span class="badge-reportes" title="Reportado ${grupo.reportes} vez(es). Tocar para marcar como revisado" onclick="event.stopPropagation();resetearReportes('${idStr}','${nombreSeguroTitle}')"><i class="fas fa-flag"></i> ${grupo.reportes}</span>` : ''}
        </div>
      </td>
      <td>${badgePlataforma(grupo.plataforma || 'whatsapp')}</td>
      <td>${badgeCategoria(grupo.categoria || 'compra-venta')}</td>
      <td><span class="ciudad-badge">${grupo.ubicacion || 'N/A'}</span></td>
      <td>${grupo.miembros || 0}</td>
      <td>
        <label class="switch">
          <input type="checkbox" ${grupo.destacado ? 'checked' : ''} onchange="toggleDestacado('${idStr}', this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <div class="acciones-btns">
          <button class="btn-edit" onclick="abrirModal(${grupoJSON})"><i class="fas fa-edit"></i></button>
          <button class="btn-delete" onclick="abrirConfirmacion('${idStr}')"><i class="fas fa-trash-alt"></i></button>
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
  const reportados = gruposData.filter(g => (g.reportes || 0) > 0).length;
  const elTotal    = document.getElementById('totalGrupos');
  const elDest     = document.getElementById('totalDestacados');
  const elCiudades = document.getElementById('totalCiudades');
  const elReport   = document.getElementById('totalReportados');
  if (elTotal)    elTotal.textContent    = total;
  if (elDest)     elDest.textContent     = destacados;
  if (elCiudades) elCiudades.textContent = ciudades;
  if (elReport)   elReport.textContent   = reportados;
}

function filtrarSoloReportados() {
  filtroSoloReportados = !filtroSoloReportados;
  mostrarSeccion('grupos');
  renderizarTabla();
}

async function resetearReportes(id, nombre) {
  if (!confirm(`\u00bfMarcar como revisado el link de "${nombre}"? Esto pone el contador de reportes en 0.`)) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: headersAdmin(),
      body: JSON.stringify({ accion: 'resetear-reportes', id })
    });
    if (res.ok) {
      const g = gruposData.find(g => g.id === id);
      if (g) g.reportes = 0;
      actualizarEstadisticas();
      renderizarTabla();
    }
  } catch(e) { alert('Error al resetear reportes'); }
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
    categoria:   categoriaSeleccionada,
    imagen:      imagenPreviewUrl || ''
  };

  if (!datos.nombre || datos.nombre.length < 3) {
    mostrarNotificacion('❌ El nombre debe tener al menos 3 caracteres', 'error'); return;
  }
  if (!datos.link || !datos.link.startsWith('http')) {
    mostrarNotificacion('❌ Ingresa un enlace válido', 'error'); return;
  }

  try {
    let response;
    if (id) {
      response = await fetch(API_URL, { method: 'PUT', headers: headersAdmin(), body: JSON.stringify({ id, datos }) });
    } else {
      response = await fetch(API_URL, { method: 'POST', headers: headersAdmin(), body: JSON.stringify({ grupo: datos }) });
    }
    const result = await response.json();
    if (response.ok && result.success) {
      await cargarGrupos();
      cerrarModal(true);
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
    const response = await fetch(API_URL, { method: 'DELETE', headers: headersAdmin(), body: JSON.stringify({ id: grupoAEliminar }) });
    const result = await response.json();
    if (response.ok && result.success) {
      // Eliminar del array local inmediatamente
      gruposData = gruposData.filter(g => g.id !== grupoAEliminar);
      renderizarTabla();
      actualizarEstadisticas();
      cerrarConfirmacion();
      mostrarNotificacion('🗑️ Grupo eliminado correctamente');
      grupoAEliminar = null;
      // Recargar en background
      cargarGrupos();
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
    const response = await fetch(API_URL, { method: 'PUT', headers: headersAdmin(), body: JSON.stringify({ id, datos: { destacado: checked } }) });
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
  formModificado = false;
  imagenPreviewUrl = '';

  // Limpiar preview imagen
  const prevEl = document.getElementById('grupoImagenPreview');
  if (prevEl) prevEl.innerHTML = '';

  // Seleccionar primera categoría por defecto
  const primerRadio = document.querySelector('input[name="categoria"]');
  if (primerRadio) primerRadio.checked = true;
  document.querySelector('input[name="plataforma"][value="whatsapp"]').checked = true;
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

    const plat  = grupo.plataforma || 'whatsapp';
    const radio = document.querySelector(`input[name="plataforma"][value="${plat}"]`);
    if (radio) radio.checked = true;
    actualizarHintEnlace(plat);

    const cat = grupo.categoria || 'compra-venta';
    const radioCat = document.querySelector(`input[name="categoria"][value="${cat}"]`);
    if (radioCat) radioCat.checked = true;

    if (grupo.imagen) {
      imagenPreviewUrl = grupo.imagen;
      mostrarImagenPreview(grupo.imagen);
    }
  } else {
    titulo.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Grupo';
  }

  setTimeout(() => {
    document.querySelectorAll('#formGrupo input, #formGrupo textarea, #formGrupo select').forEach(el => {
      el.addEventListener('change', () => { formModificado = true; });
      el.addEventListener('input',  () => { formModificado = true; });
    });
  }, 150);

  modal.style.display = 'flex';
}

function cerrarModal(forzar = false) {
  if (!forzar && formModificado) {
    const descartar = confirm('Tienes cambios sin guardar.\n\nAceptar = Descartar cambios\nCancelar = Seguir editando');
    if (!descartar) return;
  }
  formModificado = false;
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
// PREVIEW AUTOMÁTICO
// ============================================
async function fetchPreview(url) {
  if (!url || !url.startsWith('http')) return;
  if (!url.includes('whatsapp.com')) return;

  const btn = document.getElementById('btnPreview');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }

  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.success) {
      const fNombre = document.getElementById('fNombre');
      if (fNombre && !fNombre.value.trim() && data.nombre) { fNombre.value = data.nombre; formModificado = true; }
      const fDesc = document.getElementById('fDescripcion');
      if (fDesc && !fDesc.value.trim() && data.descripcion) { fDesc.value = data.descripcion; formModificado = true; }
      if (data.imagen) mostrarImagenPreview(data.imagen);
      mostrarNotificacion('✅ Información obtenida');
    } else {
      mostrarNotificacion('⚠️ ' + (data.error || 'Sin info'), 'error');
    }
  } catch(e) {
    mostrarNotificacion('❌ Error al obtener preview', 'error');
  } finally {
    if (btn) { btn.innerHTML = '<i class="fas fa-magic"></i> Obtener info'; btn.disabled = false; }
  }
}

function mostrarImagenPreview(url) {
  imagenPreviewUrl = url;
  let preview = document.getElementById('grupoImagenPreview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'grupoImagenPreview';
    preview.style.cssText = 'margin-top:8px;display:flex;align-items:center;gap:8px;';
    const enlaceGroup = document.getElementById('fEnlace')?.parentElement;
    if (enlaceGroup) enlaceGroup.appendChild(preview);
  }
  preview.innerHTML = `
    <img src="${url}" alt="Foto del grupo"
      style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #25D366;"
      onerror="this.parentElement.style.display='none'">
    <span style="font-size:0.75rem;color:#25D366;font-weight:600;">
      <i class="fas fa-check-circle"></i> Foto del grupo obtenida
    </span>`;
}

// ============================================
// HINT DINÁMICO
// ============================================
const HINTS = {
  whatsapp:  'Ej: https://chat.whatsapp.com/ABC123...',
  telegram:  'Ej: https://t.me/nombre_del_grupo',
  facebook:  'Ej: https://www.facebook.com/groups/...',
  instagram: 'Ej: https://www.instagram.com/...',
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
// GESTIÓN DE CATEGORÍAS
// ============================================
async function cargarCategorias() {
  try {
    const res  = await fetch('/api/categorias');
    const data = await res.json();
    categoriasData = data.categorias || [];
    renderizarCategorias();
    actualizarSelectorCategorias();
  } catch(e) {
    mostrarNotificacion('❌ Error al cargar categorías', 'error');
  }
}

function renderizarCategorias() {
  const lista = document.getElementById('listaCategorias');
  if (!lista) return;
  if (categoriasData.length === 0) {
    lista.innerHTML = '<div style="text-align:center;color:#8ba0ae;font-size:0.8rem;">No hay categorías</div>';
    return;
  }
  lista.innerHTML = categoriasData.map((cat, i) => `
    <div class="cat-drag-item" data-id="${cat.id}" data-index="${i}"
      draggable="true"
      style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8fafc;border-radius:12px;border:1.5px solid #e5f0f5;cursor:grab;transition:all 0.2s;user-select:none;">
      <i class="fas fa-grip-lines" style="color:#bcc8d4;font-size:0.9rem;flex-shrink:0;"></i>
      <span style="font-size:1.1rem;">${cat.emoji}</span>
      <span style="flex:1;font-size:0.85rem;font-weight:600;color:#1a2c3e;">${cat.label}</span>
      <span style="font-size:0.65rem;color:#8ba0ae;background:#eef2f5;padding:2px 8px;border-radius:20px;">${cat.slug}</span>
      <button onclick="editarCategoria('${cat.id}')" style="background:#e9f9ef;color:#075E54;border:none;padding:5px 8px;border-radius:8px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-edit"></i></button>
      <button onclick="eliminarCategoria('${cat.id}', '${cat.label}')" style="background:#fde8e8;color:#dc3545;border:none;padding:5px 8px;border-radius:8px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');

  lista.querySelectorAll('.cat-drag-item').forEach(item => {
    item.addEventListener('dragstart', e => { dragSrcIndex = parseInt(item.dataset.index); item.style.opacity = '0.5'; });
    item.addEventListener('dragend',   e => { item.style.opacity = '1'; });
    item.addEventListener('dragover',  e => { e.preventDefault(); item.style.borderColor = '#25D366'; });
    item.addEventListener('dragleave', e => { item.style.borderColor = '#e5f0f5'; });
    item.addEventListener('drop', async e => {
      e.preventDefault();
      item.style.borderColor = '#e5f0f5';
      const destIndex = parseInt(item.dataset.index);
      if (dragSrcIndex === null || dragSrcIndex === destIndex) return;
      const moved = categoriasData.splice(dragSrcIndex, 1)[0];
      categoriasData.splice(destIndex, 0, moved);
      renderizarCategorias();
      try {
        await fetch('/api/categorias', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reordenar: categoriasData.map(c => ({ id: c.id })) }) });
        mostrarNotificacion('✅ Orden guardado');
      } catch(e) { mostrarNotificacion('❌ Error al guardar orden', 'error'); }
      dragSrcIndex = null;
    });
  });
}

function actualizarSelectorCategorias() {
  const selector = document.getElementById('selectorCategorias');
  if (!selector) return;
  selector.innerHTML = categoriasData.map((cat, i) => `
    <label class="opcion-categoria">
      <input type="radio" name="categoria" value="${cat.slug}" ${i === 0 ? 'checked' : ''}>
      <span>${cat.emoji} ${cat.label}</span>
    </label>
  `).join('');
}

function abrirModalCategoria() {
  document.getElementById('catEditId').value = '';
  document.getElementById('catEmoji').value  = '';
  document.getElementById('catLabel').value  = '';
  document.getElementById('catSlug').value   = '';
  document.getElementById('modalCatTitulo').textContent = 'Nueva Categoría';
  document.getElementById('modalCategoria').style.display = 'flex';
  document.getElementById('catEmoji').focus();
}

function cerrarModalCategoria() {
  document.getElementById('modalCategoria').style.display = 'none';
}

function editarCategoria(id) {
  const cat = categoriasData.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('catEditId').value = cat.id;
  document.getElementById('catEmoji').value  = cat.emoji;
  document.getElementById('catLabel').value  = cat.label;
  document.getElementById('catSlug').value   = cat.slug;
  document.getElementById('modalCatTitulo').textContent = 'Editar Categoría';
  document.getElementById('modalCategoria').style.display = 'flex';
}

async function guardarCategoria() {
  const id    = document.getElementById('catEditId').value;
  const emoji = document.getElementById('catEmoji').value.trim() || '📌';
  const label = document.getElementById('catLabel').value.trim();
  const slug  = document.getElementById('catSlug').value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!label || !slug) { mostrarNotificacion('❌ Nombre y slug son requeridos', 'error'); return; }
  try {
    let res;
    if (id) {
      res = await fetch('/api/categorias', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, datos: { emoji, label, slug } }) });
    } else {
      res = await fetch('/api/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji, label, slug }) });
    }
    const data = await res.json();
    if (res.ok && data.success !== false) {
      cerrarModalCategoria();
      await cargarCategorias();
      mostrarNotificacion('✅ Categoría guardada');
    } else {
      mostrarNotificacion('❌ ' + (data.error || 'Error al guardar'), 'error');
    }
  } catch(e) { mostrarNotificacion('❌ Error de conexión', 'error'); }
}

async function eliminarCategoria(id, nombre) {
  if (!confirm(`¿Eliminar la categoría "${nombre}"?\n\nLos grupos con esta categoría quedarán sin categoría.`)) return;
  try {
    const res = await fetch('/api/categorias', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (res.ok && data.success) { await cargarCategorias(); mostrarNotificacion('🗑️ Categoría eliminada'); }
    else { mostrarNotificacion('❌ Error al eliminar', 'error'); }
  } catch(e) { mostrarNotificacion('❌ Error de conexión', 'error'); }
}

// ============================================
// INICIALIZAR
// ============================================

// ============================================
// SECCIONES (tabs)
// ============================================
function mostrarSeccion(seccion) {
  const esGrupos = seccion === 'grupos';

  document.getElementById('seccionSolicitudes').style.display = seccion === 'solicitudes' ? 'block' : 'none';

  // Ocultar/mostrar elementos de grupos
  const elementosGrupos = [
    'panelCategorias', 'admin-actions-wrapper', 'admin-search-wrapper', 'admin-table-wrapper'
  ];

  // Tab styling
  document.getElementById('tabGrupos').style.background      = esGrupos ? '#25D366' : 'transparent';
  document.getElementById('tabGrupos').style.color           = esGrupos ? '#fff' : '#6b7f8e';
  document.getElementById('tabSolicitudes').style.background = seccion === 'solicitudes' ? '#F59E0B' : 'transparent';
  document.getElementById('tabSolicitudes').style.color      = seccion === 'solicitudes' ? '#fff' : '#6b7f8e';

  // Mostrar u ocultar secciones de grupos
  const esDestacados = seccion === 'destacados';
  const panelCats   = document.getElementById('panelCategorias');
  const adminActs   = document.querySelector('.admin-actions');
  const adminSearch = document.querySelector('.admin-search');
  const adminTable  = document.querySelector('.admin-table-container');

  [panelCats, adminActs, adminSearch, adminTable].forEach(el => {
    if (el) el.style.display = esGrupos ? '' : 'none';
  });

  document.getElementById('seccionDestacados').style.display = esDestacados ? 'block' : 'none';

  // Tab styling
  const tabDest = document.getElementById('tabDestacados');
  if (tabDest) {
    tabDest.style.background = esDestacados ? '#F59E0B' : 'transparent';
    tabDest.style.color = esDestacados ? '#fff' : '#6b7f8e';
  }

  if (seccion === 'solicitudes') cargarSolicitudes();
  if (esDestacados) cargarDestacados();
}

// ============================================
// SOLICITUDES
// ============================================
async function cargarSolicitudes() {
  const estado = document.getElementById('filtroEstadoSol')?.value || 'pendiente';
  const lista  = document.getElementById('listaSolicitudes');
  if (!lista) return;

  lista.innerHTML = '<div style="text-align:center;padding:2rem;color:#8ba0ae;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;"></i>Cargando...</div>';

  try {
    const res  = await fetch(`/api/solicitudes?estado=${estado}`);
    const data = await res.json();
    const sols = data.solicitudes || [];

    // Actualizar badge
    const badge = document.getElementById('badgeSolicitudes');
    if (badge) {
      if (estado === 'pendiente' && sols.length > 0) {
        badge.style.display = 'inline';
        badge.textContent   = sols.length;
      } else {
        badge.style.display = 'none';
      }
    }
    const statEl = document.getElementById('totalSolicitudes');
    if (statEl && estado === 'pendiente') statEl.textContent = sols.length;

    if (sols.length === 0) {
      lista.innerHTML = `<div style="text-align:center;padding:2rem;color:#8ba0ae;">
        <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
        No hay solicitudes ${estado === 'pendiente' ? 'pendientes' : estado === 'aprobado' ? 'aprobadas' : 'rechazadas'}
      </div>`;
      return;
    }

    lista.innerHTML = sols.map(s => `
      <div style="background:#fff;border-radius:16px;padding:1rem;margin-bottom:0.8rem;border:1.5px solid ${s.estado==='pendiente'?'#fde68a':s.estado==='aprobado'?'#bbf7d0':'#fecaca'};box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:0.6rem;">
          ${s.imagen ? `<img src="${s.imagen}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#1a2c3e;">${s.nombre}</div>
            ${s.descripcion ? `<div style="font-size:0.75rem;color:#6b7f8e;margin-top:2px;">${s.descripcion}</div>` : ''}
          </div>
          <span style="font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:20px;flex-shrink:0;${s.estado==='pendiente'?'background:#fef3c7;color:#92400e':s.estado==='aprobado'?'background:#dcfce7;color:#166534':'background:#fee2e2;color:#991b1b'}">
            ${s.estado==='pendiente'?'⏳ Pendiente':s.estado==='aprobado'?'✅ Aprobado':'❌ Rechazado'}
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;font-size:0.72rem;color:#6b7f8e;margin-bottom:0.7rem;">
          <span><i class="fas fa-map-marker-alt" style="color:#25D366;"></i> ${s.ubicacion}</span>
          <span><i class="fas fa-users"></i> ${s.miembros||0} miembros</span>
          ${s.contacto ? `<span><i class="fas fa-phone"></i> ${s.contacto}</span>` : ''}
          <span><i class="fas fa-clock"></i> ${new Date(s.fecha).toLocaleDateString('es-BO')}</span>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <a href="${s.link}" target="_blank" style="flex:1;text-align:center;padding:7px;background:#f0f4f8;color:#1a2c3e;border-radius:10px;text-decoration:none;font-size:0.78rem;font-weight:600;">
            <i class="fas fa-external-link-alt"></i> Ver enlace
          </a>
          ${s.estado === 'pendiente' ? `
          <button onclick="accionSolicitud('${s.id}','aprobar')"
            style="flex:1;padding:7px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;">
            <i class="fas fa-check"></i> Aprobar
          </button>
          <button onclick="accionSolicitud('${s.id}','rechazar')"
            style="flex:1;padding:7px;background:#fee2e2;color:#991b1b;border:none;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;">
            <i class="fas fa-times"></i> Rechazar
          </button>` : ''}
        </div>
      </div>
    `).join('');

  } catch(e) {
    lista.innerHTML = '<div style="text-align:center;padding:2rem;color:#e74c3c;">Error al cargar solicitudes</div>';
  }
}

async function accionSolicitud(id, accion) {
  const confirmMsg = accion === 'aprobar'
    ? '¿Aprobar este grupo? Se publicará inmediatamente.'
    : '¿Rechazar esta solicitud?';
  if (!confirm(confirmMsg)) return;

  try {
    const res  = await fetch('/api/solicitudes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      mostrarNotificacion(accion === 'aprobar' ? '✅ Grupo aprobado y publicado' : '❌ Solicitud rechazada');
      cargarSolicitudes();
      if (accion === 'aprobar') cargarGrupos();
    } else {
      mostrarNotificacion('❌ Error: ' + (data.error || ''), 'error');
    }
  } catch(e) {
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// ============================================
// GESTIÓN DE DESTACADOS PAGADOS
// ============================================
async function cargarDestacados() {
  const estado = document.getElementById('filtroEstadoDest')?.value || 'pendiente';
  const lista  = document.getElementById('listaDestacados');
  if (!lista) return;

  lista.innerHTML = '<div style="text-align:center;padding:2rem;color:#8ba0ae;"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const res  = await fetch(`/api/destacados?estado=${estado}`);
    const data = await res.json();
    const dests = data.destacados || [];

    // Badge
    const badge = document.getElementById('badgeDestacados');
    if (badge && estado === 'pendiente') {
      badge.style.display = dests.length > 0 ? 'inline' : 'none';
      badge.textContent = dests.length;
    }

    if (dests.length === 0) {
      lista.innerHTML = `<div style="text-align:center;padding:2rem;color:#8ba0ae;">
        <i class="fas fa-star" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
        No hay solicitudes ${estado}s
      </div>`;
      return;
    }

    lista.innerHTML = dests.map(d => `
      <div style="background:#fff;border-radius:16px;padding:1rem;margin-bottom:0.8rem;border:1.5px solid ${d.estado==='pendiente'?'#fde68a':d.estado==='aprobado'?'#bbf7d0':'#fecaca'};box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.6rem;">
          <div>
            <div style="font-weight:700;font-size:0.9rem;color:#1a2c3e;">${d.nombre}</div>
            <div style="font-size:0.72rem;color:#6b7f8e;margin-top:2px;">${d.link}</div>
          </div>
          <span style="font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:20px;flex-shrink:0;${d.estado==='pendiente'?'background:#fef3c7;color:#92400e':d.estado==='aprobado'?'background:#dcfce7;color:#166534':'background:#fee2e2;color:#991b1b'}">
            ${d.estado==='pendiente'?'⏳ Pendiente':d.estado==='aprobado'?'✅ Aprobado':'❌ Rechazado'}
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;font-size:0.72rem;color:#6b7f8e;margin-bottom:0.7rem;">
          <span>📦 ${d.plan} - Bs. ${d.precio}</span>
          <span>📞 ${d.contacto}</span>
          <span>📅 ${new Date(d.fecha).toLocaleDateString('es-BO')}</span>
          ${d.mensaje ? `<span>💬 ${d.mensaje}</span>` : ''}
        </div>
        ${d.estado === 'pendiente' ? `
        <div style="display:flex;gap:0.5rem;">
          <button onclick="accionDestacado('${d.id}','aprobar')"
            style="flex:1;padding:7px;background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;border:none;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;">
            <i class="fas fa-star"></i> Activar destacado
          </button>
          <button onclick="accionDestacado('${d.id}','rechazar')"
            style="flex:1;padding:7px;background:#fee2e2;color:#991b1b;border:none;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;">
            <i class="fas fa-times"></i> Rechazar
          </button>
        </div>` : ''}
      </div>
    `).join('');

  } catch(e) {
    lista.innerHTML = '<div style="text-align:center;padding:2rem;color:#e74c3c;">Error al cargar</div>';
  }
}

async function accionDestacado(id, accion) {
  const msg = accion === 'aprobar' ? '¿Activar el destacado de este grupo?' : '¿Rechazar esta solicitud?';
  if (!confirm(msg)) return;

  try {
    const res  = await fetch('/api/destacados', {
      method: 'PUT',
      headers: headersAdmin(),
      body: JSON.stringify({ id, accion })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (accion === 'aprobar' && !data.grupoEncontrado) {
        mostrarNotificacion('⚠️ Destacado aprobado pero el grupo no fue encontrado — actívalo manualmente', 'error');
      } else {
        mostrarNotificacion(accion === 'aprobar' ? '⭐ Grupo destacado activado' : '❌ Solicitud rechazada');
      }
      cargarDestacados();
      if (accion === 'aprobar') cargarGrupos();
    }
  } catch(e) {
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarGrupos();
  cargarCategorias();
  cargarSolicitudes(); // para badge inicial
  cargarDestacados(); // para badge inicial

  document.getElementById('btnNuevoGrupo')?.addEventListener('click', () => abrirModal());
  document.getElementById('closeModalBtn')?.addEventListener('click', () => cerrarModal());
  document.getElementById('cancelModalBtn')?.addEventListener('click', () => cerrarModal());
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', eliminarGrupo);
  document.getElementById('cancelConfirmBtn')?.addEventListener('click', cerrarConfirmacion);
  document.getElementById('formGrupo')?.addEventListener('submit', guardarGrupo);
  document.getElementById('searchGrupos')?.addEventListener('input', e => filtrarGruposAdmin(e.target.value));
  document.getElementById('btnNuevaCategoria')?.addEventListener('click', abrirModalCategoria);

  // ===== Dropdown custom (reemplaza <select> nativo en filtros) =====
  function initDropdownCustom(wrapperId, onSelect) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const btn = wrapper.querySelector('.dropdown-toggle');
    const label = wrapper.querySelector('.dropdown-toggle-label');
    const panel = wrapper.querySelector('.dropdown-panel');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const yaAbierto = wrapper.classList.contains('abierto');
      document.querySelectorAll('.dropdown-custom.abierto').forEach(w => w.classList.remove('abierto'));
      if (!yaAbierto) wrapper.classList.add('abierto');
    });

    panel.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('activo'));
        opt.classList.add('activo');
        label.textContent = opt.textContent.trim();
        wrapper.classList.remove('abierto');
        onSelect(opt.dataset.value);
      });
    });
  }

  initDropdownCustom('dropdownPlataforma', (valor) => {
    filtroPlataformaActual = valor;
    renderizarTabla();
  });

  initDropdownCustom('dropdownCiudad', (valor) => {
    filtroCiudadActual = valor;
    renderizarTabla();
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-custom.abierto').forEach(w => w.classList.remove('abierto'));
  });

  document.querySelectorAll('input[name="plataforma"]').forEach(radio => {
    radio.addEventListener('change', () => actualizarHintEnlace(radio.value));
  });

  // Auto-fetch al pegar o escribir enlace
  document.getElementById('fEnlace')?.addEventListener('paste', function() {
    clearTimeout(previewTimeout);
    setTimeout(() => fetchPreview(this.value.trim()), 700);
  });
  document.getElementById('fEnlace')?.addEventListener('input', function() {
    clearTimeout(previewTimeout);
    const val = this.value.trim();
    if (val.includes('whatsapp.com') || val.includes('t.me')) {
      previewTimeout = setTimeout(() => fetchPreview(val), 1000);
    }
  });
});
