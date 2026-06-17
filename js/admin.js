// js/admin.js - Reemplaza guardarGrupo()

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

  // Validaciones
  if (!datos.nombre || datos.nombre.length < 3) {
    alert('El nombre debe tener al menos 3 caracteres');
    return;
  }
  if (!datos.link || !datos.link.includes('chat.whatsapp.com')) {
    alert('Ingresa un enlace válido de WhatsApp');
    return;
  }

  try {
    let response;
    
    if (id) {
      // Editar grupo existente
      response = await fetch('/api/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id), datos })
      });
    } else {
      // Crear nuevo grupo
      response = await fetch('/api/grupos', {
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

// Reemplazar eliminarGrupo()

async function eliminarGrupo() {
  if (grupoAEliminar === null) return;
  
  try {
    const response = await fetch('/api/grupos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: grupoAEliminar })
    });

    if (response.ok) {
      await cargarGrupos();
      cerrarConfirmacion();
      mostrarNotificacion('🗑️ Grupo eliminado');
      grupoAEliminar = null;
    } else {
      mostrarNotificacion('❌ Error al eliminar', 'error');
    }
  } catch (error) {
    console.error('Error al eliminar:', error);
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}

// Reemplazar toggleDestacado()

async function toggleDestacado(id, checked) {
  try {
    const response = await fetch('/api/grupos', {
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
      mostrarNotificacion('❌ Error al actualizar', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('❌ Error de conexión', 'error');
  }
}