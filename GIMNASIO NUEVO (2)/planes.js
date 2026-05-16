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


let planIdEditando = null;

// Hacemos las funciones disponibles globalmente para los 'onclick' del HTML
window.toggleDropdown = (btn) => {
    const d = btn.nextElementSibling;
    document.querySelectorAll('.dropdown-acciones').forEach(el => {
        if (el !== d) el.classList.remove('activo');
    });
    d.classList.toggle('activo');
};

window.eliminarPlan = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan?')) return;
    try {
        const { error } = await supabaseClient
            .from('planes')
            .update({ activo: false })
            .eq('id', id);

        if (error) throw error;
        
        // Recargar la lista después de eliminar
        location.reload(); 
    } catch (err) {
        alert("Error al eliminar: " + err.message);
    }
};

window.prepararEdicion = (id, nombre, precio, dias) => {
    planIdEditando = id;
    const modal = document.getElementById('modal-plan');
    const tituloModal = document.getElementById('modal-plan-titulo');
    tituloModal.textContent = "EDITAR PLAN";
    
    const formulario = document.querySelector('.formulario-socio');
    const inputs = formulario.querySelectorAll('input');
    const select = formulario.querySelector('select');
    
    inputs[0].value = nombre;
    inputs[2].value = precio;
    
    if (dias <= 7) select.value = 'semanal';
    else if (dias <= 30) select.value = 'mensual';
    else if (dias <= 90) select.value = 'trimestral';
    else select.value = 'anual';

    modal.classList.add('abierto');
};

document.addEventListener('DOMContentLoaded', () => {
    const modalPlan = document.getElementById('modal-plan');
    const btnNuevoPlan = document.getElementById('btn-nuevo-plan');
    const btnCerrarModal = document.getElementById('cerrar-modal-plan');
    const btnGuardarPlan = document.getElementById('btn-guardar-plan');
    const gridPlanes = document.querySelector('.grid-planes');
    const formulario = document.querySelector('.formulario-socio');

    // ... (resto de tu código anterior igual)

    async function cargarPlanes() {
        try {
            // 1. Obtener los planes
            const { data: planes, error: errorPlanes } = await supabaseClient
                .from('planes')
                .select('*')
                .eq('gimnasio_id', GIMNASIO_ID)
                .eq('activo', true)
                .order('precio', { ascending: true });

            if (errorPlanes) throw errorPlanes;

            // 2. Obtener las membresías activas para contar
            const { data: membresias, error: errorMem } = await supabaseClient
                .from('membresias_socios')
                .select('plan_id')
                .eq('gimnasio_id', GIMNASIO_ID)
                .eq('estado', 'Activa');

            if (errorMem) throw errorMem;

            // --- NUEVO: ACTUALIZAR TARJETAS DE ESTADÍSTICAS ---
            const elementosValor = document.querySelectorAll('.tarjeta-valor');
            if (elementosValor.length >= 3) {
                // A. Cantidad de Planes
                elementosValor[0].textContent = planes.length;

                // B. Cantidad de Socios Activos
                elementosValor[1].textContent = membresias.length;

                // C. Ingreso Estimado (Suma de los precios de cada socio activo)
                const preciosMap = {};
                planes.forEach(p => preciosMap[p.id] = p.precio);
                
                const ingresoTotal = membresias.reduce((total, m) => {
                    return total + (preciosMap[m.plan_id] || 0);
                }, 0);

                elementosValor[2].textContent = `$ ${ingresoTotal.toLocaleString()}`;
            }
            // ------------------------------------------------

            // 3. Crear un mapa de conteo para las cartas individuales
            const conteoPorPlan = {};
            membresias.forEach(m => {
                conteoPorPlan[m.plan_id] = (conteoPorPlan[m.plan_id] || 0) + 1;
            });

            gridPlanes.innerHTML = ''; 

            // Iconos base para variar las tarjetas
            const iconos = [
                '<path d="M18 10h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3"></path><path d="M6 10H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3"></path><path d="M6 22V2h12v20"></path>', // Pesas
                '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>', // Reloj
                '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>' // Rayo
            ];

            planes.forEach((plan, index) => {
                const card = document.createElement('div');
                const esDestacado = plan.duracion_dias === 30;
                card.className = `plan-card ${esDestacado ? 'destacado' : ''}`;
                
                const cantidadActivos = conteoPorPlan[plan.id] || 0;
                const iconPath = iconos[index % iconos.length];

                card.innerHTML = `
                    <div class="acciones-container" style="position: absolute; right: 15px; top: 15px; z-index: 10;">
                        <button class="btn-mas" onclick="toggleDropdown(this)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                            </svg>
                        </button>
                        <ul class="dropdown-acciones">
                            <li onclick="prepararEdicion('${plan.id}', '${plan.nombre}', ${plan.precio}, ${plan.duracion_dias})">Editar Plan</li>
                            <li class="accion-eliminar" onclick="eliminarPlan('${plan.id}')">Eliminar</li>
                        </ul>
                    </div>

                    <div class="plan-icon-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${iconPath}
                        </svg>
                    </div>
                    
                    <h3 class="plan-titulo-nuevo">${plan.nombre}</h3>
                    
                    <div class="plan-precio-nuevo">
                        <span class="signo">$</span>
                        <h2>${plan.precio.toLocaleString()}</h2>
                        <span class="duracion">/ ${obtenerTextoDuracion(plan.duracion_dias)}</span>
                    </div>

                    <p class="plan-descripcion">
                        Plan enfocado en brindar acceso a las instalaciones, con rutinas guiadas y equipos de última generación.
                    </p>

                    <div class="plan-features-nuevo">
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Acceso total a las áreas
                        </div>
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Duchas y vestuarios
                        </div>
                        <div class="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Soporte de entrenadores
                        </div>
                    </div>

                    <div class="plan-footer-nuevo">
                        <button class="btn-modificar-plan" onclick="prepararEdicion('${plan.id}', '${plan.nombre}', ${plan.precio}, ${plan.duracion_dias})">
                            Modificar Plan
                        </button>
                        <div class="miembros-activos-small">Miembros activos: <span>${cantidadActivos}</span></div>
                    </div>
                `;
                gridPlanes.appendChild(card);
            });
        } catch (err) {
            console.error('Error al cargar:', err);
        }
    }
// ... (resto de tu código anterior igual)

    btnGuardarPlan.addEventListener('click', async () => {
        const inputs = formulario.querySelectorAll('input');
        const select = formulario.querySelector('select');
        const nombre = inputs[0].value.trim();
        const precio = parseFloat(inputs[2].value);
        const duracionSelect = select.value;

        const mapeo = { semanal: 7, mensual: 30, trimestral: 90, anual: 365 };
        const dias = mapeo[duracionSelect];

        const datos = { gimnasio_id: GIMNASIO_ID, nombre, precio, duracion_dias: dias, activo: true };

        if (planIdEditando) {
            await supabaseClient.from('planes').update(datos).eq('id', planIdEditando);
        } else {
            await supabaseClient.from('planes').insert([datos]);
        }
        
        modalPlan.classList.remove('abierto');
        cargarPlanes();
    });

    btnNuevoPlan.addEventListener('click', () => {
        planIdEditando = null;
        document.getElementById('modal-plan-titulo').textContent = "NUEVO PLAN";
        formulario.reset();
        modalPlan.classList.add('abierto');
    });

    btnCerrarModal.addEventListener('click', () => modalPlan.classList.remove('abierto'));

    function obtenerTextoDuracion(dias) {
        if (dias <= 7) return "semana";
        if (dias <= 30) return "mes";
        if (dias <= 90) return "trimestre";
        return "año";
    }

    cargarPlanes();
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