// js/admin.js
// ============================================
// CONFIGURACIÓN DE LA API
// ============================================
// En Vercel usa ruta relativa (funciona en cualquier dominio)
const API_URL = '/api/grupos';

// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let grupoAEliminar = null;

// ============================================
// CARGAR GRUPOS DESDE LA API
// ============================================
async function cargarGrupos() {
  try {
    console.log('🔄 Cargando grupos desde MongoDB...');
    const response = await fetch(API_URL);

    if (response.ok) {
      const data = await response.json();
      gruposData = data.grupos || [];
      console.log(`✅ ${gruposData.length} grupos cargados`);
    } else {
      // Fallback al JSON local si la API falla
      console.warn('⚠️ API no disponible, usando JSON local');
      const localRes = await fetch('data/grupos.json');
      const data = await localRes.json();
      gruposData = data.grupos || [];
    }

    renderizarTabla();
    actualizarEstadisticas();
  } catch (error) {
    console.error('❌ Error al cargar grupos:', error);
    mostrarNotificacion('❌ Error al cargar grupos: ' + error.message, 'error');
  }
}

// ============================================
// RENDERIZAR TABLA DE ADMIN
// ============================================
function renderizarTabla() {
  const tbody = document.getElementById('adminGruposBody');
  if (!tbody) return;

  if (gruposData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:2rem; color:#8ba0ae;">
          <i class="fas fa-inbox" style="font-size:1.5rem; display:block; margin-bottom:0.5rem;"></i>
          No hay grupos registrados
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = gruposData.map(grupo => {
    // id es el ObjectId de MongoDB (string)
    const idStr = grupo.id || grupo._id || '';
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
// ACTUALIZAR ESTADÍSTICAS
// ============================================
function actualizarEstadisticas() {
  const total = gruposData.length;
  const destacados = gruposData.filter(g => g.destacado).length;

  const elTotal = document.getElementById('statTotal');
  const elDest  = document.getElementById('statDestacados');
  if (elTotal) elTotal.textContent = total;
  if (elDest)  elDest.textContent  = destacados;
}

// ============================================
// GUARDAR GRUPO (crear o editar)
// ============================================
async function guardarGrupo(e) {
  e.preventDefault();

  const id = document.getElementById('editId').value; // ObjectId string o vacío

  const datos = {
    nombre:      document.getElementById('fNombre').value.trim(),
    descripcion: document.getElementById('fDescripcion').value.trim(),
    ubicacion:   document.getElementById('fCiudad').value,
    link:        document.getElementById('fEnlace').value.trim(),
    miembros:    parseInt(document.getElementById('fMiembros').value) || 0,
    activos:     parseInt(document.getElementById('fActivos').value) || 0,
    destacado:   document.getElementById('fDestacado').checked
  };

  if (!datos.nombre || datos.nombre.length < 3) {
    mostrarNotificacion('❌ El nombre debe tener al menos 3 caracteres', 'error');
    return;
  }
  if (!datos.link || !datos.link.includes('chat.whatsapp.com')) {
    mostrarNotificacion('❌ Ingresa un enlace válido de WhatsApp', 'error');
    return;
  }

  try {
    let response;

    if (id) {
      // Editar grupo existente
      response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, datos })
      });
    } else {
      // Crear nuevo grupo
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
    console.error('Error al guardar:', error);
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
    console.error('Error al eliminar:', error);
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
    } else {
      mostrarNotificacion('❌ Error al actualizar destacado', 'error');
    }
  } catch (error) {
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// ============================================
// ABRIR / CERRAR MODAL
// ============================================
function abrirModal(grupo = null) {
  const modal = document.getElementById('modalGrupo');
  const form  = document.getElementById('formGrupo');
  const title = document.getElementById('modalTitle');

  form.reset();
  document.getElementById('editId').value = '';

  if (grupo) {
    title.textContent = '✏️ Editar Grupo';
    document.getElementById('editId').value      = grupo.id || grupo._id || '';
    document.getElementById('fNombre').value      = grupo.nombre      || '';
    document.getElementById('fDescripcion').value = grupo.descripcion || '';
    document.getElementById('fCiudad').value      = grupo.ubicacion   || '';
    document.getElementById('fEnlace').value      = grupo.link        || '';
    document.getElementById('fMiembros').value    = grupo.miembros    || 0;
    document.getElementById('fActivos').value     = grupo.activos     || 0;
    document.getElementById('fDestacado').checked = Boolean(grupo.destacado);
  } else {
    title.textContent = '➕ Agregar Grupo';
  }

  modal.style.display = 'flex';
  form.addEventListener('submit', guardarGrupo, { once: true });
}

function cerrarModal() {
  const modal = document.getElementById('modalGrupo');
  if (modal) modal.style.display = 'none';
}

function abrirConfirmacion(id) {
  grupoAEliminar = id;
  const modal = document.getElementById('modalConfirmar');
  if (modal) modal.style.display = 'flex';
}

function cerrarConfirmacion() {
  grupoAEliminar = null;
  const modal = document.getElementById('modalConfirmar');
  if (modal) modal.style.display = 'none';
}

// ============================================
// FILTRAR EN TABLA
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
  const el = document.getElementById('notificacion') || crearNotificacion();
  el.textContent = mensaje;
  el.className = 'notificacion ' + tipo;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function crearNotificacion() {
  const el = document.createElement('div');
  el.id = 'notificacion';
  el.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;z-index:9999;font-weight:600;display:none;';
  document.body.appendChild(el);
  return el;
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  cargarGrupos();

  // Buscar en tabla
  const searchInput = document.getElementById('searchGrupos');
  if (searchInput) {
    searchInput.addEventListener('input', e => filtrarGruposAdmin(e.target.value));
  }

  // Botón agregar
  const btnAgregar = document.getElementById('btnAgregarGrupo');
  if (btnAgregar) btnAgregar.addEventListener('click', () => abrirModal());

  // Botón confirmar eliminar
  const btnConfirmar = document.getElementById('btnConfirmarEliminar');
  if (btnConfirmar) btnConfirmar.addEventListener('click', eliminarGrupo);

  // Cerrar modales con X
  document.querySelectorAll('[data-cerrar-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      cerrarModal();
      cerrarConfirmacion();
    });
  });
});
