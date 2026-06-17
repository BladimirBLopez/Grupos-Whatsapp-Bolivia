// ============================================
// CONFIGURACIÓN DE LA API - URL ABSOLUTA
// ============================================
const API_URL = 'https://grupos-whatsapp-bolivia.vercel.app/api/grupos';

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
    console.log('🔄 Cargando grupos desde:', API_URL);
    const response = await fetch(API_URL);
    
    if (response.ok) {
      const data = await response.json();
      gruposData = data.grupos || [];
      console.log(`✅ ${gruposData.length} grupos cargados`);
    } else {
      console.warn('⚠️ Fallback a JSON local');
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
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
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = gruposData.map(grupo => `
    <tr data-id="${grupo.id}" data-nombre="${grupo.nombre || ''}" data-ciudad="${grupo.ubicacion || ''}" data-descripcion="${grupo.descripcion || ''}">
      <td>${grupo.id}</td>
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
                 onchange="toggleDestacado(${grupo.id}, this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <div class="acciones-btns">
          <button class="btn-edit" onclick="abrirModal(${JSON.stringify(grupo).replace(/"/g, '&quot;')})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-delete" onclick="abrirConfirmacion(${grupo.id})">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  const searchInput = document.getElementById('searchGrupos');
  if (searchInput) {
    filtrarGruposAdmin(searchInput.value);
  }
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================
function actualizarEstadisticas() {
  const total = gruposData.length;
  const destacados = gruposData.filter(g => g.destacado).length;
  const ciudades = new Set(gruposData.map(g => g.ubicacion).filter(Boolean)).size;
  
  document.getElementById('totalGrupos').textContent = total;
  document.getElementById('totalDestacados').textContent = destacados;
  document.getElementById('totalCiudades').textContent = ciudades;
}

// ============================================
// FILTRAR GRUPOS EN ADMIN
// ============================================
function filtrarGruposAdmin(texto) {
  const rows = document.querySelectorAll('#adminGruposBody tr');
  const busqueda = texto.toLowerCase().trim();
  
  if (rows.length === 0 || rows[0].cells.length === 1) return;
  
  rows.forEach(row => {
    const id = row.dataset.id || '';
    const nombre = row.dataset.nombre || '';
    const ciudad = row.dataset.ciudad || '';
    const desc = row.dataset.descripcion || '';
    
    const match = id.includes(busqueda) ||
                  nombre.toLowerCase().includes(busqueda) || 
                  ciudad.toLowerCase().includes(busqueda) || 
                  desc.toLowerCase().includes(busqueda);
    
    row.style.display = match ? '' : 'none';
  });
}

// ============================================
// CONTROL DEL MODAL - ABRIR Y CERRAR
// ============================================
function abrirModal(grupo = null) {
  const modal = document.getElementById('modalGrupo');
  const titulo = document.getElementById('modalTitulo');
  const form = document.getElementById('formGrupo');
  
  if (!modal || !titulo || !form) {
    console.error('❌ Elementos del modal no encontrados');
    return;
  }
  
  form.reset();
  document.getElementById('editId').value = '';
  document.getElementById('fDestacado').checked = false;
  
  if (grupo) {
    titulo.innerHTML = '<i class="fas fa-edit"></i> Editar Grupo';
    document.getElementById('editId').value = grupo.id;
    document.getElementById('fNombre').value = grupo.nombre || '';
    document.getElementById('fDescripcion').value = grupo.descripcion || '';
    document.getElementById('fCiudad').value = grupo.ubicacion || 'Santa Cruz';
    document.getElementById('fEnlace').value = grupo.link || '';
    document.getElementById('fMiembros').value = grupo.miembros || 0;
    document.getElementById('fActivos').value = grupo.activos || 0;
    document.getElementById('fDestacado').checked = grupo.destacado || false;
  } else {
    titulo.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Grupo';
  }
  
  modal.style.display = 'flex';
}

function cerrarModal() {
  const modal = document.getElementById('modalGrupo');
  if (modal) modal.style.display = 'none';
}

// ============================================
// CONTROL DEL MODAL DE CONFIRMACIÓN
// ============================================
function abrirConfirmacion(id) {
  grupoAEliminar = id;
  const modal = document.getElementById('modalConfirmacion');
  const mensaje = document.getElementById('confirmacionMensaje');
  if (modal) {
    modal.style.display = 'flex';
  }
  if (mensaje) {
    const grupo = gruposData.find(g => g.id === id);
    mensaje.textContent = `¿Estás seguro de eliminar "${grupo?.nombre || 'este grupo'}"? Esta acción no se puede deshacer.`;
  }
}

function cerrarConfirmacion() {
  const modal = document.getElementById('modalConfirmacion');
  if (modal) modal.style.display = 'none';
  grupoAEliminar = null;
}

// ============================================
// GUARDAR GRUPO (CREAR O EDITAR)
// ============================================
async function guardarGrupo(e) {
  e.preventDefault();
  
  const id = document.getElementById('editId').value;
  const datos = {
    nombre: document.getElementById('fNombre').value.trim(),
    descripcion: document.getElementById('fDescripcion').value.trim(),
    ubicacion: document.getElementById('fCiudad').value,
    link: document.getElementById('fEnlace').value.trim(),
    miembros: parseInt(document.getElementById('fMiembros').value) || 0,
    activos: parseInt(document.getElementById('fActivos').value) || 0,
    destacado: document.getElementById('fDestacado').checked
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
      response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id), datos })
      });
    } else {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo: datos })
      });
    }

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        await cargarGrupos();
        cerrarModal();
        mostrarNotificacion('✅ Grupo guardado exitosamente');
      } else {
        mostrarNotificacion('❌ Error: ' + (result.error || 'Error al guardar'), 'error');
      }
    } else {
      const error = await response.json();
      mostrarNotificacion('❌ Error: ' + (error.error || 'Error al guardar'), 'error');
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
  if (grupoAEliminar === null) return;
  
  try {
    const response = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: grupoAEliminar })
    });

    if (response.ok) {
      await cargarGrupos();
      cerrarConfirmacion();
      mostrarNotificacion('🗑️ Grupo eliminado correctamente');
      grupoAEliminar = null;
    } else {
      const error = await response.json();
      mostrarNotificacion('❌ Error: ' + (error.error || 'Error al eliminar'), 'error');
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
      body: JSON.stringify({ 
        id, 
        datos: { destacado: checked } 
      })
    });

    if (response.ok) {
      await cargarGrupos();
      mostrarNotificacion(checked ? '⭐ Destacado activado' : '⭐ Destacado desactivado');
    } else {
      const error = await response.json();
      mostrarNotificacion('❌ Error: ' + (error.error || 'Error al actualizar'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// ============================================
// EXPORTAR A JSON
// ============================================
function exportarJSON() {
  if (gruposData.length === 0) {
    mostrarNotificacion('❌ No hay datos para exportar', 'error');
    return;
  }
  
  const json = JSON.stringify({ grupos: gruposData }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grupos_exportados_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarNotificacion('📥 JSON exportado correctamente');
}

// ============================================
// NOTIFICACIONES
// ============================================
function mostrarNotificacion(mensaje, tipo = 'success') {
  const notifAnterior = document.querySelector('.admin-notification');
  if (notifAnterior) notifAnterior.remove();
  
  const notif = document.createElement('div');
  notif.className = 'admin-notification';
  notif.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: ${tipo === 'error' ? '#dc3545' : '#25D366'};
    color: white;
    padding: 14px 28px;
    border-radius: 14px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    z-index: 9999;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    font-size: 0.9rem;
    max-width: 90%;
    text-align: center;
    animation: slideUp 0.3s ease;
    border: 1px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(4px);
  `;
  notif.textContent = mensaje;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.4s ease';
    setTimeout(() => notif.remove(), 400);
  }, 3500);
}

// ============================================
// INICIALIZAR EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Panel Admin iniciado');
  
  const btnNuevo = document.getElementById('btnNuevoGrupo');
  if (btnNuevo) {
    btnNuevo.addEventListener('click', function() {
      abrirModal();
    });
  }

  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', cerrarModal);
  }
  
  const cancelBtn = document.getElementById('cancelModalBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cerrarModal);
  }

  const modalGrupo = document.getElementById('modalGrupo');
  if (modalGrupo) {
    modalGrupo.addEventListener('click', function(e) {
      if (e.target === this) cerrarModal();
    });
  }

  const confirmDelete = document.getElementById('confirmDeleteBtn');
  if (confirmDelete) {
    confirmDelete.addEventListener('click', eliminarGrupo);
  }
  
  const cancelConfirm = document.getElementById('cancelConfirmBtn');
  if (cancelConfirm) {
    cancelConfirm.addEventListener('click', cerrarConfirmacion);
  }

  const searchInput = document.getElementById('searchGrupos');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filtrarGruposAdmin(this.value);
    });
  }

  const exportBtn = document.getElementById('btnExportarJSON');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportarJSON);
  }

  const cacheBtn = document.getElementById('btnLimpiarCache');
  if (cacheBtn) {
    cacheBtn.addEventListener('click', function() {
      if (confirm('¿Limpiar caché del navegador y recargar?')) {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      }
    });
  }

  const form = document.getElementById('formGrupo');
  if (form) {
    form.addEventListener('submit', guardarGrupo);
  }

  cargarGrupos();
});

// ============================================
// ESTILOS PARA ANIMACIONES
// ============================================
(function agregarEstilosAnimacion() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(30px) translateX(-50%); opacity: 0; }
      to { transform: translateY(0) translateX(-50%); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();

console.log('✅ admin.js cargado completamente');