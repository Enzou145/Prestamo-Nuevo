// 1. CONFIGURACIÓN
const supabaseUrl = 'https://mhipqrjxnyykrwfjquxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaXBxcmp4bnl5a3J3ZmpxdXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzYwNzIsImV4cCI6MjA5MzkxMjA3Mn0.U8nEWlt2ARh7Sq0ZX_boxXQGgbkuopAJqLtJcegPh34';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const GIMNASIO_ID = '83e9348c-9aa8-4c64-9207-f78adc8c30fe'; 



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


const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebar-overlay');

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('abierto');
  overlay.classList.toggle('abierto');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('abierto');
  overlay.classList.remove('abierto');
});


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
    if (e.target === modalNuevoSocio) cerrarModalNuevoSocio();
    if (e.target === modalEditarSocio) cerrarModals();
    if (e.target === modalVerSocio) cerrarModals();
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
            const gymId = localStorage.getItem("gimnasio_id") || GIMNASIO_ID;
            const nombre = document.getElementById("input-nombre").value.trim();
            const apellido = document.getElementById("input-apellido").value.trim();
            const planId = document.getElementById("select-plan-nuevo").value;
            const monto = parseFloat(document.getElementById("input-monto-nuevo").value) || 0;
            const metodoPago = document.getElementById("select-metodo-pago").value;
            
            const hoy = new Date();
            const inputFecha = document.getElementById("input-fecha-ingreso").value;
            const fechaIngreso = inputFecha || hoy.toISOString().split('T')[0];

            if (!nombre || !apellido || !planId) {
                throw new Error("Nombre, apellido y plan son obligatorios.");
            }

            // Calcular vencimiento
            const opcionPlan = selectPlanNuevo.options[selectPlanNuevo.selectedIndex];
            const duracionDias = parseInt(opcionPlan.dataset.duracionDias) || 30; // Por defecto 30 dias si falla
            
            const [anio, mes, dia] = fechaIngreso.split("-").map(Number);
            const vencimiento = new Date(anio, mes - 1, dia + duracionDias);
            const fechaVencimiento = vencimiento.toISOString().split('T')[0];

            // PASO 1: Insertar socio
            const { data: socio, error: errorSocio } = await supabaseClient
                .from("socios")
                .insert({
                    gimnasio_id: gymId,
                    nombre,
                    apellido,
                    fecha_ingreso: fechaIngreso,
                    activo: true
                }).select().single();

            if (errorSocio) throw errorSocio;

            // PASO 2: Membresía
            const { data: mem, error: errorMem } = await supabaseClient
                .from("membresias_socios")
                .insert({
                    gimnasio_id: gymId,
                    socio_id: socio.id,
                    plan_id: planId,
                    fecha_inicio: fechaIngreso,
                    fecha_vencimiento: fechaVencimiento,
                    estado: "Activa"
                }).select().single();

            if (errorMem) throw errorMem;

            // PASO 3: Pago
            const { error: errorPago } = await supabaseClient
                .from("pagos")
                .insert({
                    gimnasio_id: gymId,
                    socio_id: socio.id,
                    membresia_id: mem.id,
                    monto: monto,
                    metodo_pago: metodoPago
                });

            if (errorPago) throw errorPago;

            alert(`✅ Socio guardado correctamente.`);
            cerrarModalNuevoSocio();
            location.reload(); // Recargar para ver los cambios

        } catch (err) {
            alert("❌ Error: " + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = "Guardar Socio";
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

// --- GUARDAR NUEVO PLAN DESDE INICIO ---
const formPlanInicio = document.getElementById("form-plan-inicio");
if (formPlanInicio) {
    formPlanInicio.addEventListener("submit", async function(e) {
        e.preventDefault();
        const gymId = localStorage.getItem("gimnasio_id") || GIMNASIO_ID;
        const btnGuardar = document.getElementById("btn-guardar-plan-inicio");
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";

        try {
            const nombre = document.getElementById("input-plan-nombre").value.trim();
            const descripcion = document.getElementById("input-plan-desc").value.trim();
            const duracion = parseInt(document.getElementById("select-plan-duracion").value);
            const precio = parseFloat(document.getElementById("input-plan-precio").value);

            const { error } = await supabaseClient
                .from('planes')
                .insert({
                    gimnasio_id: gymId,
                    nombre: nombre,
                    descripcion: descripcion,
                    duracion_dias: duracion,
                    precio: precio,
                    activo: true
                });

            if (error) throw error;
            
            alert("Plan creado exitosamente.");
            document.getElementById('modal-plan-inicio').classList.remove('abierto');
            formPlanInicio.reset();
            cargarPlanes(); // Actualizar el select del modal de nuevo socio
        } catch (err) {
            alert("Error al crear plan: " + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = "Guardar Plan";
        }
    });
}

// --- GUARDAR NUEVO PROFESOR DESDE INICIO ---
const formProfeInicio = document.getElementById("form-profe-inicio");
if (formProfeInicio) {
    formProfeInicio.addEventListener("submit", async function(e) {
        e.preventDefault();
        const gymId = localStorage.getItem("gimnasio_id") || GIMNASIO_ID;
        const btnGuardar = document.getElementById("btn-guardar-profe-inicio");
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";

        try {
            const nombre = document.getElementById("profe-nombre-inicio").value.trim();
            const especialidad = document.getElementById("profe-especialidad-inicio").value.trim();
            const telefono = document.getElementById("profe-contacto-inicio").value.trim();
            const urlFoto = document.getElementById("profe-avatar-inicio").value.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;
            const diasTurno = document.getElementById("profe-dias-inicio").value.trim();
            const horario = document.getElementById("profe-horario-inicio").value.trim();

            const { error } = await supabaseClient
                .from('profesores')
                .insert({
                    gimnasio_id: gymId,
                    nombre_apellido: nombre,
                    especialidad: especialidad,
                    telefono: telefono,
                    url_foto: urlFoto,
                    dias_turno: diasTurno,
                    horario: horario,
                    activo: true
                });

            if (error) throw error;
            
            alert("Profesor agregado exitosamente.");
            document.getElementById('modal-profe-inicio').classList.remove('abierto');
            formProfeInicio.reset();
        } catch (err) {
            alert("Error al agregar profesor: " + err.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = "Guardar Profesor";
        }
    });
}

// --- CARGAR DASHBOARD ---
async function cargarDashboard() {
    try {
        const gymId = localStorage.getItem("gimnasio_id") || GIMNASIO_ID;
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
        const hoyIso = hoy.toISOString().split('T')[0];

        // 1. Ingresos del Mes
        const { data: pagos, error: errPagos } = await supabaseClient
            .from('pagos')
            .select('monto')
            .eq('gimnasio_id', gymId)
            .gte('fecha_pago', primerDiaMes);
        
        if (!errPagos && pagos) {
            const ingresos = pagos.reduce((acc, curr) => acc + Number(curr.monto), 0);
            const tarjetaIngresos = document.getElementById('tarjeta-ingresos');
            if (tarjetaIngresos) tarjetaIngresos.textContent = `$ ${ingresos.toLocaleString('es-AR')}`;
        }

        // 2. Socios Activos (con membresia activa)
        const { count: countActivos, error: errActivos } = await supabaseClient
            .from('membresias_socios')
            .select('*', { count: 'exact', head: true })
            .eq('gimnasio_id', gymId)
            .eq('estado', 'Activa');
        
        if (!errActivos) {
            const tarjetaActivos = document.getElementById('tarjeta-activos');
            if (tarjetaActivos) tarjetaActivos.textContent = countActivos || 0;
        }

        // 3. Socios con Deuda (Membresias Vencidas)
        const { count: countDeuda, error: errVencidas } = await supabaseClient
            .from('membresias_socios')
            .select('*', { count: 'exact', head: true })
            .eq('gimnasio_id', gymId)
            .eq('estado', 'Vencida');
            
        if (!errVencidas) {
            const tarjetaDeuda = document.getElementById('tarjeta-deuda');
            if (tarjetaDeuda) tarjetaDeuda.textContent = countDeuda || 0;
        }

        // 4. Vencen Hoy
        const { count: countVencenHoy, error: errVencen } = await supabaseClient
            .from('membresias_socios')
            .select('*', { count: 'exact', head: true })
            .eq('gimnasio_id', gymId)
            .eq('fecha_vencimiento', hoyIso)
            .eq('estado', 'Activa');
            
        if (!errVencen) {
            const tarjetaVencenHoy = document.getElementById('tarjeta-vencen-hoy');
            if (tarjetaVencenHoy) tarjetaVencenHoy.textContent = countVencenHoy || 0;
        }

        // 5. Vencimientos Recientes (15 días pasados hasta 15 días en el futuro)
        const quinceDiasAtras = new Date(hoy);
        quinceDiasAtras.setDate(hoy.getDate() - 15);
        const quinceDiasAdelante = new Date(hoy);
        quinceDiasAdelante.setDate(hoy.getDate() + 15);

        const { data: vencimientosRecientes, error: errRecientes } = await supabaseClient
            .from('membresias_socios')
            .select(`
                id, 
                fecha_vencimiento, 
                estado,
                socios (nombre, apellido),
                planes (nombre)
            `)
            .eq('gimnasio_id', gymId)
            .gte('fecha_vencimiento', quinceDiasAtras.toISOString().split('T')[0])
            .lte('fecha_vencimiento', quinceDiasAdelante.toISOString().split('T')[0])
            .order('fecha_vencimiento', { ascending: true })
            .limit(10);

        if (!errRecientes && vencimientosRecientes) {
            const listaVencimientos = document.getElementById('lista-vencimientos');
            if (listaVencimientos) {
                listaVencimientos.innerHTML = '';
                const hoyF = new Date(hoyIso + 'T00:00:00');

                vencimientosRecientes.forEach(mem => {
                    const socio = Array.isArray(mem.socios) ? mem.socios[0] : mem.socios;
                    const plan = Array.isArray(mem.planes) ? mem.planes[0] : mem.planes;

                    const nombreCompleto = socio ? `${socio.nombre} ${socio.apellido}` : 'Desconocido';
                    const nombrePlan = plan ? plan.nombre : 'Plan';
                    
                    const fechaObj = new Date(mem.fecha_vencimiento + 'T00:00:00');
                    const opcionesFecha = { day: 'numeric', month: 'short', year: 'numeric' };
                    const fechaStr = fechaObj.toLocaleDateString('es-ES', opcionesFecha);

                    const inicial = socio && socio.nombre ? socio.nombre.charAt(0).toUpperCase() : '?';

                    const diffTime = fechaObj - hoyF;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let estadoTexto = '';
                    let claseEstado = '';
                    
                    if (mem.estado === 'Vencida' || diffDays < 0) {
                        estadoTexto = 'VENCIDO';
                        claseEstado = 'vencido';
                    } else if (diffDays >= 0 && diffDays <= 7) { // En socios suele ser 7 dias
                        estadoTexto = 'POR VENCER';
                        claseEstado = 'por-vencer';
                    } else {
                        estadoTexto = 'ACTIVO';
                        claseEstado = 'activo';
                    }

                    const html = `
                        <div class="cliente">
                            <div class="inicial">${inicial}</div>
                            <div class="nombreyplan">
                                <h1>${nombreCompleto}</h1>
                                <p>${nombrePlan}</p>
                            </div>
                            <div class="vencimientos">
                                <p>VENCE</p>
                                <h1>${fechaStr}</h1>
                            </div>
                            <div class="estado ${claseEstado}">${estadoTexto}</div>
                        </div>
                    `;
                    listaVencimientos.insertAdjacentHTML('beforeend', html);
                });
                
                if (vencimientosRecientes.length === 0) {
                    listaVencimientos.innerHTML = '<p style="padding: 1rem; color: #888;">No hay vencimientos recientes.</p>';
                }
            }
        }

    } catch (err) {
        console.error("Error cargando dashboard:", err);
    }
}

// Llamar al cargar el dashboard
cargarDashboard();