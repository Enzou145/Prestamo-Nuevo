// 1. CONFIGURACIÓN
const supabaseUrl = 'https://mhipqrjxnyykrwfjquxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaXBxcmp4bnl5a3J3ZmpxdXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzYwNzIsImV4cCI6MjA5MzkxMjA3Mn0.U8nEWlt2ARh7Sq0ZX_boxXQGgbkuopAJqLtJcegPh34';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const GIMNASIO_ID = '83e9348c-9aa8-4c64-9207-f78adc8c30fe'; 






//BUSQUEDA
let filtroEstado = 'todos';
let filtroPlan = 'todos';
let busqueda = '';

let socioIdActual = null; // Variable global para controlar el estado
 
// --- LÓGICA DE DROPDOWNS Y FILTROS ---
// Toggle de Dropdowns
document.querySelectorAll('.filtro-container > button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentDropdown = btn.nextElementSibling;
        document.querySelectorAll('.dropdown').forEach(d => {
            if (d !== currentDropdown) d.classList.remove('abierto');
        });
        currentDropdown.classList.toggle('abierto');
    });
});

// Cerrar dropdowns al hacer clic fuera
window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('abierto'));
});

// Eventos de selección en Dropdowns
document.querySelectorAll('.dropdown li').forEach(item => {
    item.addEventListener('click', function () {

        const text = this.textContent;
        const container = this.closest('.filtro-container');
        const btnSpan = container.querySelector('button span');

        btnSpan.textContent = text;

        // FILTRO ESTADO
        if (container.querySelector('.filtro-estado')) {

            filtroEstado = this.getAttribute('data-estado');

        }

        // FILTRO PLAN
        else {

            filtroPlan = this.getAttribute('data-plan');

        }

        listarSocios();

    });
});

// Buscador con delay (debounce)
const inputBuscador = document.getElementById('buscador');
let timerBusqueda;
if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        clearTimeout(timerBusqueda);
        busqueda = e.target.value.toLowerCase().trim();
        timerBusqueda = setTimeout(() => {
            listarSocios();
        }, 300);
    });
}



// Modal Nuevo Socio
const btnNuevoSocio = document.getElementById('nuevo-socio');
const modalNuevoSocio = document.getElementById('modal-nuevo-socio');
const btnCerrarModalNuevo = document.getElementById('cerrar-modal-socio');

// ⬇️ AGREGAR ESTAS DOS LÍNEAS (con null si los elementos no existen aún)
const btnCerrarModalEditar = document.getElementById('cerrar-modal-editar');
const btnCerrarModalVer = document.getElementById('cerrar-modal-ver');
const modalEditarSocio = document.getElementById('modal-editar-socio');
const modalVerSocio = document.getElementById('modal-ver-socio');

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



// Función general para cerrar modals
function cerrarModals() {
    if(modalNuevoSocio) modalNuevoSocio.classList.remove('abierto');
    if(modalEditarSocio) modalEditarSocio.classList.remove('abierto');
    if(modalVerSocio) modalVerSocio.classList.remove('abierto');
}



// --- LOGIC PARA MODAL NUEVO SOCIO ---
if (btnNuevoSocio && modalNuevoSocio && btnCerrarModalNuevo) {
    btnNuevoSocio.addEventListener('click', () => {
        abrirModalNuevoSocio();
    });

    btnCerrarModalNuevo.addEventListener('click', (e) => { 
        e.preventDefault(); 
        cerrarModalNuevoSocio(); 
    });
}

// Cerrar haciendo clic afuera (Simplificado)
window.addEventListener('click', (e) => {
    document.querySelectorAll('.dropdown-acciones').forEach(d => d.classList.remove('activo'));
    if (e.target === modalNuevoSocio) cerrarModalNuevoSocio();
    if (e.target === modalEditarSocio) cerrarModals();
    if (e.target === modalVerSocio) cerrarModals();
    
    const modalRenovar = document.getElementById('modal-renovar-cuota');
    if (modalRenovar && e.target === modalRenovar) {
        modalRenovar.classList.remove('abierto');
    }
});

// --- 1. CARGAR PLANES DINÁMICAMENTE ---
async function cargarPlanes() {
    try {
        const gymId = localStorage.getItem("gimnasio_id") || GIMNASIO_ID;
        const { data: planes, error } = await supabaseClient
            .from("planes")
            .select("id, nombre, precio, duracion_dias")
            .eq("gimnasio_id", gymId)
            .eq("activo", true)
            .order("precio", { ascending: true });

        if (error) throw error;

        const selectPlan = document.getElementById("select-plan-nuevo");
        if (!selectPlan) return;

        selectPlan.innerHTML = `<option value="" disabled selected>Seleccionar...</option>`;

        planes.forEach((plan) => {
            const option = document.createElement("option");
            option.value = plan.id;
            const duracionTexto = plan.duracion_dias ? `(${plan.duracion_dias} días)` : '';
            option.textContent = `${plan.nombre} ${duracionTexto} — $${plan.precio}`;
            // Guardamos los datos para usarlos al seleccionar
            option.dataset.precio = plan.precio;
            option.dataset.duracionDias = plan.duracion_dias;
            selectPlan.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando planes:", error);
    }
}

// --- 2. ACTUALIZAR PRECIO CUANDO SE ELIGE UN PLAN ---
const selectPlanNuevo = document.getElementById("select-plan-nuevo");
if (selectPlanNuevo) {
    selectPlanNuevo.addEventListener("change", function () {
        const opcionSeleccionada = this.options[this.selectedIndex];
        const precio = opcionSeleccionada.dataset.precio || 0;

        // Actualizar el texto visual (el que dice $ 0)
        const txtPrecio = document.getElementById("precio-total-nuevo");
        if (txtPrecio) txtPrecio.textContent = `$ ${Number(precio).toLocaleString("es-AR")}`;

        // Actualizar el input oculto o de monto
        const inputMonto = document.getElementById("input-monto-nuevo");
        if (inputMonto) inputMonto.value = precio;
    });
}

// --- 3. FUNCIONES DE APERTURA Y CIERRE ---
function abrirModalNuevoSocio() {
    cargarPlanes(); // Importante: Carga los planes antes de mostrar el modal
    modalNuevoSocio.classList.add('abierto');
}

function cerrarModalNuevoSocio() {
    modalNuevoSocio.classList.remove('abierto');
    const form = document.getElementById("form-nuevo-socio");
    if (form) form.reset();
    
    const txtPrecio = document.getElementById("precio-total-nuevo");
    if (txtPrecio) txtPrecio.textContent = "$ 0";
}

// --- 4. GUARDAR SOCIO ---
const formNuevoSocio = document.getElementById("form-nuevo-socio");
if (formNuevoSocio) {
    formNuevoSocio.addEventListener("submit", async function (e) {
        e.preventDefault();

        const btnGuardar = document.getElementById("btn-guardar-socio");
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";

        try {
            const nombre = document.getElementById("input-nombre").value.trim();
            const apellido = document.getElementById("input-apellido").value.trim();
            const email = document.getElementById("input-email")?.value.trim() || null;
            const planId = document.getElementById("select-plan-nuevo").value;
            const monto = parseFloat(document.getElementById("input-monto-nuevo").value) || 0;
            const rawMetodo = document.getElementById("select-metodo-pago")?.value || 'Efectivo';
            const metodoPago = rawMetodo.charAt(0).toUpperCase() + rawMetodo.slice(1).toLowerCase();
            
            const hoy = new Date();
            const inputFecha = document.getElementById("input-fecha-ingreso").value;
            const fechaIngreso = inputFecha || hoy.toISOString().split('T')[0];

            const gymId = localStorage.getItem("gimnasio_id") || GIMNASIO_ID;

            if (socioIdActual) {
                // ==========================================
                // MODO EDICIÓN (UPDATE)
                // ==========================================
                const { error: errorSocio } = await supabaseClient
                    .from("socios")
                    .update({ nombre, apellido, email, fecha_ingreso: fechaIngreso })
                    .eq('id', socioIdActual);

                if (errorSocio) throw errorSocio;

                const { error: errorMem } = await supabaseClient
                    .from("membresias_socios")
                    .update({ plan_id: planId })
                    .eq('socio_id', socioIdActual);

                if (errorMem) throw errorMem;

                alert("✅ Socio actualizado correctamente.");
            } 
            else {
                // ==========================================
                // MODO CREACIÓN (INSERT)
                // ==========================================
                
                // 1. Insertar Socio
                const { data: socio, error: errorSocio } = await supabaseClient
                    .from("socios")
                    .insert({ 
                        gimnasio_id: gymId, 
                        nombre, 
                        apellido, 
                        email,
                        fecha_ingreso: fechaIngreso, 
                        activo: true 
                    })
                    .select().single();

                if (errorSocio) throw errorSocio;

                // 2. Calcular vencimiento dinamico basado en el plan
                const opcionPlan = selectPlanNuevo.options[selectPlanNuevo.selectedIndex];
                const duracionDias = parseInt(opcionPlan.dataset.duracionDias) || 30;
                
                const [anio, mes, dia] = fechaIngreso.split("-").map(Number);
                const vencimientoObj = new Date(anio, mes - 1, dia + duracionDias);
                const fechaVencimientoStr = vencimientoObj.toISOString().split('T')[0];

                // 3. Crear Membresía
                const { error: errorMem } = await supabaseClient
                    .from("membresias_socios")
                    .insert({
                        socio_id: socio.id,
                        gimnasio_id: gymId,
                        plan_id: planId,
                        fecha_inicio: fechaIngreso,
                        fecha_vencimiento: fechaVencimientoStr,
                        estado: 'Activa'
                    });

                if (errorMem) throw errorMem;

                // 4. Registrar Pago
                const { error: errorPago } = await supabaseClient
                    .from("pagos")
                    .insert({
                        socio_id: socio.id,
                        gimnasio_id: gymId,
                        monto: monto,
                        fecha_pago: hoy.toISOString(),
                        metodo_pago: metodoPago
                    });

                if (errorPago) throw errorPago;

                alert("✅ Socio creado correctamente.");
            }

            cerrarModalNuevoSocio();
            listarSocios();

        } catch (err) {
            console.error(err);
            alert("❌ Error: " + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = socioIdActual ? "Guardar Cambios" : "Guardar Socio";
        }
    });
}














function actualizarTarjetasEstadisticas(socios) {
    const hoy = new Date();
    const proximoVencer = new Date();
    proximoVencer.setDate(hoy.getDate() + 7);

    let total = socios.length;
    let activos = 0;
    let vencidos = 0;
    let porVencer = 0;

    socios.forEach(socio => {
        const membresia = socio.membresias_socios?.[0];
        if (!membresia || !membresia.fecha_vencimiento) {
            vencidos++; // Si no tiene membresía, lo contamos como vencido/inactivo
            return;
        }

        const venc = new Date(membresia.fecha_vencimiento);

        if (venc < hoy) {
            vencidos++;
        } else if (venc >= hoy && venc <= proximoVencer) {
            porVencer++;
            activos++; // Los "por vencer" técnicamente siguen activos
        } else {
            activos++;
        }
    });

    // Inyectar valores en el HTML
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-vencidos').textContent = vencidos;
    document.getElementById('stat-por-vencer').textContent = porVencer;
}














// --- CARGAR LISTADO DE SOCIOS ---
async function listarSocios() {
    const contenedor = document.getElementById('contenedor-socios-real');
    if (!contenedor) return;

    try {
        // 1. Obtenemos los datos base
        let { data: socios, error } = await supabaseClient
            .from('socios')
            .select(`
                id, nombre, apellido, email,
                membresias_socios (
                    estado,
                    fecha_vencimiento,
                    planes ( nombre, precio, duracion_dias )
                )
            `)
            .eq('gimnasio_id', GIMNASIO_ID);

        if (error) throw error;

        actualizarTarjetasEstadisticas(socios); 

        const hoy = new Date();
        const sieteDiasDespues = new Date();
        sieteDiasDespues.setDate(hoy.getDate() + 7);

        // 2. Aplicamos filtros en JS
        let sociosFiltrados = socios.filter(socio => {
            const membresia = socio.membresias_socios?.[0];
            const plan = membresia?.planes;
            const venc = membresia ? new Date(membresia.fecha_vencimiento) : null;
            
            // Filtro de Búsqueda (Nombre o Apellido)
            const nombreCompleto = `${socio.nombre || ''} ${socio.apellido || ''}`.toLowerCase();
            const cumpleBusqueda = busqueda === '' || nombreCompleto.includes(busqueda);
            
            // Filtro de Plan (por duración)
            let cumplePlan = true;
            if (filtroPlan !== 'todos') {
                if (!plan) {
                    cumplePlan = false;
                } else {
                    const dias = plan.duracion_dias || 30; // 30 por defecto
                    if (filtroPlan === 'semanal') cumplePlan = dias <= 7;
                    else if (filtroPlan === 'mensual') cumplePlan = dias > 7 && dias <= 31;
                    else if (filtroPlan === 'trimestral') cumplePlan = dias > 31 && dias <= 90;
                    else if (filtroPlan === 'anual') cumplePlan = dias > 90;
                }
            }

            // Filtro de Estado/Vencimiento
            let cumpleEstado = true;
            if (filtroEstado !== 'todos') {
                if (filtroEstado === 'activos') {
                    cumpleEstado = venc && venc > hoy;
                } else if (filtroEstado === 'vencidos') {
                    cumpleEstado = !venc || venc < hoy;
                } else if (filtroEstado === 'por-vencer') {
                    cumpleEstado = venc && venc >= hoy && venc <= sieteDiasDespues;
                }
            }

            return cumpleBusqueda && cumplePlan && cumpleEstado;
        });

        // 3. Renderizar
        contenedor.innerHTML = '';

        if (sociosFiltrados.length === 0) {
            contenedor.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-gray);">No se encontraron socios con esos filtros.</p>';
            return;
        }

        sociosFiltrados.forEach(socio => {
            const membresia = socio.membresias_socios?.[0];
            const plan = membresia?.planes;
            const venc = membresia ? new Date(membresia.fecha_vencimiento) : null;
            const iniciales = `${socio.nombre[0]}${socio.apellido[0]}`.toUpperCase();
            
            let claseEstado = 'vencido';
            let textoEstado = 'VENCIDO';

            if (venc) {
                if (venc > sieteDiasDespues) {
                    claseEstado = 'activo';
                    textoEstado = 'ACTIVO';
                } else if (venc > hoy) {
                    claseEstado = 'por-vencer'; // Asegúrate de tener este estilo en CSS
                    textoEstado = 'POR VENCER';
                }
            }

            const divSocio = document.createElement('div');
            divSocio.className = 'cliente';
            divSocio.innerHTML = `
                <div class="socio-info">
                    <div class="inicial">${iniciales}</div>
                    <div class="nombre-correo">
                        <h1>${socio.nombre} ${socio.apellido}</h1>
                        <p>${socio.email || 'sin@correo.com'}</p>
                    </div>
                </div>
                <div class="plan-info">
                    <h1>${plan?.nombre || 'Sin Plan'}</h1>
                    <p>Membresía</p>
                </div>
                <div class="vencimiento-info">
                    <h1>${venc ? venc.toLocaleDateString('es-AR') : '---'}</h1>
                    <p>Vencimiento</p>
                </div>
                <div>
                    <div class="estado ${claseEstado}">${textoEstado}</div>
                </div>
                <div class="cuota-info">
                    <h1>$ ${plan?.precio || 0}</h1>
                </div>
                <div class="acciones-lista">
                    <button class="btn-renovar-inline" onclick="abrirModalRenovar('${socio.id}', '${plan?.id || ''}')" title="Renovar Cuota">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Renovar
                    </button>
                    <button class="btn-accion-icon" onclick="verDetalles('${socio.id}')" title="Ver Detalles">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button class="btn-accion-icon" onclick="abrirModalSocio('${socio.id}')" title="Modificar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-accion-icon eliminar" onclick="eliminarSocio('${socio.id}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
            contenedor.appendChild(divSocio);
        });

    } catch (err) {
        console.error("Error filtrando:", err);
    }
}

// Funciones auxiliares para los botones de la tabla
window.toggleAcciones = (btn, e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-acciones').forEach(d => d.classList.remove('activo'));
    btn.nextElementSibling.classList.toggle('activo');
};

window.eliminarSocio = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este socio?')) return;
    const { error } = await supabaseClient.from('socios').delete().eq('id', id);
    if (error) alert("Error al eliminar");
    else listarSocios();
};




window.verDetalles = async (id) => {
    // Agrega esto al principio de la función verDetalles
    document.querySelectorAll('.dropdown-acciones').forEach(d => d.classList.remove('activo'));
    const modal = document.getElementById('modal-ver-socio');
    const cuerpoModal = modal.querySelector('.detalles-body');

    try {
        // 1. Obtener los datos completos del socio desde Supabase
        const { data: socio, error } = await supabaseClient
            .from('socios')
            .select(`
                *,
                membresias_socios (
                    fecha_inicio,
                    fecha_vencimiento,
                    planes (
                        nombre,
                        precio
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // 2. Procesar datos (Fechas, Iniciales, Estado)
        const membresia = socio.membresias_socios?.[0];
        const plan = membresia?.planes;
        const hoy = new Date();
        const venc = membresia ? new Date(membresia.fecha_vencimiento) : null;
        const iniciales = `${socio.nombre[0]}${socio.apellido[0]}`.toUpperCase();

        // Determinar estado para el badge del modal
        let claseEstado = 'vencido';
        let textoEstado = 'VENCIDO';
        if (venc && venc > hoy) {
            claseEstado = 'activo';
            textoEstado = 'ACTIVO';
        }

        // 3. Inyectar el contenido dinámicamente en el HTML del modal
        cuerpoModal.innerHTML = `
            <div class="detalles-header">
                <div class="inicial-grande">${iniciales}</div>
                <div>
                    <h3>${socio.nombre} ${socio.apellido}</h3>
                    <p class="estado-badge ${claseEstado}">${textoEstado}</p>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <span>Email</span>
                    <p>${socio.email || 'No asignado'}</p>
                </div>
                <div class="info-item">
                    <span>Teléfono</span>
                    <p>${socio.telefono || 'No asignado'}</p>
                </div>
                <div class="info-item">
                    <span>Fecha de Nac.</span>
                    <p>${socio.fecha_nacimiento ? new Date(socio.fecha_nacimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '---'}</p>
                </div>
                <div class="info-item">
                    <span>Género</span>
                    <p>${socio.genero || '---'}</p>
                </div>
            </div>

            <div class="separador">
                <p>MEMBRESÍA</p>
                <div class="linea"></div>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <span>Plan Actual</span>
                    <p>${plan?.nombre || 'Sin Plan'}</p>
                </div>
                <div class="info-item">
                    <span>Cuota</span>
                    <p>$ ${plan?.precio || 0}</p>
                </div>
                <div class="info-item">
                    <span>Fecha Ingreso</span>
                    <p>${socio.fecha_ingreso ? new Date(socio.fecha_ingreso).toLocaleDateString('es-AR') : '---'}</p>
                </div>
                <div class="info-item">
                    <span>Vencimiento</span>
                    <p class="${venc < hoy ? 'texto-vencido' : ''}">${venc ? venc.toLocaleDateString('es-AR') : '---'}</p>
                </div>
            </div>
        `;

        // 4. Mostrar el modal
        modal.classList.add('abierto');

    } catch (err) {
        console.error('Error cargando detalles:', err);
        alert('No se pudieron cargar los detalles del socio');
    }
};



// Función para abrir el modal (sirve para ambos casos)
window.abrirModalSocio = async (id = null) => {
    socioIdActual = id;
    const modal = document.getElementById('modal-nuevo-socio');
    const titulo = modal.querySelector('h2');
    const btnGuardar = document.getElementById('btn-guardar-socio');
    const formulario = document.getElementById('form-nuevo-socio');
    formulario.reset(); 

    formulario.reset(); 
    // Resetear el texto del precio visual
    if(document.getElementById('precio-total-nuevo')) {
        document.getElementById('precio-total-nuevo').textContent = "$ 0";
    }

    // Cargamos los planes primero para que el select tenga las opciones
    await cargarPlanes();

    if (socioIdActual) {
        titulo.textContent = "EDITAR SOCIO";
        btnGuardar.textContent = "Guardar Cambios";

        try {
            const { data: socio, error } = await supabaseClient
                .from('socios')
                .select('*, membresias_socios(*, planes(*))')
                .eq('id', socioIdActual)
                .single();

            if (error) throw error;

            const membresia = socio.membresias_socios?.[0];

            // LLENAR CAMPOS CON LOS IDs CORRECTOS
            document.getElementById('input-nombre').value = socio.nombre;
            document.getElementById('input-apellido').value = socio.apellido;
            
            // Si tienes estos campos en tu HTML, se llenarán:
            if(document.getElementById('input-email')) document.getElementById('input-email').value = socio.email || '';
            if(document.getElementById('input-fecha-ingreso')) document.getElementById('input-fecha-ingreso').value = socio.fecha_ingreso || '';

            // Llenar datos de membresía
            if (membresia) {
                document.getElementById('select-plan-nuevo').value = membresia.plan_id;
                document.getElementById('input-monto-nuevo').value = membresia.monto_pago || membresia.planes?.precio || 0;
                document.getElementById('precio-total-nuevo').textContent = `$ ${membresia.planes?.precio || 0}`;
            }

        } catch (err) {
            console.error("Error al cargar datos:", err);
        }
    } else {
        titulo.textContent = "NUEVO SOCIO";
        btnGuardar.textContent = "Guardar Socio";
    }

    modal.classList.add('abierto');
};














function actualizarTarjetasEstadisticas(socios) {
    const hoy = new Date();
    const proximoVencer = new Date();
    proximoVencer.setDate(hoy.getDate() + 7);

    let activos = 0;
    let vencidos = 0;
    let porVencer = 0;

    socios.forEach(socio => {
        const membresia = socio.membresias_socios?.[0];
        const venc = membresia ? new Date(membresia.fecha_vencimiento) : null;

        if (!venc || venc < hoy) {
            vencidos++;
        } else if (venc >= hoy && venc <= proximoVencer) {
            porVencer++;
            activos++; // Siguen activos aunque falte poco para vencer
        } else {
            activos++;
        }
    });

    // Actualizamos el HTML (Asegúrate de tener estos IDs en tu HTML)
    if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = socios.length;
    if(document.getElementById('stat-activos')) document.getElementById('stat-activos').textContent = activos;
    if(document.getElementById('stat-vencidos')) document.getElementById('stat-vencidos').textContent = vencidos;
    if(document.getElementById('stat-por-vencer')) document.getElementById('stat-por-vencer').textContent = porVencer;
}

// --- LOGICA RENOVAR CUOTA ---
let socioParaRenovarId = null;

window.abrirModalRenovar = async (idSocio, planIdActual) => {
    socioParaRenovarId = idSocio;
    document.querySelectorAll('.dropdown-acciones').forEach(d => d.classList.remove('activo'));
    
    const modalRenovar = document.getElementById('modal-renovar-cuota');
    if (!modalRenovar) return;

    // Reset textos
    document.getElementById('renovar-nombre').textContent = "Cargando...";
    document.getElementById('renovar-inicial').textContent = "--";
    document.getElementById('renovar-badge').textContent = "--";
    document.getElementById('renovar-badge').className = "estado-badge";
    document.getElementById('renovar-vencimiento-actual').textContent = "--/--/----";
    document.getElementById('renovar-vencimiento-nuevo').textContent = "--/--/----";

    const select = document.getElementById('select-plan-renovar');
    
    try {
        // Cargar datos del socio y de los planes
        const [socioRes, planesRes] = await Promise.all([
            supabaseClient.from('socios').select('*, membresias_socios(*, planes(nombre, precio, duracion_dias))').eq('id', idSocio).single(),
            supabaseClient.from("planes").select("id, nombre, precio, duracion_dias").eq("gimnasio_id", GIMNASIO_ID).eq("activo", true)
        ]);
        
        const socio = socioRes.data;
        const planes = planesRes.data;

        if (socio) {
            // Iniciales y Nombre
            const iniciales = `${socio.nombre[0] || ''}${socio.apellido[0] || ''}`.toUpperCase();
            document.getElementById('renovar-nombre').textContent = `${socio.nombre} ${socio.apellido}`;
            document.getElementById('renovar-inicial').textContent = iniciales;

            // Membresia Actual
            const membresia = socio.membresias_socios?.[0];
            const hoy = new Date();
            let venc = null;
            let claseEstado = 'vencido';
            let textoEstado = 'VENCIDO';
            
            if (membresia && membresia.fecha_vencimiento) {
                // Parseamos respetando zona local para evitar desfases
                const parts = membresia.fecha_vencimiento.split('-');
                venc = new Date(parts[0], parts[1]-1, parts[2]); 
                if (venc > hoy) {
                    claseEstado = 'activo';
                    textoEstado = 'ACTIVO';
                }
                document.getElementById('renovar-vencimiento-actual').textContent = venc.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } else {
                document.getElementById('renovar-vencimiento-actual').textContent = 'Sin Membresía';
            }

            const badge = document.getElementById('renovar-badge');
            badge.className = `estado-badge ${claseEstado}`;
            badge.textContent = textoEstado;

            // Cargar planes en el select
            select.innerHTML = '<option value="" disabled selected>Seleccione un plan</option>';
            planes.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.nombre} - $${p.precio}`;
                opt.dataset.precio = p.precio;
                opt.dataset.dias = p.duracion_dias || 30; // 30 por defecto
                select.appendChild(opt);
            });

            // Pre-seleccionar
            if (planIdActual) {
                select.value = planIdActual;
            } else if (membresia && membresia.plan_id) {
                select.value = membresia.plan_id;
            }

            // Calcular nuevo vencimiento inicial
            actualizarMontoYVencimientoRenovar(venc);
        }
    } catch(err) { 
        console.error("Error cargando planes/socio para renovar:", err); 
    }

    modalRenovar.classList.add('abierto');
};

function actualizarMontoYVencimientoRenovar(vencimientoActual) {
    const select = document.getElementById('select-plan-renovar');
    if(select.selectedIndex === -1) return;
    const op = select.options[select.selectedIndex];
    
    if (op && op.value) {
        document.getElementById('input-monto-renovar').value = op.dataset.precio || 0;
        
        const diasAgregados = parseInt(op.dataset.dias) || 30;
        const hoy = new Date();
        let fechaBase = new Date(hoy);
        
        if (vencimientoActual && vencimientoActual > hoy) {
            fechaBase = new Date(vencimientoActual);
        }
        
        fechaBase.setDate(fechaBase.getDate() + diasAgregados);
        document.getElementById('renovar-vencimiento-nuevo').textContent = fechaBase.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

const selectPlanRenovar = document.getElementById('select-plan-renovar');
if (selectPlanRenovar) {
    selectPlanRenovar.addEventListener('change', function() {
        const vencText = document.getElementById('renovar-vencimiento-actual').textContent;
        let vencActual = null;
        if (vencText && vencText !== '--/--/----' && vencText !== 'Sin Membresía') {
            const parts = vencText.split('/');
            if (parts.length === 3) {
                vencActual = new Date(parts[2], parts[1]-1, parts[0]);
            }
        }
        actualizarMontoYVencimientoRenovar(vencActual);
    });
}

const btnCerrarRenovar = document.getElementById('cerrar-modal-renovar');
if (btnCerrarRenovar) {
    btnCerrarRenovar.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('modal-renovar-cuota').classList.remove('abierto');
    });
}

const formRenovar = document.getElementById('form-renovar-cuota');
if (formRenovar) {
    formRenovar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnGuardar = document.getElementById('btn-guardar-renovacion');
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        try {
            const planId = document.getElementById('select-plan-renovar').value;
            const monto = parseFloat(document.getElementById('input-monto-renovar').value);
            const metodoRaw = document.getElementById('select-metodo-renovar').value;
            const metodoPago = metodoRaw.charAt(0).toUpperCase() + metodoRaw.slice(1).toLowerCase();

            // Calcular vencimiento
            const select = document.getElementById('select-plan-renovar');
            const op = select.options[select.selectedIndex];
            const diasAgregados = parseInt(op.dataset.dias) || 30;
            
            const vencText = document.getElementById('renovar-vencimiento-actual').textContent;
            let vencActual = null;
            if (vencText && vencText !== '--/--/----' && vencText !== 'Sin Membresía') {
                const parts = vencText.split('/');
                if (parts.length === 3) vencActual = new Date(parts[2], parts[1]-1, parts[0]);
            }

            const hoy = new Date();
            let fechaBase = new Date(hoy);
            if (vencActual && vencActual > hoy) {
                fechaBase = new Date(vencActual);
            }
            fechaBase.setDate(fechaBase.getDate() + diasAgregados);
            
            const fechaVencimiento = fechaBase; 

            // Actualizar Membresía (Si ya existe, la actualiza con el eq, sino insertarla si se requiere, pero vamos a probar update o upsert)
            // Ya que el socio TIENE membresia o deberia, pero si no la tiene 'update' podria no hacer nada.
            // Para asegurar, busquemos si tiene:
            const { data: memExistente } = await supabaseClient.from('membresias_socios').select('id').eq('socio_id', socioParaRenovarId).maybeSingle();

            if (memExistente) {
                const { error: errMem } = await supabaseClient
                    .from('membresias_socios')
                    .update({
                        plan_id: planId,
                        fecha_inicio: hoy.toISOString().split('T')[0],
                        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
                        estado: 'Activa'
                    })
                    .eq('socio_id', socioParaRenovarId);
                if (errMem) throw errMem;
            } else {
                const { error: errMem } = await supabaseClient
                    .from('membresias_socios')
                    .insert({
                        socio_id: socioParaRenovarId,
                        gimnasio_id: GIMNASIO_ID,
                        plan_id: planId,
                        fecha_inicio: hoy.toISOString().split('T')[0],
                        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
                        estado: 'Activa'
                    });
                if (errMem) throw errMem;
            }

            // Insertar Pago
            const { error: errPago } = await supabaseClient
                .from('pagos')
                .insert({
                    socio_id: socioParaRenovarId,
                    gimnasio_id: GIMNASIO_ID,
                    monto: monto,
                    fecha_pago: hoy.toISOString(),
                    metodo_pago: metodoPago
                });
            
            if (errPago) throw errPago;

            alert('✅ Renovación registrada correctamente.');
            document.getElementById('modal-renovar-cuota').classList.remove('abierto');
            formRenovar.reset();
            listarSocios(); 
        } catch(err) {
            alert('❌ Error al renovar: ' + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Registrar Renovación';
        }
    });
}









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


// Al final del archivo
listarSocios();