// 1. CONFIGURACIÓN
const supabaseUrl = 'https://mhipqrjxnyykrwfjquxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaXBxcmp4bnl5a3J3ZmpxdXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzYwNzIsImV4cCI6MjA5MzkxMjA3Mn0.U8nEWlt2ARh7Sq0ZX_boxXQGgbkuopAJqLtJcegPh34';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const GIMNASIO_ID = '83e9348c-9aa8-4c64-9207-f78adc8c30fe'; 





const btnTema = document.getElementById('cambiar-tema');
const body = document.body;

// Los 3 temas en orden
const temas = ['dark', 'light', 'green'];

// Cargar tema guardado (o dark por defecto)
let temaActual = localStorage.getItem('tema') || 'dark';

// Aplicar al cargar la página
aplicarTema(temaActual);

// Clic en el botón → pasar al siguiente tema
btnTema.addEventListener('click', () => {
    const index = temas.indexOf(temaActual);
    temaActual = temas[(index + 1) % temas.length];
    aplicarTema(temaActual);
    localStorage.setItem('tema', temaActual);
});

function aplicarTema(tema) {
    // Quitar todas las clases de tema
    body.classList.remove('light', 'green');

    // Agregar la clase si no es dark (dark es el :root, no necesita clase)
    if (tema !== 'dark') {
        body.classList.add(tema);
    }
}





document.addEventListener('DOMContentLoaded', () => {
    const gridProfesores = document.querySelector('.grid-profesores');
    const modalProfe = document.getElementById('modal-profe');
    const formProfe = document.getElementById('form-profe');
    const profeIdInput = document.getElementById('profe-id');

    // 1. Cargar Profesores
    async function cargarProfesores() {
        try {
            const { data: profesores, error } = await supabaseClient
                .from('profesores')
                .select('*')
                .eq('gimnasio_id', GIMNASIO_ID)
                .eq('activo', true)
                .order('nombre_apellido', { ascending: true });

            if (error) throw error;

            gridProfesores.innerHTML = ''; 

                        profesores.forEach(profe => {
                const card = document.createElement('div');
                card.className = 'profe-card';
                card.innerHTML = `
                    <div class="profe-perfil">
                        <div class="profe-avatar">
                            <!-- La lógica: Si hay url_foto la usa, si no, usa el avatar con iniciales -->
                            <img src="${profe.url_foto ? profe.url_foto : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profe.nombre_apellido) + '&background=random'}" 
                                alt="Foto de ${profe.nombre_apellido}"
                                onerror="this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${profe.nombre_apellido}') + '&background=random'">
                        </div>
                        <h3>${profe.nombre_apellido}</h3>
                        <span class="profe-especialidad">${profe.especialidad}</span>
                    </div>                    
                    <div class="profe-info">
                        <div class="info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <p>DÍAS DE TURNO</p>
                            <strong>${profe.dias_turno}</strong>
                        </div>
                        <div class="info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <p>HORARIO</p>
                            <strong>${profe.horario}</strong>
                        </div>
                        <div class="info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <p>CONTACTO</p>
                            <strong>${profe.telefono}</strong>
                        </div>
                    </div>

                    <!-- NUEVOS BOTONES ABAJO -->
                  <div class="profe-footer-acciones">
                    <button class="btn-delete-p" onclick="eliminarProfesor('${profe.id}')">
                        Eliminar
                    </button>
                   <button class="btn-edit-p" onclick='prepararEdicionProfe(${JSON.stringify(profe)})'>
                        Modificar
                   </button>
                   
                </div>
            `;
                gridProfesores.appendChild(card);
            });

        } catch (err) {
            console.error('Error al cargar:', err);
        }
    }

    // 2. Guardar / Editar
    formProfe.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = profeIdInput.value;

        const datos = {
            gimnasio_id: GIMNASIO_ID,
            nombre_apellido: document.getElementById('profe-nombre').value,
            especialidad: document.getElementById('profe-especialidad').value,
            dias_turno: document.getElementById('profe-dias').value,
            horario: document.getElementById('profe-horario').value,
            telefono: document.getElementById('profe-contacto').value,
            url_foto: document.getElementById('profe-avatar').value || null
        };

        try {
            if (id) {
                const { error } = await supabaseClient.from('profesores').update(datos).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('profesores').insert([datos]);
                if (error) throw error;
            }
            cerrarModalProfe();
            cargarProfesores();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    // --- FUNCIONES GLOBALES ---
    window.prepararEdicionProfe = (profe) => {
        document.getElementById('modal-profe-titulo').textContent = 'EDITAR PERFIL';
        profeIdInput.value = profe.id;
        document.getElementById('profe-nombre').value = profe.nombre_apellido;
        document.getElementById('profe-especialidad').value = profe.especialidad;
        document.getElementById('profe-dias').value = profe.dias_turno;
        document.getElementById('profe-horario').value = profe.horario;
        document.getElementById('profe-contacto').value = profe.telefono;
        document.getElementById('profe-avatar').value = profe.url_foto || '';
        modalProfe.classList.add('abierto');
    };

    window.toggleDropdownProfe = (e, btn) => {
        e.stopPropagation();
        const drop = btn.nextElementSibling;
        document.querySelectorAll('.dropdown-acciones').forEach(d => d !== drop && d.classList.remove('activo'));
        drop.classList.toggle('activo');
    };

    window.eliminarProfesor = async (id) => {
        if (!confirm('¿Dar de baja?')) return;
        await supabaseClient.from('profesores').update({ activo: false }).eq('id', id);
        cargarProfesores();
    };

    function cerrarModalProfe() {
        modalProfe.classList.remove('abierto');
        formProfe.reset();
        profeIdInput.value = '';
    }

    document.getElementById('btn-nuevo-profe').onclick = () => {
        document.getElementById('modal-profe-titulo').textContent = 'NUEVO PROFESOR';
        modalProfe.classList.add('abierto');
    };
    
    document.getElementById('cerrar-modal-profe').onclick = cerrarModalProfe;
    document.getElementById('btn-cancelar-profe').onclick = cerrarModalProfe;

    cargarProfesores();
});






// --- LOGICA DEL FOOTER DEL SIDEBAR ---
async function cargarDatosUsuario() {
    const gymId = localStorage.getItem("gimnasio_id");
    
    if (!gymId) {
        window.location.href = "login.html";
        return;
    }

    // 1. Buscamos el nombre actualizado directamente en la base de datos
    const { data, error } = await supabaseClient
        .from("gimnasios")
        .select("nombre")
        .eq("id", gymId)
        .single();

    if (error) {
        console.error("Error cargando nombre:", error);
        return;
    }

    if (data) {
        const nombreGym = data.nombre; // Aquí vendrá "enzou" o el que pongas en la BD
        
        // 2. Actualizamos el texto en el sidebar
        const labelNombre = document.getElementById("sidebar-user-name");
        if (labelNombre) labelNombre.textContent = nombreGym;

        // 3. Generamos las iniciales dinámicamente
        const inicialesElemento = document.getElementById("user-initials");
        if (inicialesElemento) {
            const partes = nombreGym.trim().split(" ");
            let iniciales = "";
            
            if (partes.length > 1) {
                // Si es "Enzo Gym" -> "EG"
                iniciales = partes[0].charAt(0) + partes[1].charAt(0);
            } else {
                // Si es "enzou" -> "EN" (primeras dos letras) o solo "E"
                iniciales = partes[0].substring(0, 2);
            }
            inicialesElemento.textContent = iniciales.toUpperCase();
        }
    }
}

// Llamar a la función al cargar la página
cargarDatosUsuario();


// --- LOGICA DE CERRAR SESIÓN ---
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
        const confirmar = confirm("¿Estás seguro que deseas cerrar sesión?");
        if (confirmar) {
            // 1. Cerrar en Supabase
            await supabaseClient.auth.signOut();
            // 2. Limpiar LocalStorage
            localStorage.clear();
            // 3. Redirigir al login
            window.location.href = "index.html";
        }
    });
}