// CONFIGURACIÓN DE TU PROYECTO
const SUPABASE_URL = "https://ljsnvsvlnazprcfhoytc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ELqT_WM7MrJonyYE6L6P1Q_kmAPw3bB";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatearMoneda(valor) {
    return `$ ${Number(valor).toLocaleString('es-AR', {
        maximumFractionDigits: 0
    })}`;
}


// 2. VARIABLES GLOBALES Y ELEMENTOS
let prestamoSeleccionado = null;
let prestamoEnEdicionId = null; // Para saber si estamos creando o editando
const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
if (!usuarioLogueado) window.location.href = "index.html";

let clientes = [];
const listaContenedor = document.getElementById('listaClientes');
const contadorTexto = document.getElementById('contadorClientes');

/* ==========================================
   1. VARIABLES DE ESTADO Y ELEMENTOS DEL DOM
   ========================================== */
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');
const overlay = document.getElementById('sidebarOverlay');

const CLIENTES_POR_PAGINA = 8;
let paginaActual = 1;
let clientesFiltrados = [];


//CAMBIAR TEMA (COLORES)
const btnTema = document.getElementById('btn-tema');
const temaIcon = document.getElementById('tema-icon');
const sunIcon = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
const moonIcon = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;


// Modales
const modalNuevo = document.getElementById('modalNuevoCliente');
const modalCobro = document.getElementById('modalCobrarCuota');

// Botones Abrir/Cerrar
const btnAbrirNuevo = document.getElementById('abrirModalNuevo');
const btnCerrarNuevoX = document.getElementById('btnCerrarX');
const btnCancelarNuevo = document.getElementById('btnCancelarModal');
const btnCerrarCobroX = document.getElementById('btnCerrarCobro');

// Botón Guardar (Lógica Principal)
const btnGuardarCliente = document.getElementById('btnGuardarCliente');

// Lógica de Cobro
const displayCant = document.getElementById('cantidadCuotas');
const displayMontoFinal = document.getElementById('montoFinalPagar');
const btnMas = document.getElementById('btnMas');
const btnMenos = document.getElementById('btnMenos');
const modalOtorgar = document.getElementById('modalOtorgar');

//cobra cuota
let clienteSeleccionado = null; // Guardará al cliente al que le estamos cobrando
let cuotasAPagar = 1;

//editar cliente
let clienteEnEdicion = null; // Variable para saber a quién editamos


let cuotasSeleccionadas = 1;
const VALOR_CUOTA_BASE = 13000; 


//------------------------------------------------------------------------
//TEMAAAAAAAAAA
// Verificar preferencia guardada
if (localStorage.getItem('tema') === 'oscuro') {
    document.body.classList.add('tema-oscuro');
    temaIcon.innerHTML = sunIcon;
}

btnTema.addEventListener('click', () => {
    document.body.classList.toggle('tema-oscuro');
    const isDark = document.body.classList.contains('tema-oscuro');
    
    // Cambiar icono y guardar preferencia
    temaIcon.innerHTML = isDark ? sunIcon : moonIcon;
    localStorage.setItem('tema', isDark ? 'oscuro' : 'claro');
});
//------------------------------------------------------------------------


async function cargarClientesDB() {
    const { data, error } = await supabaseClient
        .from('clientes')
        .select(`
            *,
            prestamos (*)
        `)
        .eq('user_id', usuarioLogueado.auth_user_id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando clientes:", error);
        return;
    }

    // 1. Guardamos la data en nuestra variable local
    clientes = data || [];
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // 2. Procesamos cada cliente para determinar su estado real
    for (const cliente of clientes) {
        const misPrestamos = cliente.prestamos || [];
        
        // CASO A: No tiene ningún préstamo registrado
        if (misPrestamos.length === 0) {
            await actualizarEstadoLocalYDB(cliente, 'sin prestamo');
            continue;
        }

        // CASO B: Filtrar préstamos que aún tienen cuotas por pagar
        // IMPORTANTE: Un préstamo es activo si pagadas < totales
        const prestamosActivos = misPrestamos.filter(p => 
            (p.cuotas_pagadas || 0) < (p.cuotas_totales || 0)
        );

        // CASO C: Si tiene préstamos pero NINGUNO está activo (todos pagados)
        if (prestamosActivos.length === 0) {
            await actualizarEstadoLocalYDB(cliente, 'finalizado');
            continue;
        }

        // CASO D: Tiene al menos un préstamo activo. 
        // Buscamos el estado más crítico entre todos sus préstamos abiertos.
        let estadoGlobal = 'al dia'; 

        for (const prestamo of prestamosActivos) {
            const pagadas = prestamo.cuotas_pagadas || 0;
            // Usamos T00:00:00 para evitar desfases de zona horaria
            let fechaProxima = new Date(prestamo.fecha_inicio + 'T00:00:00');
            const intervalo = prestamo.intervalo_pago || 1;
            const frecuencia = prestamo.frecuencia_pago || 'Mensual';
            const proximaCuota = pagadas + 1;

            // Calcular fecha de la siguiente cuota según frecuencia
            if (frecuencia === 'Diario') {
                fechaProxima.setDate(fechaProxima.getDate() + (proximaCuota * intervalo));
            } else if (frecuencia === 'Semanal') {
                fechaProxima.setDate(fechaProxima.getDate() + (proximaCuota * intervalo * 7));
            } else if (frecuencia === 'Mensual') {
                fechaProxima.setMonth(fechaProxima.getMonth() + (proximaCuota * intervalo));
            }

            let estadoEstePrestamo = 'al dia';
            if (fechaProxima < hoy) {
                estadoEstePrestamo = 'atrasado';
            } else if (fechaProxima.toDateString() === hoy.toDateString()) {   // ← AGREGAR
                estadoEstePrestamo = 'vence hoy';                               // ← AGREGAR
            } else if (fechaProxima.toDateString() === mañana.toDateString()) {
                estadoEstePrestamo = 'vence mañana';
            }

            // Jerarquía de criticidad: atrasado > vence mañana > al dia
if (estadoEstePrestamo === 'atrasado') {
    estadoGlobal = 'atrasado';
    break;
} else if (estadoEstePrestamo === 'vence hoy') {    // ← AGREGAR
    if (estadoGlobal !== 'atrasado') estadoGlobal = 'vence hoy';  // ← AGREGAR
} else if (estadoEstePrestamo === 'vence mañana') {
    estadoGlobal = 'vence mañana';
}
        }

        // Actualizamos tanto en la base de datos como en el objeto local
        await actualizarEstadoLocalYDB(cliente, estadoGlobal);
    }

    // 3. Refrescar la interfaz
    // Si usas una función de filtro llamala aquí, si no usa clientesFiltrados directamente
    if (typeof filtrarClientes === 'function') {
        filtrarClientes(); 
    } else {
        clientesFiltrados = [...clientes];
        renderizarPagina(); 
    }

    if (document.getElementById('contadorTexto')) {
        document.getElementById('contadorTexto').textContent = `${clientes.length} clientes`;
    }
}
// Función auxiliar para no repetir código de actualización
async function actualizarEstadoLocalYDB(cliente, nuevoEstado) {
    if (cliente.estado !== nuevoEstado) {
        await supabaseClient.from('clientes').update({ estado: nuevoEstado }).eq('id', cliente.id);
        cliente.estado = nuevoEstado;
    }
}


/* ==========================================
   2. LÓGICA DEL SIDEBAR (MENÚ)
   ========================================== */
const abrirMenu = () => { sidebar.classList.add('open'); overlay.classList.add('active'); };
const cerrarMenu = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); };

menuToggle.onclick = abrirMenu;
overlay.onclick = cerrarMenu;



// Función para obtener las iniciales del Nombre y Apellido
function obtenerIniciales(nombreCompleto) {
    if (!nombreCompleto) return "??";
    const palabras = nombreCompleto.trim().split(" ");
    if (palabras.length >= 2) {
        // Toma la primera letra del primer nombre y la primera del primer apellido
        return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }
    return palabras[0][0].toUpperCase(); // Si solo tiene un nombre
}

/* ==========================================
   3. FUNCIÓN DE RENDERIZADO (DIBUJAR LISTA)
   ========================================== */
function renderizarPagina() {
    if (!listaContenedor) return;
    listaContenedor.innerHTML = '';

    const total = clientesFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / CLIENTES_POR_PAGINA));
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * CLIENTES_POR_PAGINA;
    const fin = Math.min(inicio + CLIENTES_POR_PAGINA, total);
    const clientesPagina = clientesFiltrados.slice(inicio, fin);

    document.getElementById('infoPagina').innerText = `${paginaActual} / ${totalPaginas}`;
    document.getElementById('btnAnterior').disabled = paginaActual <= 1;
    document.getElementById('btnSiguiente').disabled = paginaActual >= totalPaginas;
    document.getElementById('textoMostrando').innerText = total === 0 ? 'Sin clientes' : `Mostrando ${inicio + 1}–${fin}`;
    document.getElementById('textoTotal').innerText = `${total} CLIENTES`;

    clientesPagina.forEach(cliente => { 
        const misPrestamos = cliente.prestamos || [];
        
        // 1. BUSCAMOS PRÉSTAMOS ACTIVOS
        const prestamosActivos = misPrestamos.filter(p => (p.cuotas_pagadas || 0) < (p.cuotas_totales || 0));
        
        // 2. ELEGIMOS QUÉ MOSTRAR EN LA BARRA DE PROGRESO
        const pPrincipal = prestamosActivos.length > 0 ? prestamosActivos[0] : misPrestamos[misPrestamos.length - 1];

        // 3. CALCULAMOS DEUDA TOTAL REAL
        const deudaTotal = misPrestamos.reduce((acc, p) => {
            const saldo = p.total_devolver - (p.cuotas_pagadas * p.valor_cuota);
            return acc + (saldo > 0 ? saldo : 0);
        }, 0);

        const cuotasPagadas = pPrincipal?.cuotas_pagadas || 0;
        const cuotasTotales = pPrincipal?.cuotas_totales || 0;
        const porcentaje = (cuotasTotales > 0) ? Math.round((cuotasPagadas / cuotasTotales) * 100) : 0;
        
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ''}`;
        const estadoRaw = cliente.estado || 'sin prestamo';
        const estadoLimpio = estadoRaw.toLowerCase().replace(/\s+/g, '-');
        const iniciales = ((cliente.nombre?.charAt(0) || '') + (cliente.apellido?.charAt(0) || '')).toUpperCase();
        const direccionCompleta = `${cliente.calle || ''} ${cliente.nro_calle || ''} (${cliente.barrio || ''})`;

        const esRealmenteFinalizado = misPrestamos.length > 0 && deudaTotal <= 0;
        const esNuevo = misPrestamos.length === 0;

        const card = document.createElement('div');
        card.className = `cliente-card status-${estadoLimpio}`;
        
        // Lógica de botones unificada
        const accionesHTML = `
            <div class="acciones-card" style="display: flex; flex-wrap: wrap; gap: 8px;">
                <button class="btn-secundario-v2 btn-ver-detalles" style="flex: 1;"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg> Ver detalles</button>
                ${esNuevo ? 
                    `<button class="btn-principal-v2 btn-otorgar" style="flex: 1;">Otorgar préstamo</button>` :
                esRealmenteFinalizado ? 
                    `<button class="btn-principal-v2 btn-eliminar" style="flex: 1; background-color: #ef4444; color: white; border: none;">Eliminar</button>` :
                    `<button class="btn-principal-v2 btn-cobrar" style="flex: 1;">                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg> Cobrar cuota</button>`
                }
                
                <!-- Botón de Otorgar otro préstamo: Visible siempre que el cliente NO sea nuevo -->
                ${!esNuevo ? `
                <button class="btn-principal-v2 btn-otorgar-otro" style="width: 100%; margin-top: 3px; background-color: #10b981; border: none; color: white; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Otorgar otro préstamo
                </button>                ` : ''}
            </div>`;

        card.innerHTML = `
            <div class="cliente-header">
                <div class="cliente-avatar avatar-${estadoLimpio}">${iniciales}</div>
                <div class="cliente-info">
                    <h3>${nombreCompleto}</h3>
                    <p>Adeuda Total: <span class="monto-adeuda">$ ${Math.round(deudaTotal).toLocaleString('es-AR')}</span></p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="badge-estado badge-${estadoLimpio}">${estadoRaw.toUpperCase()}</div>
                    <svg class="flecha-expandir" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s ease; color: var(--texto-secundario); flex-shrink:0;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
            <div class="cliente-detalles">
                <div class="info-grid">
                    <div class="info-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        <strong>Dni:</strong> ${cliente.dni || '-'}
                    </div>
                    <div class="info-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <strong>Tel:</strong> ${cliente.telefono || '-'}
                    </div>
                    <div class="info-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <strong>Loc:</strong> ${direccionCompleta}
                    </div>
                    <div class="info-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        <strong>Job:</strong> ${cliente.ocupacion || '-'}
                    </div>
                </div>
                ${!esNuevo ? `
                    <div class="cuotas-progreso" style="
                        background-color: var(--otros-fondo);
                        border: 1px solid var(--borde-suave);
                        border-radius: 10px;
                        padding: 12px 16px;
                        margin-top: 10px;
                        margin-bottom: 15px;">

                        <p style="
                            color: var(--texto-principal);
                            font-size: 13px;
                            font-weight: 600;
                            margin: 0 0 8px 0;
                            display: flex;
                            align-items: center;
                            gap: 7px;
                            letter-spacing: 0.01em;">

                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke= var(--texto-principal) stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                                <line x1="2" y1="10" x2="22" y2="10"></line>
                            </svg>
                            $ ${pPrincipal?.total_devolver?.toLocaleString('es-AR') || 0} · ${cuotasPagadas}/${cuotasTotales} cuotas
                        </p>
                        <div class="barra-fondo"><div class="barra-completada" style="width: ${porcentaje}%"></div></div>
                        ${prestamosActivos.length > 1 ? `<small style="color: var(--texto-secundario); font-weight: 500; font-size: 12px">+${prestamosActivos.length - 1} préstamos activos</small>` : ''}
                    </div>
                ` : ''}
                ${accionesHTML} 
            </div>`;

        // --- MANEJO DE EVENTOS ---
        card.onclick = (e) => {
            if(e.target.closest('button')) return;
            const yaExpandida = card.classList.contains('expanded');
            document.querySelectorAll('.cliente-card.expanded').forEach(c => c.classList.remove('expanded'));
            if(!yaExpandida) card.classList.add('expanded');
        };        
        card.querySelector('.btn-ver-detalles').onclick = (e) => { 
            e.stopPropagation(); 
            // Nueva lógica: llamamos a una función verificadora
            verificarPrestamosParaDetalle(cliente);  
        };

        if (esNuevo) {
            card.querySelector('.btn-otorgar').onclick = (e) => { e.stopPropagation(); prepararOtorgar(cliente); };
        } else if (esRealmenteFinalizado) {
            card.querySelector('.btn-eliminar').onclick = (e) => { e.stopPropagation(); abrirModalEliminar(cliente); };
        } else {
            card.querySelector('.btn-cobrar').onclick = (e) => { e.stopPropagation(); abrirModalCobro(cliente); };
        }

        // Evento para el botón verde de "Otorgar otro"
        const btnOtro = card.querySelector('.btn-otorgar-otro');
        if (btnOtro) {
            btnOtro.onclick = (e) => { 
                e.stopPropagation(); 
                prepararOtorgar(cliente); 
            };
        }

        listaContenedor.appendChild(card);

        // Al terminar de renderizar, verificar si hay un cliente para destacar
const params = new URLSearchParams(window.location.search);
const clienteDestacado = params.get('cliente');

if (clienteDestacado) {
    const nombreBuscado = decodeURIComponent(clienteDestacado).toLowerCase();
    const cards = listaContenedor.querySelectorAll('.cliente-card');
    
    cards.forEach(card => {
        const nombreCard = card.querySelector('h3')?.innerText?.toLowerCase() || '';
        if (nombreCard === nombreBuscado) {
            card.classList.add('expanded');
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    });
}

    });
}




// Esta función decide si abre el detalle directo o el selector
function verificarPrestamosParaDetalle(cliente) {
    const prestamosActivos = (cliente.prestamos || []).filter(
        p => p.estado_prestamo?.toLowerCase() === 'activo'
    );

    if (prestamosActivos.length <= 1) {
        // Si tiene 0 o 1, abrimos el detalle como siempre
        abrirModalDetalles(cliente);
    } else {
        // Si tiene más de uno, abrimos el NUEVO selector
        abrirSelectorPrestamosDetalle(cliente, prestamosActivos);
    }
}

// Llena el nuevo modal que creamos en el HTML
function abrirSelectorPrestamosDetalle(cliente, prestamos) {
    const contenedor = document.getElementById('lista-prestamos-detalle-seleccion');
    const modalSelector = document.getElementById('modalSelectorPrestamoDetalle');
    
    contenedor.innerHTML = "";

    prestamos.forEach(p => {
        const pagadas = p.cuotas_pagadas || 0;
        const totales = p.cuotas_totales || 0;
        const porcentaje = totales > 0 ? Math.round((pagadas / totales) * 100) : 0;

        const item = document.createElement('div');
        item.style.cssText = `
            background-color: var(--otros-fondo);
            border: 1px solid var(--borde-suave);
            border-radius: 10px;
            padding: 12px 16px;
            cursor: pointer;
        `;
        
        item.innerHTML = `
            <p style="color: var(--texto-principal); font-size: 13px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 7px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                $ ${p.monto_prestado?.toLocaleString('es-AR')} · ${pagadas}/${totales} cuotas
            </p>
            <div style="background-color: var(--barra-estado); border-radius: 999px; height: 5px;">
                <div style="width: ${porcentaje}%; height: 100%; border-radius: 999px; background-color: #3b82f6;"></div>
            </div>
        `;
        
        item.onclick = () => {
            modalSelector.classList.remove('active');
            abrirModalDetalles(cliente, p);
        };
        contenedor.appendChild(item);
    });

    modalSelector.classList.add('active');
}




let clienteAEliminarId = null;

function abrirModalEliminar(cliente) {
    clienteAEliminarId = cliente.id;
    document.getElementById('nombreClienteEliminar').innerText = cliente.nombre;
    document.getElementById('modalEliminar').classList.add('active');
}

function cerrarModalEliminar() {
    document.getElementById('modalEliminar').classList.remove('active');
    clienteAEliminarId = null;
}

// Lógica del botón "Eliminar ahora" del modal
document.getElementById('confirmarEliminar').onclick = async () => {
    if (!clienteAEliminarId) return;

    // 1. BORRAR EN SUPABASE
    const { error } = await supabaseClient
        .from('clientes')
        .delete()
        .eq('id', clienteAEliminarId);

    if (error) {
        alert("Error al eliminar");
        return;
    }

    // 2. RECARGAR
    await cargarClientesDB();

    cerrarModalEliminar();

    alert("✅ Cliente eliminado correctamente");
};



// Helpers
function getIconoEstado(est) { return est === 'atrasado' ? '⚠️' : '✅'; }
function getLabelEstado(est) { return est === 'atrasado' ? 'Atrasado' : 'Al día'; }

/* ==========================================
   4. LÓGICA MODAL NUEVO CLIENTE (GUARDAR)
   ========================================== */
btnAbrirNuevo.onclick = () => modalNuevo.classList.add('active');

const cerrarModalNuevo = () => {
    modalNuevo.classList.remove('active');
    // Limpiar campos
    document.querySelectorAll('.modal-body input').forEach(i => i.value = '');
};

btnCerrarNuevoX.onclick = cerrarModalNuevo;
btnCancelarNuevo.onclick = cerrarModalNuevo;

// FUNCIÓN GUARDAR REAL
// REEMPLAZA TU FUNCIÓN btnGuardarCliente.onclick POR ESTA:
// Lógica para el botón "Guardar Cliente" (Gris)
btnGuardarCliente.onclick = () => ejecutarGuardado(false);

// Lógica para el botón "Guardar y Crear Préstamo" (Lila)
// Nota: Asegúrate de que el botón lila en tu HTML tenga id="btnGuardarYPrestar"

async function ejecutarGuardado(abrirPrestamo = false) {
    // CAPTURA CON TUS IDS REALES
    const datosCliente = {
        user_id: usuarioLogueado.auth_user_id,
        nombre: document.getElementById('cl-nombre').value.trim(),
        apellido: document.getElementById('cl-apellido').value.trim(),
        dni: document.getElementById('cl-dni').value.trim(),
        telefono: document.getElementById('cl-tel').value.trim(),
        ciudad: document.getElementById('cl-ciudad').value.trim(),
        barrio: document.getElementById('cl-barrio').value.trim(),
        calle: document.getElementById('cl-calle').value.trim(),
        nro_calle: document.getElementById('cl-nro').value.trim(),
        ocupacion: document.getElementById('cl-ocupacion').value.trim(),
        garantia_producto: document.getElementById('cl-sena').value.trim(),
        garantia_valor: parseFloat(document.getElementById('cl-monto').value) || 0,
        estado: 'sin prestamo'
    };

    if (!datosCliente.nombre || !datosCliente.apellido) {
        alert("Nombre y Apellido son obligatorios");
        return;
    }

    try {
    // Usamos el operador spread (...) para traer los datos del formulario
    // y le agregamos el user_id del prestamista actual
    const { data, error } = await supabaseClient
        .from('clientes')
        .insert([{ 
            ...datosCliente, 
            user_id: usuarioLogueado.auth_user_id 
        }])
        .select();

    if (error) throw error;

    alert("✅ Cliente guardado correctamente");
    
    // Limpiar inputs
    const inputs = document.querySelectorAll('#modalNuevoCliente input');
    inputs.forEach(input => input.value = '');

    cerrarModalNuevo(); 
    await cargarClientesDB();

    if (abrirPrestamo && data) {
        prepararOtorgar(data[0]);
    }
    } catch (err) {
        console.error("Error completo:", err);
        alert("Error: " + err.message);
    }
}

// ASIGNAR EVENTOS A LOS BOTONES
document.getElementById('btnGuardarCliente').onclick = () => ejecutarGuardado(false);

// Para el botón lila (que no tiene ID en tu HTML, lo buscamos por clase)
const btnLila = document.querySelector('.btn-guardar-prestamo');
if (btnLila) btnLila.onclick = () => ejecutarGuardado(true);


/* ==========================================
   5. LÓGICA MODAL COBRO ( CALCULADORA )
   ========================================== */

btnMas.onclick = () => { if(cuotasSeleccionadas < 12) { cuotasSeleccionadas++; actualizarMontoCobro(); }};
btnMenos.onclick = () => { if(cuotasSeleccionadas > 1) { cuotasSeleccionadas--; actualizarMontoCobro(); }};

function actualizarMontoCobro() {
    displayCant.innerText = cuotasSeleccionadas;
    const total = cuotasSeleccionadas * VALOR_CUOTA_BASE;
    displayMontoFinal.innerText = `$ ${total.toLocaleString('es-AR', {maximumFractionDigits: 2})}`;
}

btnCerrarCobroX.onclick = () => modalCobro.classList.remove('active');


/* ==========================================
   FUNCIÓN: ABRIR MODAL Y CARGAR DATOS
   ========================================== */
function abrirModalCobro(cliente) {

    const prestamosActivos = (cliente.prestamos || []).filter(
        p => p.estado_prestamo?.toLowerCase() === 'activo'
    );

    if (prestamosActivos.length === 0) {
        alert("Este cliente no tiene préstamos activos.");
        return;
    }

    if (prestamosActivos.length === 1) {
        mostrarInterfazCobro(cliente, prestamosActivos[0]);
    } else {
        abrirSelectorPrestamos(cliente, prestamosActivos);
    }
}

function abrirSelectorPrestamos(cliente, prestamos) {
    const contenedor = document.getElementById('lista-prestamos-seleccion');
    const modalSelector = document.getElementById('modalSelectorPrestamo');
    
    contenedor.innerHTML = "";

    prestamos.forEach(p => {
        const pagadas = p.cuotas_pagadas || 0;
        const totales = p.cuotas_totales || 0;
        const porcentaje = totales > 0 ? Math.round((pagadas / totales) * 100) : 0;

        const item = document.createElement('div');
        item.style.cssText = `
            background-color: var(--otros-fondo);
            border: 1px solid var(--borde-suave);
            border-radius: 10px;
            padding: 12px 16px;
            cursor: pointer;
        `;
        
        item.innerHTML = `
            <p style="color: var(--texto-principal); font-size: 13px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 7px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                $ ${p.monto_prestado?.toLocaleString('es-AR')} · ${pagadas}/${totales} cuotas
            </p>
            <div style="background-color: var(--barra-estado); border-radius: 999px; height: 5px;">
                <div style="width: ${porcentaje}%; height: 100%; border-radius: 999px; background-color: #3b82f6;"></div>
            </div>
        `;
        
        item.onclick = () => {
            modalSelector.classList.remove('active');
            mostrarInterfazCobro(cliente, p);
        };
        contenedor.appendChild(item);
    });

    modalSelector.classList.add('active');
}

/* ==========================================
   LÓGICA DE LA CALCULADORA DE CUOTAS
   ========================================== */

function mostrarInterfazCobro(cliente, prestamo) {
    // Guardamos qué préstamo se está operando globalmente
    clienteSeleccionado = cliente;
    prestamoSeleccionado = prestamo; 
    cuotasAPagar = 1;

    // 1. Nombre del cliente
    document.getElementById('nombreClienteCobro').innerText = `${cliente.nombre} ${cliente.apellido || ''}`;
    
    // 2. Datos reales de la tabla 'prestamos'
    document.getElementById('cobroMonto').innerText = formatearMoneda(prestamo.monto_prestado);
    document.getElementById('cobroTotal').innerText = formatearMoneda(prestamo.total_devolver);
    document.getElementById('cobroCuota').innerText = formatearMoneda(prestamo.valor_cuota);
    
    // 3. Progreso de cuotas
    const pagadas = prestamo.cuotas_pagadas || 0;
    const totales = prestamo.cuotas_totales || 0;
    document.getElementById('cobroProgreso').innerText = `${pagadas}/${totales}`;
    document.getElementById('textoProgresoCobro').innerText = `${pagadas} DE ${totales} CUOTAS`;

    // 4. Barra de progreso visual
    const porcentaje = totales > 0 ? (pagadas / totales) * 100 : 0;
    document.getElementById('barraProgresoCobro').style.width = `${porcentaje}%`;
    document.getElementById('porcentajeCobro').innerText = `${Math.round(porcentaje)}%`;

    // 5. Calcular el total inicial (1 cuota)
    actualizarCalculoCobro();
    
    // 6. Abrir modal
    document.getElementById('modalCobrarCuota').classList.add('active');
}

function actualizarCalculoCobro() {
    if (!clienteSeleccionado) return;

    const prestamo = prestamoSeleccionado;
    if (!prestamo) return;

    displayCant.innerText = cuotasAPagar;

    const total = cuotasAPagar * prestamo.valor_cuota;

    displayMontoFinal.innerText = `$ ${total.toLocaleString('es-AR', {maximumFractionDigits: 0})}`;
}

// Botón +
document.getElementById('btnMas').onclick = () => {
    const restantes = prestamoSeleccionado.cuotas_totales - prestamoSeleccionado.cuotas_pagadas;

    if (cuotasAPagar < restantes) {
        cuotasAPagar++;
        actualizarCalculoCobro();
    }
};
// Botón -
document.getElementById('btnMenos').onclick = () => {
    if (cuotasAPagar > 1) {
        cuotasAPagar--;
        actualizarCalculoCobro();
    }
};



// Botón Confirmar Pago (Para cerrar y guardar)
// Botón Confirmar Pago (Corregido para evaluar estado global)
document.querySelector('.btn-confirmar-final').onclick = async () => {
    if (!clienteSeleccionado || !prestamoSeleccionado) return;

    const prestamo = prestamoSeleccionado;
    const nuevasPagadas = prestamo.cuotas_pagadas + cuotasAPagar;
    const esPrestamoFinalizado = nuevasPagadas >= prestamo.cuotas_totales;

    // 1. ACTUALIZAR EL PRÉSTAMO ESPECÍFICO
    const { error: errorPrestamo } = await supabaseClient
        .from('prestamos')
        .update({
            cuotas_pagadas: nuevasPagadas,
            estado_prestamo: esPrestamoFinalizado ? 'finalizado' : 'activo'
        })
        .eq('id', prestamo.id);

    if (errorPrestamo) {
        console.error("Error al actualizar préstamo:", errorPrestamo);
        return;
    }

    // 2. GUARDAR EL REGISTRO DEL PAGO
    await supabaseClient.from('pagos').insert([{
        user_id: usuarioLogueado.auth_user_id,
        prestamo_id: prestamo.id,
        monto_pagado: cuotasAPagar * prestamo.valor_cuota,
        cantidad_cuotas_pagadas: cuotasAPagar
    }]);

    // 3. REVISAR ESTADO GLOBAL DEL CLIENTE
    // Traemos todos los préstamos para ver si queda alguno activo
    const { data: todosLosPrestamos } = await supabaseClient
        .from('prestamos')
        .select('cuotas_pagadas, cuotas_totales')
        .eq('cliente_id', clienteSeleccionado.id);

    // Un cliente sigue activo si tiene al menos un préstamo donde las pagadas sean menos que las totales
    const tienePrestamosActivos = todosLosPrestamos.some(p => 
        (p.cuotas_pagadas || 0) < (p.cuotas_totales || 0)
    );

    // Solo si NO tiene activos, el estado es 'finalizado'
    // Si tiene activos, lo dejamos 'al dia' (la función cargarClientesDB luego precisará si es 'atrasado')
    const nuevoEstadoCliente = tienePrestamosActivos ? 'al dia' : 'finalizado';

    // 4. ACTUALIZAR EL ESTADO DEL CLIENTE EN LA TABLA CLIENTES
    await supabaseClient
        .from('clientes')
        .update({ estado: nuevoEstadoCliente })
        .eq('id', clienteSeleccionado.id);

    // FINALIZAR PROCESO
    alert("✅ Pago registrado con éxito");
    modalCobro.classList.remove('active');

    // Refrescamos la base de datos local y la interfaz
    await cargarClientesDB();
};

// Botón Cerrar
document.getElementById('btnCerrarCobro').onclick = () => {
    document.getElementById('modalCobrarCuota').classList.remove('active');
};

// Botón Cancelar
document.querySelector('.btn-cancelar-finall').onclick = () => {
    document.getElementById('modalCobrarCuota').classList.remove('active');
};


async function eliminarPrestamo(prestamoId, clienteId) {

    // 1. BORRAR PRESTAMO
    await supabaseClient
        .from('prestamos')
        .delete()
        .eq('id', prestamoId);

    // 2. ACTUALIZAR CLIENTE
    await supabaseClient
        .from('clientes')
        .update({ estado: 'sin prestamo' })
        .eq('id', clienteId);

    await cargarClientesDB();
}

/* ==========================================
   LÓGICA MODAL DETALLES (CORREGIDA)
   ========================================== */
// Agregamos el parámetro "prestamoForzado"
function abrirModalDetalles(cliente, prestamoForzado = null) {
    if (!cliente) return;
    clienteSeleccionado = cliente; 

    // 1. Textos en etiquetas (<span>, <h2>, etc.) - Usan .innerText
    document.getElementById('det-cliente-nombre-cabecera').innerText = `${cliente.nombre} ${cliente.apellido || ''}`;
    
const badgeEstado = document.getElementById('det-estado-badge');

// Calcular el estado REAL del préstamo específico
let estadoCalculado = cliente.estado || 'sin prestamo';

const prestamoParaBadge = prestamoForzado || cliente.prestamos?.slice(-1)[0];
if (prestamoParaBadge) {
    const pag = prestamoParaBadge.cuotas_pagadas || 0;
    const tot = prestamoParaBadge.cuotas_totales || 0;

    if (pag >= tot && tot > 0) {
        estadoCalculado = 'finalizado';
    } else if (tot > 0) {
        const hoyB = new Date(); hoyB.setHours(0,0,0,0);
        const mananaB = new Date(hoyB); mananaB.setDate(mananaB.getDate() + 1);
        const intervalo = prestamoParaBadge.intervalo_pago || 1;
        const frecuencia = prestamoParaBadge.frecuencia_pago || 'Mensual';
        let fechaProx = new Date(prestamoParaBadge.fecha_inicio + 'T00:00:00');
        const proxNum = pag + 1;
        if (frecuencia === 'Diario') fechaProx.setDate(fechaProx.getDate() + (proxNum * intervalo));
        else if (frecuencia === 'Semanal') fechaProx.setDate(fechaProx.getDate() + (proxNum * intervalo * 7));
        else if (frecuencia === 'Mensual') fechaProx.setMonth(fechaProx.getMonth() + (proxNum * intervalo));

        if (fechaProx < hoyB) estadoCalculado = 'atrasado';
        else if (fechaProx.toDateString() === hoyB.toDateString()) estadoCalculado = 'vence hoy';
        else if (fechaProx.toDateString() === mananaB.toDateString()) estadoCalculado = 'vence mañana';
        else estadoCalculado = 'al dia';
    }
}

badgeEstado.innerText = estadoCalculado.toUpperCase();
badgeEstado.className = `badge-estado badge-${estadoCalculado.toLowerCase().replace(/\s+/g, '-')}`;

    // 2. Datos en INPUTS - !IMPORTANTE: Usan .value!
    document.getElementById('det-dni').value = cliente.dni || "";
    document.getElementById('det-tel').value = cliente.telefono || "";
    document.getElementById('det-ciudad').value = cliente.ciudad || "";
    document.getElementById('det-barrio').value = cliente.barrio || "";
    document.getElementById('det-calle').value = cliente.calle || "";
    document.getElementById('det-nro').value = cliente.nro_calle || "";
    document.getElementById('det-ocupacion').value = cliente.ocupacion || "";
    
    // Campos de garantía (Seña / Producto)
    document.getElementById('det-sena').value = cliente.garantia_producto || "-";
    document.getElementById('det-monto').value = cliente.garantia_valor ? `$ ${cliente.garantia_valor.toLocaleString('es-AR', {maximumFractionDigits: 2})}` : "-";
    
    // 3. Datos del préstamo
    const prestamo = prestamoForzado || cliente.prestamos?.slice(-1)[0];

    const montoPrestado = prestamo?.monto_prestado || 0;
    const montoTotal = prestamo?.total_devolver || 0;
    const cuotasPagas = prestamo?.cuotas_pagadas || 0;
    const cuotasTotales = prestamo?.cuotas_totales || 0;
    const valorCuota = prestamo?.valor_cuota || 0;

    document.getElementById('det-prestado').value = `$ ${montoPrestado.toLocaleString('es-AR', {maximumFractionDigits: 2})}`;
    document.getElementById('det-adevolver').value = `$ ${montoTotal.toLocaleString('es-AR', {maximumFractionDigits: 2})}`;
    document.getElementById('det-cuotas-resumen').value = `${cuotasPagas} / ${cuotasTotales}`;
    // Antes tenía maximumFractionDigits: 2, cámbialo a 0
    document.getElementById('det-valor-cuota').value = `$ ${Math.round(valorCuota).toLocaleString('es-AR', {maximumFractionDigits: 0})}`;

    // 4. Lógica de la barra de progreso (CON COLORES DINÁMICOS)
    const barra = document.getElementById('det-progreso-barra');
    const porcentaje = cuotasTotales > 0 ? (cuotasPagas / cuotasTotales) * 100 : 0;
    
    barra.style.width = `${porcentaje}%`;

// Calcular el estado REAL de este préstamo específico
let colorBarra = "#94a3b8"; // gris por defecto

if (prestamo && cuotasTotales > 0) {
    const hoyBarra = new Date();
    hoyBarra.setHours(0, 0, 0, 0);
    const manana = new Date(hoyBarra);
    manana.setDate(manana.getDate() + 1);

    let fechaProxima = new Date(prestamo.fecha_inicio + 'T00:00:00');
    const intervalo = prestamo.intervalo_pago || 1;
    const frecuencia = prestamo.frecuencia_pago || 'Mensual';
    const proximaCuota = cuotasPagas + 1;

    if (frecuencia === 'Diario') fechaProxima.setDate(fechaProxima.getDate() + (proximaCuota * intervalo));
    else if (frecuencia === 'Semanal') fechaProxima.setDate(fechaProxima.getDate() + (proximaCuota * intervalo * 7));
    else if (frecuencia === 'Mensual') fechaProxima.setMonth(fechaProxima.getMonth() + (proximaCuota * intervalo));

    if (cuotasPagas >= cuotasTotales) {
        colorBarra = "#22c55e"; // verde: finalizado
    } else if (fechaProxima < hoyBarra) {
        colorBarra = "#ef4444"; // rojo: atrasado
    } else if (fechaProxima.toDateString() === manana.toDateString()) {
        colorBarra = "#f59e0b"; // naranja: vence mañana
    } else {
        colorBarra = "#3b82f6"; // azul: al día
    }
}

barra.style.backgroundColor = colorBarra;

// Botón "Editar Préstamo" dentro del Modal de Detalles
const btnIrAEditarPrestamo = document.querySelector('.btn-editar-prestamo');
if (btnIrAEditarPrestamo) {
    btnIrAEditarPrestamo.onclick = () => {
        const prestamo = clienteSeleccionado.prestamos?.slice(-1)[0];
        if (!prestamo) {
            alert("Este cliente no tiene un préstamo activo para editar.");
            return;
        }
        document.getElementById('modalDetalles').classList.remove('active');
        abrirEdicionPrestamo(clienteSeleccionado, prestamo);
    };
}

function abrirEdicionPrestamo(cliente, prestamo) {
    prestamoEnEdicionId = prestamo.id; // Guardamos el ID para el UPDATE
    clienteSeleccionado = cliente;

    // 1. Llenar los campos del modal de Otorgar con los datos actuales
    document.getElementById('oto-monto').value = prestamo.monto_prestado.toLocaleString('es-AR');
    document.getElementById('oto-interes').value = prestamo.interes_porcentaje;
    document.getElementById('oto-cuotas').value = prestamo.cuotas_totales;
    document.getElementById('oto-frec-tipo').value = prestamo.frecuencia_pago;
    document.getElementById('oto-fecha-inicio').value = prestamo.fecha_inicio;
    
    document.getElementById('oto-nombre-sub').innerText = `${cliente.nombre} ${cliente.apellido || ''}`;

    // 2. Marcar el botón de frecuencia correcto
    document.querySelectorAll('.oto-frec-btn').forEach(btn => {
        btn.classList.toggle('oto-frec-active', btn.dataset.value === prestamo.frecuencia_pago);
    });

    // 3. Cambiar el texto del botón de acción
    const btnGuardar = document.querySelector('#modalOtorgar .btn-guardar-prestamo');
    btnGuardar.innerText = "Actualizar Préstamo";

    // 4. Abrir modal y calcular
    document.getElementById('modalOtorgar').classList.add('active');
    calcularPrestamo();
}
    

    document.getElementById('det-progreso-texto').innerText = `${cuotasPagas} DE ${cuotasTotales} CUOTAS PAGADAS`;
    // 5. Historial Dinámico (MODIFICADO PARA FUNCIONAR COMO LA IMAGEN)
    const historialDiv = document.getElementById('historialCuotas');
    historialDiv.innerHTML = ''; // Limpiar contenido previo

    if (prestamo && cuotasTotales > 0) {
        for (let i = 1; i <= cuotasTotales; i++) {
            // Calcular fecha de cada cuota
            let fechaCuota = new Date(prestamo.fecha_inicio + 'T00:00:00');
            const intervalo = prestamo.intervalo_pago || 1;
            const frecuencia = prestamo.frecuencia_pago || "Mensual";

            if (frecuencia === "Diario") fechaCuota.setDate(fechaCuota.getDate() + (i * intervalo));
            else if (frecuencia === "Semanal") fechaCuota.setDate(fechaCuota.getDate() + (i * intervalo * 7));
            else if (frecuencia === "Mensual") fechaCuota.setMonth(fechaCuota.getMonth() + (i * intervalo));

            const estaPagada = i <= cuotasPagas;

            // ← AGREGAR ESTO
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const estaAtrasada = !estaPagada && fechaCuota < hoy;


            // Crear el elemento de la cuota con el estilo de la imagen
            const item = document.createElement('div');
            item.className = `cuota-item ${estaPagada ? 'pagada' : estaAtrasada ? 'atrasada' : ''}`;
            item.innerHTML = `
                <div class="cuota-info">
                    <p class="cuota-numero">Cuota ${i}</p>
                    <p class="cuota-fecha">${fechaCuota.toLocaleDateString('es-AR')}</p>
                </div>
                <div class="cuota-monto-status">
                    <p class="cuota-monto">$ ${Math.round(valorCuota).toLocaleString('es-AR', {maximumFractionDigits: 0})}</p>
                        <span class="badge-cuota ${estaPagada ? 'pagada' : estaAtrasada ? 'atrasada' : 'pendiente'}">
                        ${estaPagada ? 'PAGADA' : estaAtrasada ? 'ATRASADO' : 'PENDIENTE'}
                    </span>
                </div>
            `;
            historialDiv.appendChild(item);
        }
    } else {
        historialDiv.innerHTML = '<p style="text-align:center; padding:10px; color:gray;">Sin préstamo activo</p>';
    }

    document.getElementById('modalDetalles').classList.add('active');
}


// Función auxiliar para calcular las fechas del historial
function calcularFechaParaCuota(fechaInicio, cuotaIndex, intervalo, frecuencia) {
    let fecha = new Date(fechaInicio + 'T00:00:00');
    if (cuotaIndex === 0) return fecha;

    if (frecuencia === "Diario") {
        fecha.setDate(fecha.getDate() + (cuotaIndex * intervalo));
    } else if (frecuencia === "Semanal") {
        fecha.setDate(fecha.getDate() + (cuotaIndex * intervalo * 7));
    } else if (frecuencia === "Mensual") {
        fecha.setMonth(fecha.getMonth() + (cuotaIndex * intervalo));
    }
    return fecha;
}


// Botón para cerrar
document.getElementById('btnCerrarDetalles').onclick = () => {
    document.getElementById('modalDetalles').classList.remove('active');
};




/*---------------- LÓGICA EDITAR CLIENTE (CORREGIDA) ------------- */

function abrirModalEditar(cliente) {
    if (!cliente) return;
    clienteSeleccionado = cliente; 

    // Mapeo exacto de los campos que vienen de Supabase a tus IDs de edición
    document.getElementById('edit-nombre').value = cliente.nombre || "";
    document.getElementById('edit-apellido').value = cliente.apellido || "";
    document.getElementById('edit-dni').value = cliente.dni || "";
    document.getElementById('edit-tel').value = cliente.telefono || "";
    document.getElementById('edit-ciudad').value = cliente.ciudad || "";
    document.getElementById('edit-barrio').value = cliente.barrio || "";
    document.getElementById('edit-calle').value = cliente.calle || "";
    document.getElementById('edit-nro').value = cliente.nro_calle || "";
    document.getElementById('edit-ocupacion').value = cliente.ocupacion || "";
    document.getElementById('edit-sena').value = cliente.garantia_producto || "";
    document.getElementById('edit-monto').value = cliente.garantia_valor || "";

    document.getElementById('modalEditar').classList.add('active');
}

// Botón "Editar cliente" dentro del Modal de Detalles
const btnIrAEditar = document.querySelector('.btn-editar-cliente');
if (btnIrAEditar) {
    btnIrAEditar.onclick = () => {
        document.getElementById('modalDetalles').classList.remove('active');
        abrirModalEditar(clienteSeleccionado);
    };
}

// GUARDAR CAMBIOS (Actualización en Supabase)
const formEditar = document.getElementById('formEditarCliente');
if (formEditar) {
    formEditar.onsubmit = async (e) => {
        e.preventDefault();
        if (!clienteSeleccionado) return;

        const nuevosDatos = {
            nombre: document.getElementById('edit-nombre').value.trim(),
            apellido: document.getElementById('edit-apellido').value.trim(),
            dni: document.getElementById('edit-dni').value.trim(),
            telefono: document.getElementById('edit-tel').value.trim(),
            ciudad: document.getElementById('edit-ciudad').value.trim(),
            barrio: document.getElementById('edit-barrio').value.trim(),
            calle: document.getElementById('edit-calle').value.trim(),
            nro_calle: document.getElementById('edit-nro').value.trim(),
            ocupacion: document.getElementById('edit-ocupacion').value.trim(),
            garantia_producto: document.getElementById('edit-sena').value.trim(),
            garantia_valor: parseFloat(document.getElementById('edit-monto').value) || 0
        };

        const { error } = await supabaseClient
            .from('clientes')
            .update(nuevosDatos)
            .eq('id', clienteSeleccionado.id);

        if (error) {
            alert("Error al actualizar: " + error.message);
        } else {
            alert("✅ ¡Datos actualizados correctamente!");
            document.getElementById('modalEditar').classList.remove('active');
            await cargarClientesDB(); // Recarga la lista automáticamente
        }
    };
}


// 4. Botones Cerrar/Cancelar (CORREGIDO)
const modalEdicion = document.getElementById('modalEditar');

document.getElementById('btnCerrarEditar').onclick = () => {
    modalEdicion.classList.remove('active');
};

document.getElementById('btnCancelarEditar').onclick = () => {
    modalEdicion.classList.remove('active');
};









/* ==========================================
   LÓGICA OTORGAR PRÉSTAMO (SUBIR A DB)
   ========================================== */
/* ==========================================
   LÓGICA OTORGAR PRÉSTAMO (SUBIR A DB)
   ========================================== */
function prepararOtorgar(cliente) {
    // 0. Reset de estado: muy importante para que no haga UPDATE por error
    prestamoEnEdicionId = null; 
    clienteSeleccionado = cliente; 

    // 1. Reset de interfaz: cambiamos textos a modo "Crear"
    const btnGuardar = document.querySelector('#modalOtorgar .btn-guardar-prestamo');
    if (btnGuardar) btnGuardar.innerText = "Otorgar Préstamo";
    
    const tituloModal = document.querySelector('#modalOtorgar h2');
    if (tituloModal) tituloModal.innerText = "Otorgar Nuevo Préstamo";

    // 2. Limpiar y resetear campos a valores por defecto
    document.getElementById('oto-monto').value = "";
    document.getElementById('oto-interes').value = "20"; // O tu valor por defecto
    document.getElementById('oto-cuotas').value = "6"; // O tu valor por defecto
    
    // 3. Llenar el nombre en el modal
    const subNombre = document.getElementById('oto-nombre-sub');
    if (subNombre) subNombre.innerText = `${cliente.nombre} ${cliente.apellido || ''}`;

    // 4. Sincronizar Frecuencia: Por defecto "Diario" (o la que prefieras)
    document.querySelectorAll('.oto-frec-btn').forEach(btn => {
        btn.classList.toggle('oto-frec-active', btn.dataset.value === 'diario');
    });
    document.getElementById('oto-frec-tipo').value = 'diario';

    // 5. Fecha Inicio: Hoy
    const inputFecha = document.getElementById('oto-fecha-inicio');
    if(inputFecha) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        inputFecha.value = `${yyyy}-${mm}-${dd}`;
    }
    // 6. Mostrar modal y CALCULAR
    document.getElementById('modalOtorgar').classList.add('active');
    calcularPrestamo();
}

function seleccionarFrecuencia(btn) {
    document.querySelectorAll('#modalOtorgar .oto-frec-btn').forEach(b => b.classList.remove('oto-frec-active'));
    btn.classList.add('oto-frec-active');
    document.getElementById('oto-frec-tipo').value = btn.dataset.value;
    calcularPrestamo();
}

// ESTA FUNCIÓN ES LA QUE SE EJECUTA AL DARLE AL BOTÓN "GUARDAR PRÉSTAMO"
async function confirmarOtorgarPrestamo() {
    if (!clienteSeleccionado) return;

    const montoRaw = document.getElementById('oto-monto').value;
    const montoPrestado = parseFloat(montoRaw.replace(/\./g, '')) || 0; 
    const interes = parseFloat(document.getElementById('oto-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('oto-cuotas').value) || 1;
    const frecuencia = document.getElementById('oto-frec-tipo').value;
    const fechaInicio = document.getElementById('oto-fecha-inicio').value;
    const fechaFin = document.getElementById('oto-fecha-fin').value;

    if (montoPrestado <= 0) {
        alert("Ingresa un monto válido");
        return;
    }

    const totalADevolver = montoPrestado + (montoPrestado * (interes / 100));
    const valorCuota = totalADevolver / cuotas;

    const datosPrestamo = {
        monto_prestado: montoPrestado,
        interes_porcentaje: interes,
        cuotas_totales: cuotas,
        frecuencia_pago: frecuencia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        total_devolver: totalADevolver,
        valor_cuota: valorCuota
    };

    try {
        let error;

        if (prestamoEnEdicionId) {
            // --- ACTUALIZAR EXISTENTE ---
            const result = await supabaseClient
                .from('prestamos')
                .update(datosPrestamo)
                .eq('id', prestamoEnEdicionId);
            error = result.error;
        } else {
            // --- INSERTAR NUEVO ---
            const result = await supabaseClient
                .from('prestamos')
                .insert([{
                    ...datosPrestamo,
                    user_id: usuarioLogueado.auth_user_id,
                    cliente_id: clienteSeleccionado.id,
                    estado_prestamo: 'activo',
                    cuotas_pagadas: 0,
                    intervalo_pago: 1
                }]);
            error = result.error;
            
            // Actualizar estado del cliente solo si es nuevo
            await supabaseClient.from('clientes').update({ estado: 'al dia' }).eq('id', clienteSeleccionado.id);
        }

        if (error) throw error;

        alert(prestamoEnEdicionId ? "✅ Préstamo actualizado" : "✅ Préstamo otorgado");
        document.getElementById('modalOtorgar').classList.remove('active');
        prestamoEnEdicionId = null; // Resetear
        await cargarClientesDB();

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    }
}

// IMPORTANTE: Vincula el botón del modal con la función
// Ejecuta esto al final de tu archivo o dentro de DOMContentLoaded
const btnFinalGuardarPrestamo = document.querySelector('#modalOtorgar .btn-guardar-prestamo') || document.querySelector('.btn-confirmar-prestamo');
if (btnFinalGuardarPrestamo) {
    btnFinalGuardarPrestamo.onclick = confirmarOtorgarPrestamo;
}


// Función para cerrar el modal
function cerrarModalOtorgar() {
    const modal = document.getElementById('modalOtorgar');
    if (modal) modal.classList.remove('active');
}

// Función para los botones + y -
function ajustar(id, cambio) {
    const input = document.getElementById(id);
    if (!input) return;
    let valor = parseInt(input.value) || 0;
    valor += cambio;
    if (valor < 1) valor = 1; // No permite valores menores a 1
    input.value = valor;
    calcularPrestamo(); // Recalcula automáticamente al tocar + o -
}




// 1. Función para poner puntos automáticamente
function formatearMiles(input) {
    // Quitamos cualquier caracter que no sea número
    let valor = input.value.replace(/\D/g, "");
    // Agregamos los puntos
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = valor;
    // Llamamos al cálculo
    calcularPrestamo();
}

// 2. Función calcularPrestamo corregida
function calcularPrestamo() {
    const montoInput = document.getElementById('oto-monto');
    // Obtenemos el valor numérico real (quitando los puntos para calcular)
    const monto = parseFloat(montoInput.value.replace(/\./g, '')) || 0;
    
    const interes = parseFloat(document.getElementById('oto-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('oto-cuotas').value) || 1;
    const cadaX = parseInt(document.getElementById('oto-frec-valor').value) || 1;
    const frecuencia = document.getElementById('oto-frec-tipo').value;
    const fechaInicioStr = document.getElementById('oto-fecha-inicio').value;

    const totalADevolver = monto + (monto * (interes / 100));
    const valorCuota = totalADevolver / cuotas;

    if (fechaInicioStr) {
        let fechaFin = new Date(fechaInicioStr + 'T00:00:00');
        
        // CORRECCIÓN DE FECHA: Ahora calculamos el fin sumando todos los intervalos
        // Si hay 1 cuota diaria, se suma 1 día.
        if (frecuencia === "Diario") {
            fechaFin.setDate(fechaFin.getDate() + (cuotas * cadaX));
        } else if (frecuencia === "Semanal") {
            fechaFin.setDate(fechaFin.getDate() + (cuotas * cadaX * 7));
        } else if (frecuencia === "Mensual") {
            fechaFin.setMonth(fechaFin.getMonth() + (cuotas * cadaX));
        }
        
        document.getElementById('oto-fecha-fin').value = fechaFin.toISOString().split('T')[0];
    }

    document.getElementById('res-total').innerText = `$ ${totalADevolver.toLocaleString('es-AR', {maximumFractionDigits: 0})}`;
    document.getElementById('res-cuota').innerText = `$ ${Math.round(valorCuota).toLocaleString('es-AR', {maximumFractionDigits: 0})}`;
}









/* ==========================================
   FILTRO DROPDOWN
   ========================================== */
let filtroEstadoActivo = 'todos';

const filtroBtn = document.getElementById('filtroBtn');
const filtroMenu = document.getElementById('filtroMenu');
const filtroLabel = document.getElementById('filtroLabel');

filtroBtn.onclick = (e) => {
    e.stopPropagation();
    filtroMenu.classList.toggle('open');
};

document.addEventListener('click', () => filtroMenu.classList.remove('open'));

document.querySelectorAll('.filtro-opcion').forEach(opcion => {
    opcion.onclick = (e) => {
        e.stopPropagation();
        filtroEstadoActivo = opcion.dataset.estado;
        filtroLabel.textContent = opcion.textContent.trim();

        document.querySelectorAll('.filtro-opcion').forEach(o => o.classList.remove('active'));
        opcion.classList.add('active');

        filtroMenu.classList.remove('open');
        aplicarFiltros();
    };
});

// Modifica tu buscador también para usar esta función
document.getElementById('buscadorClientes').addEventListener('input', aplicarFiltros);

function aplicarFiltros() {
    const texto = document.getElementById('buscadorClientes').value.toLowerCase();
    const filtrados = clientes.filter(c => {
        const nombre = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
        const coincideTexto = nombre.includes(texto) || (c.dni || '').includes(texto);
        const estado = (c.estado || 'sin prestamo').toLowerCase();
        const coincideEstado = filtroEstadoActivo === 'todos' || estado === filtroEstadoActivo;
        return coincideTexto && coincideEstado;
    });
    clientesFiltrados = filtrados;
    paginaActual = 1;
    renderizarPagina();
}


/* ==========================================
   6. INICIO DE LA APP
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    cargarClientesDB();
    inicializarIdentidad(); // <--- Llamamos a la nueva función

    // Lógica del Modal de Logout (Igual a Inicio)
    const btnLogout = document.getElementById('btn-logout');
    const modalLogout = document.getElementById('modal-logout');
    const btnConfirmarLogout = document.getElementById('btn-confirmar-logout');
    const btnCancelarLogout = document.getElementById('btn-cancelar-logout');

    if (btnLogout) {
        btnLogout.onclick = (e) => {
            e.preventDefault();
            modalLogout.style.display = 'flex';
        };
    }

    if (btnCancelarLogout) {
        btnCancelarLogout.onclick = () => modalLogout.style.display = 'none';
    }

    if (btnConfirmarLogout) {
        btnConfirmarLogout.onclick = () => {
            localStorage.removeItem("usuarioLogueado");
            window.location.href = "index.html";
        };
    }

    // Cerrar modal al hacer clic fuera
    window.onclick = (event) => {
        if (event.target == modalLogout) modalLogout.style.display = 'none';
    };


    document.getElementById('btnAnterior').onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            renderizarPagina();
        }
    };

    document.getElementById('btnSiguiente').onclick = () => {
        const totalPaginas = Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA);
        if (paginaActual < totalPaginas) {
            paginaActual++;
            renderizarPagina();
        }
    };
});




// 1. Nueva función para inicializar la identidad del usuario
async function inicializarIdentidad() {
    try {
        const authId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;
        
        // Buscamos el nombre real en la tabla usuarios
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('nombre_prestamista')
            .eq('auth_user_id', authId)
            .single();

        if (data) {
            const nombreCompleto = data.nombre_prestamista || "Usuario";
            
            // Actualizamos Sidebar
            const elNombre = document.getElementById('sidebar-user-name');
            const elAvatar = document.getElementById('user-avatar-initial');

            if (elNombre) elNombre.innerText = nombreCompleto;
            if (elAvatar) elAvatar.innerText = obtenerIniciales(nombreCompleto);
        }
    } catch (e) {
        console.error("Error al cargar identidad:", e);
    }
}

