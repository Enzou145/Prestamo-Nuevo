// 1. VARIABLE GLOBAL Y UTILIDADES
let CAPITAL_TOTAL_DINAMICO = 0;
let nombreCompletoUsuario = "Usuario"; // Agrega esta
let primerNombreUsuario = "Usuario";

const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(valor);
};

// 2. INICIALIZACIÓN (EL MOTOR DE LA APP)


async function inicializarApp() {
    try {
        const sesion = localStorage.getItem("usuarioLogueado");
        if (!sesion) {
            window.location.href = "index.html";
            return;
        }

        const usuarioLogueado = JSON.parse(sesion);
        
        // CORRECCIÓN CLAVE: Usamos la misma lógica que en tus funciones de cobros
        // Intentamos obtener el ID de autenticación de todas las formas posibles
        const authId = usuarioLogueado?.auth_user_id || usuarioLogueado?.user?.id || usuarioLogueado?.id; 

        if (!authId) {
            console.error("No se encontró el ID del usuario en la sesión");
            return;
        }

        // Consultamos el perfil del prestamista
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('capital_inicial, nombre_prestamista')
            .eq('auth_user_id', authId)
            .single();

        if (error) {
            console.error("Error al obtener datos del perfil:", error.message);
            ejecutarCargasDashboard(); // Intentamos cargar el resto igual
            return;
        }

        if (data) {
            // 1. Actualizamos variables globales
            nombreCompletoUsuario = data.nombre_prestamista || "Usuario";
            primerNombreUsuario = nombreCompletoUsuario.split(' ')[0];
            CAPITAL_TOTAL_DINAMICO = Number(data.capital_inicial) || 0;

            // 2. ACTUALIZAMOS EL HTML (Topbar y Sidebar)
            const greetingEl = document.getElementById('user-greeting');
            if (greetingEl) {
                greetingEl.innerHTML = `${obtenerSaludoSegunHora()}, <strong>${primerNombreUsuario}</strong>`;
            }

            const sidebarNameEl = document.getElementById('sidebar-user-name');
            if (sidebarNameEl) {
                sidebarNameEl.innerText = nombreCompletoUsuario;
            }

            const avatarEl = document.getElementById('user-avatar-initial');
            if (avatarEl) {
                avatarEl.innerText = primerNombreUsuario.charAt(0).toUpperCase();
            }

            // 3. Modal de bienvenida (Si el capital es 0)
            if (CAPITAL_TOTAL_DINAMICO === 0) {
                mostrarBienvenida(nombreCompletoUsuario);
            }
        }

        // Una vez tenemos el nombre y capital, disparamos el resto del dashboard
        ejecutarCargasDashboard();

    } catch (err) {
        console.error("Error crítico en inicialización:", err);
    }
}


// Función para agrupar las cargas y no repetir código
function ejecutarCargasDashboard() {
    cargarResumenCapital(); 
    cargarGraficoClientes();
    cargarProximosCobros();
    cargarTopClientes();
}



//  ------- MODAL DE VIENBENIDA POR PRIMERA VEZ -----------
//  ------- MODAL DE VIENBENIDA POR PRIMERA VEZ -----------

function mostrarBienvenida(nombre) {
    // Si ya lo vio antes, no mostrar
    if (localStorage.getItem("onboardingCompleto") === "true") return;
    const modal = document.getElementById('modal-bienvenida');
    const btn = document.getElementById('btn-comenzar-onboarding');
    const titulo = document.getElementById('titulo-bienvenida');
    
    const primerNombre = nombre.split(' ')[0];
    titulo.innerText = `¡Bienvenido, ${primerNombre}!`;
    
    modal.style.display = 'flex';

    btn.onclick = () => {
        modal.style.display = 'none';
        
        // 2. HACER QUE LA TARJETA RESALTE
        const cardCapital = document.querySelector('.card-capital'); // Asegúrate que tu card tenga esta clase
        if (cardCapital) {
            cardCapital.classList.add('highlight-pulse');
            
            // Opcional: El pulso se quita cuando el usuario hace clic en la tarjeta
            cardCapital.addEventListener('click', () => {
                cardCapital.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Añade esto
                cardCapital.classList.remove('highlight-pulse');
            }, { once: true });
        }
    };
}



// --- ÚNICA FUNCIÓN PARA COBROS (UNIFICADA) ---
async function cargarProximosCobros() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;
        if (!userId) return;

        // 1. Traemos los préstamos activos
        const { data: prestamos, error } = await supabaseClient
            .from('prestamos')
            .select(`
                valor_cuota, 
                estado_prestamo, 
                fecha_inicio, 
                cuotas_pagadas, 
                intervalo_pago,
                frecuencia_pago,
                clientes (nombre, apellido)
            `)
            .eq('user_id', userId)
            .neq('estado_prestamo', 'finalizado');

        if (error) throw error;

        const msgContenedor = document.getElementById('mensaje-asistente-cobros');
        
        // --- CASO SIN PRÉSTAMOS ---
        if (!prestamos || prestamos.length === 0) {
            if (msgContenedor) {
                msgContenedor.innerHTML = `Hola <strong>${primerNombreUsuario}</strong>, ¡Registra un préstamo para empezar!`;
            }
            document.getElementById('lista-cobros').innerHTML = `<p style="color:gray; font-size:12px; text-align:center; padding: 20px;">No hay préstamos activos</p>`;
            return;
        }

        let hoyContador = 0;
        let vencidosContador = 0;
        const fechaHoy = new Date();
        fechaHoy.setHours(0, 0, 0, 0);

        // 2. Calculamos fechas y llenamos la lista
        todosLosCobros = prestamos.map(p => {
            const cuotaSiguiente = (p.cuotas_pagadas || 0) + 1;
            const intervalo = p.intervalo_pago || 1;
            const frecuencia = (p.frecuencia_pago || "diario").toLowerCase();
            
            let fechaVencimiento = new Date(p.fecha_inicio);
            fechaVencimiento.setMinutes(fechaVencimiento.getMinutes() + fechaVencimiento.getTimezoneOffset());

            if (frecuencia.includes("diario")) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo));
            } else if (frecuencia.includes("semanal")) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo * 7));
            } else if (frecuencia.includes("mensual")) {
                fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (cuotaSiguiente * intervalo));
            }

            fechaVencimiento.setHours(0, 0, 0, 0);
            const diffTiempo = fechaVencimiento - fechaHoy;
            const diffDias = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

            // Contamos para el asistente
            if (diffDias < 0) vencidosContador++;
            else if (diffDias === 0) hoyContador++;

            return {
                nombre: `${p.clientes.nombre} ${p.clientes.apellido}`,
                monto: Math.round(p.valor_cuota),
                diasFaltantes: diffDias,
                estadoOriginal: p.estado_prestamo
            };
        });

        // 3. Ordenar por fecha
        todosLosCobros.sort((a, b) => a.diasFaltantes - b.diasFaltantes);

        // 4. ACTUALIZAR EL MENSAJE DEL ASISTENTE
        if (msgContenedor) {
            let mensaje = "";
            if (vencidosContador > 0 && hoyContador > 0) {
                mensaje = `Hola <strong>${primerNombreUsuario}</strong>, tienes <span class="urgente">${vencidosContador} atrasados</span> y <span class="hoy">${hoyContador} para hoy</span>.`;
            } else if (vencidosContador > 0) {
                mensaje = `Atención <strong>${primerNombreUsuario}</strong>, tienes <span class="urgente">${vencidosContador} cobros vencidos</span>.`;
            } else if (hoyContador > 0) {
                mensaje = `¡Hola <strong>${primerNombreUsuario}</strong>! Tienes <span class="hoy">${hoyContador} cobros para hoy</span>.`;
            } else {
                mensaje = `Todo al día, <strong>${primerNombreUsuario}</strong>. No hay cobros urgentes hoy.`;
            }
            msgContenedor.innerHTML = mensaje;
        }

        // 5. Renderizar lista inicial (primeros 5)
        renderizarListaCobros(todosLosCobros.slice(0, 5));

        // 6. Configurar botón "Ver todos"
        configurarBotonVerTodos();

    } catch (err) {
        console.error("Error en proximos cobros:", err);
    }
}

// Función auxiliar para el botón (puedes ponerla debajo)
function configurarBotonVerTodos() {
    const btnVerTodos = document.getElementById('btn-ver-todos-cobros');
    if (!btnVerTodos) return;

    let expandido = false;

    if (todosLosCobros.length > 5) {
        btnVerTodos.style.display = 'block';
        btnVerTodos.innerHTML = `Ver todos <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        btnVerTodos.onclick = () => {
            if (expandido) {
                renderizarListaCobros(todosLosCobros.slice(0, 5));
                btnVerTodos.innerHTML = `Ver todos <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                expandido = false;
            } else {
                renderizarListaCobros(todosLosCobros);
                btnVerTodos.innerHTML = `Ver menos <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
                expandido = true;
            }
        };
    } else {
        btnVerTodos.style.display = 'none';
    }
}



// Función auxiliar para que el saludo cambie solo
function obtenerSaludoSegunHora() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "¡Buen día";
    if (hora >= 12 && hora < 19) return "¡Buenas tardes";
    return "¡Buenas noches";
}







// 3. RESUMEN DE CAPITAL (DINÁMICO)
async function cargarResumenCapital() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;
        
        if (!userId) return;

        const { data: prestamos, error } = await supabaseClient
            .from('prestamos')
            .select('monto_prestado, total_devolver, cuotas_pagadas, valor_cuota, estado_prestamo')
            .eq('user_id', userId);

        if (error) throw error;

        let totalMontoPrestadoHistorico = 0; 
        let totalRecaudadoHistorico = 0;    
        let totalAdeudaActual = 0;          
        let totalMontoPrestadoActivo = 0; // Agregado para contar solo préstamos no finalizados

        prestamos.forEach(p => {
            const monto = Number(p.monto_prestado) || 0;
            const valorCuota = Number(p.valor_cuota) || 0;
            const cuotasPagadas = Number(p.cuotas_pagadas) || 0;
            const totalDevolver = Number(p.total_devolver) || 0;

            const recaudado = cuotasPagadas * valorCuota;
            totalMontoPrestadoHistorico += monto;
            totalRecaudadoHistorico += recaudado;

            if (p.estado_prestamo !== 'finalizado') {
                const adeuda = totalDevolver - recaudado;
                if (adeuda > 0) totalAdeudaActual += adeuda;
                
                // Sumamos el capital prestado solo de los no finalizados
                totalMontoPrestadoActivo += monto;
            }
        });

        // Fórmula: Capital en mano = (Lo que puse al inicio - Lo que salió en préstamos + Lo que ya cobré)
        const capitalTotalActual = CAPITAL_TOTAL_DINAMICO - totalMontoPrestadoHistorico + totalRecaudadoHistorico;

        animarContador('total-fijo', CAPITAL_TOTAL_DINAMICO);
        animarContador('total-disponible', capitalTotalActual);
        // animarContador('total-prestado', totalMontoPrestadoActivo); // Usamos la variable de préstamos activos
        animarContador('total-recuperar', totalAdeudaActual);

        // Novedades para las cards: Proyección
        const proyeccion = capitalTotalActual + totalAdeudaActual;
        const trendProyeccionEl = document.getElementById('trend-proyeccion');
        if (trendProyeccionEl) {
            trendProyeccionEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> Proyección final: ${formatearMoneda(proyeccion)}`;
        }

        // Actualizar datos del modal de proyección
        const gananciaFutura = proyeccion - CAPITAL_TOTAL_DINAMICO;
        const modalProyeccionFinal = document.getElementById('modal-proyeccion-final');
        const modalGananciaFutura = document.getElementById('modal-ganancia-futura');
        if (modalProyeccionFinal) modalProyeccionFinal.textContent = formatearMoneda(proyeccion);
        if (modalGananciaFutura) {
            if (gananciaFutura >= 0) {
                modalGananciaFutura.textContent = `+${formatearMoneda(gananciaFutura)}`;
                modalGananciaFutura.style.color = "var(--exito-texto)";
            } else {
                modalGananciaFutura.textContent = formatearMoneda(gananciaFutura);
                modalGananciaFutura.style.color = "var(--peligro-texto)";
            }
        }

    } catch (err) {
        console.error("Error en resumen:", err.message);
    }
}







// ------------- FUNCIÓN 2: GRÁFICO DE TORTA --------------------
// ------------- FUNCIÓN 2: GRÁFICO DE TORTA --------------------

let chartInstancia = null;

async function cargarGraficoClientes() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;

        if (!userId) return;

        const { data: clientes, error } = await supabaseClient
            .from('clientes')
            .select('estado')
            .eq('user_id', userId);

        if (error) throw error;

        const conteo = { aldia: 0, atrasado: 0, sinprestamo: 0, porvencer: 0 };
        let totalReal = 0; // Nueva variable para contar solo los que no están finalizados

        clientes.forEach(c => {
            const est = (c.estado || "").toLowerCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // --- CORRECCIÓN: Si el estado es "finalizado", lo saltamos ---
            if (est.includes("finalizado")) {
                return; // No suma a ninguna categoría ni al total
            }

            if (est.includes("atrasado") || est.includes("mora")) {
                conteo.atrasado++;
                totalReal++;
                } else if (est.includes("vencer") || est.includes("manana") || est.includes("hoy") || est.includes("proximo")) {
                    conteo.porvencer++;
                totalReal++;
            } else if (est.includes("dia") || est.includes("activo")) {
                conteo.aldia++;
                totalReal++;
            } else {
                conteo.sinprestamo++;
                totalReal++;
            }
        });

        // Actualizamos el centro de la torta con el nuevo total filtrado
        document.getElementById('torta-total').innerText = totalReal;
        
        document.getElementById('num-aldia').innerText = conteo.aldia;
        document.getElementById('num-atrasados').innerText = conteo.atrasado;
        document.getElementById('num-sinprestamo').innerText = conteo.sinprestamo;
        document.getElementById('num-porvencer').innerText = conteo.porvencer;

        const canvas = document.getElementById('chartClientes');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (chartInstancia) chartInstancia.destroy();

        chartInstancia = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Al día', 'Atrasados', 'Sin préstamo', 'Próximos a Vencer'],
                datasets: [{
                    data: [conteo.aldia, conteo.atrasado, conteo.sinprestamo, conteo.porvencer],
                    backgroundColor: ['#3b82f6', '#ef4444', '#6b7280', '#eab308'],
                    borderWidth: 0,
                }]
            },
            options: {
                cutout: '70%',
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false
            }
        });

    } catch (err) {
        console.error("Error en gráfico:", err.message);
    }
}





// ------------- FUNCIÓN 3: PROXIMOS COBROS --------------------
// ------------- FUNCIÓN 3: PROXIMOS COBROS --------------------



// Nueva función auxiliar para renderizar
function renderizarListaCobros(lista) {
    const listaContenedor = document.getElementById('lista-cobros');
    listaContenedor.innerHTML = "";

    lista.forEach(c => {
        let textoFecha = "";
        let esUrgente = false;
        let esAlerta = false;
        let esNormal = false;

        if (c.diasFaltantes < 0 || c.estadoOriginal.toLowerCase().includes("atrasado")) {
            textoFecha = "Vencido";
            esUrgente = true;
        } else if (c.diasFaltantes === 0) {
            textoFecha = "Vence hoy";
            esAlerta = true;
        } else if (c.diasFaltantes === 1) {
            textoFecha = "Vence mañana";
            esAlerta = true;
        } else {
            textoFecha = `Vence en ${c.diasFaltantes} días`;
            esNormal = true;
        }

        const iconoReloj = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        const iconoCalendario = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

        const li = document.createElement('li');
        li.className = `cobro-item ${esUrgente ? 'cobro-item--urgente' : ''} ${esAlerta ? 'cobro-item--alerta' : ''} ${esNormal ? 'cobro-item--normal' : ''}`;
        
        li.innerHTML = `
            <div class="cobro-info">
                <span class="cobro-nombre">${c.nombre}</span>
                <span class="cobro-fecha ${esUrgente ? 'cobro-fecha--urgente' : ''} ${esAlerta ? 'cobro-fecha--alerta' : ''} ${esNormal ? 'cobro-fecha--normal' : ''}">
                    ${(esUrgente || esAlerta) ? iconoReloj : ''} 
                    ${esNormal ? iconoCalendario : ''} 
                    ${textoFecha}
                </span>
            </div>
            <span class="cobro-monto ${esUrgente ? 'cobro-monto--urgente' : ''} ${esAlerta ? 'cobro-monto--alerta' : ''} ${esNormal ? 'cobro-monto--normal' : ''}">
                ${formatearMoneda(c.monto)}
            </span>
        `;

        
        listaContenedor.appendChild(li);

        
    });
}



// ------------------- FUNCIÓN 4: TOP CLIENTES -------------------
// ------------------- FUNCIÓN 4: TOP CLIENTES -------------------
async function cargarTopClientes() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;

        if (!userId) return;

        // 1. Traemos los préstamos que NO están finalizados
        const { data: prestamos, error } = await supabaseClient
            .from('prestamos')
            .select(`
                monto_prestado,
                estado_prestamo,
                clientes (nombre, apellido)
            `)
            .eq('user_id', userId)
            .neq('estado_prestamo', 'finalizado');

        if (error) throw error;

        // 2. Agrupamos por cliente (por si un cliente tiene más de un préstamo activo)
        const acumuladoClientes = {};

        prestamos.forEach(p => {
            if (!p.clientes) return;
            const nombreCompleto = `${p.clientes.nombre} ${p.clientes.apellido}`;
            
            if (!acumuladoClientes[nombreCompleto]) {
                acumuladoClientes[nombreCompleto] = 0;
            }
            // Sumamos el monto prestado original
            acumuladoClientes[nombreCompleto] += Number(p.monto_prestado);
        });

        // 3. Convertimos a array, ordenamos de mayor a menor y tomamos el Top 5
        const topArray = Object.entries(acumuladoClientes)
            .map(([nombre, total]) => ({ nombre, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // 4. Renderizamos en el HTML
        const listaContenedor = document.getElementById('lista-top-clientes');
        if (!listaContenedor) return;
        
        listaContenedor.innerHTML = "";

topArray.forEach((item, index) => {
    const iniciales = item.nombre
        .split(' ')
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    const li = document.createElement('li');
    li.className = 'top-item';
    li.style.cursor = 'pointer';  // ← AGREGAR
    li.innerHTML = `
        <div class="top-perfil">
            <div class="top-avatar">${iniciales}</div>
            <div class="top-detalles">
                <span class="top-nombre">${item.nombre}</span>
                <span class="top-rank">#${index + 1}</span>
            </div>
        </div>
        <span class="top-monto">${formatearMoneda(item.total)}</span>
    `;
    
    // ← AGREGAR ESTO
    li.onclick = () => {
        window.location.href = `clientesyprestamos.html?cliente=${encodeURIComponent(item.nombre)}`;
    };
    
    listaContenedor.appendChild(li);
});
        if (topArray.length === 0) {
            listaContenedor.innerHTML = `<p style="color:gray; font-size:12px; text-align:center; padding: 20px;">No hay préstamos activos</p>`;
        }

    } catch (err) {
        console.error("Error en top clientes:", err.message);
    }
}



// Función para animar los números
function animarContador(id, valorFinal, duracion = 1000) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    let inicio = 0;
    const pasos = 60; // 60 frames por segundo
    const incremento = valorFinal / (duracion / (1000 / pasos));
    
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const actualizar = () => {
        inicio += incremento;
        if (inicio < valorFinal) {
            elemento.textContent = formatoMoneda.format(Math.floor(inicio));
            requestAnimationFrame(actualizar);
        } else {
            elemento.textContent = formatoMoneda.format(valorFinal);
        }
    };

    actualizar();
}



document.addEventListener('DOMContentLoaded', () => {
    // 1. DISPARO ÚNICO DE LA APP
    inicializarApp();

        // --- FORMATEO DINÁMICO DEL INPUT DE CAPITAL ---
    const inputCapitalValor = document.getElementById('input-capital-valor');

    if (inputCapitalValor) {
        inputCapitalValor.addEventListener('input', (e) => {
            // 1. Obtener solo los números
            let valor = e.target.value.replace(/\D/g, "");
            
            // 2. Formatear con puntos de miles (es-AR usa el punto)
            if (valor) {
                valor = parseInt(valor).toLocaleString('es-AR');
                e.target.value = valor;
            } else {
                e.target.value = "";
            }
        });
    }

    // 2. LÓGICA DEL MODAL DE CAPITAL
    const cardCapitalFijo = document.getElementById('card-capital-fijo');
    const modalCapital = document.getElementById('modal-capital');
    const formCapital = document.getElementById('form-capital');
    const btnCerrarModal = document.getElementById('close-capital');

    if(cardCapitalFijo) {
        cardCapitalFijo.onclick = () => {
            // Al abrir, ya lo mostramos formateado
            document.getElementById('input-capital-valor').value = CAPITAL_TOTAL_DINAMICO.toLocaleString('es-AR');
            modalCapital.style.display = 'flex';
        };
    }

    if(btnCerrarModal) btnCerrarModal.onclick = () => modalCapital.style.display = 'none';

    // 2B. LÓGICA DEL MODAL DE PROYECCIÓN
    const cardCapitalTotal = document.getElementById('card-capital-total');
    const modalProyeccion = document.getElementById('modal-proyeccion');
    const btnCloseProyeccion = document.getElementById('close-proyeccion');
    const btnCerrarModalProyeccion = document.getElementById('btn-cerrar-modal-proyeccion');

    if(cardCapitalTotal) {
        cardCapitalTotal.onclick = () => {
            modalProyeccion.style.display = 'flex';
        };
    }
    
    if(btnCloseProyeccion) btnCloseProyeccion.onclick = () => modalProyeccion.style.display = 'none';
    if(btnCerrarModalProyeccion) btnCerrarModalProyeccion.onclick = () => modalProyeccion.style.display = 'none';

    if(formCapital) {
        formCapital.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // LIMPIEZA CLAVE: Quitamos los puntos antes de convertir a número
            const valorConPuntos = document.getElementById('input-capital-valor').value;
            const nuevoMonto = Number(valorConPuntos.replace(/\./g, '')); 

            const sesion = JSON.parse(localStorage.getItem("usuarioLogueado"));
            const authId = sesion?.auth_user_id || sesion?.user?.id || sesion?.id;

            const { error } = await supabaseClient
                .from('usuarios')
                .update({ capital_inicial: nuevoMonto })
                .eq('auth_user_id', authId); 

            if (!error) {
                CAPITAL_TOTAL_DINAMICO = nuevoMonto;
                localStorage.setItem("capitalInicial", nuevoMonto); // Sincronizamos local
                
                modalCapital.style.display = 'none';
                document.querySelector('.card-capital')?.classList.remove('highlight-pulse');
                
                // Abrir el siguiente paso si es onboarding
                const modalGuia = document.getElementById("modal-guia-clientes");
                if (modalGuia && localStorage.getItem("onboardingCompleto") !== "true") {
                    modalGuia.style.display = "flex";
                }

                cargarResumenCapital(); 
            } else {
                alert("Error al actualizar: " + error.message);
            }
        });
    }
    // 3. MENÚ HAMBURGUESA
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.onclick = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        };
        overlay.onclick = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };
    }

    // 4. CAMBIO DE TEMA
    const btnTema = document.getElementById('btn-tema');
    if (btnTema) {
        // Cargar tema guardado
        if (localStorage.getItem('tema') === 'oscuro') document.body.classList.add('tema-oscuro');
        
        btnTema.onclick = () => {
            const esOscuro = document.body.classList.toggle('tema-oscuro');
            localStorage.setItem('tema', esOscuro ? 'oscuro' : 'claro');
            cargarGraficoClientes(); // Recargar gráfico por los colores
        };
    }

    // 5. CIERRE DE SESIÓN
    const btnLogout = document.getElementById('btn-logout');
    const modalLogout = document.getElementById('modal-logout');
    const btnConfirmarLogout = document.getElementById('btn-confirmar-logout');
    const btnCancelarLogout = document.getElementById('btn-cancelar-logout');

    if (btnCancelarLogout) {
        btnCancelarLogout.onclick = () => {
            modalLogout.style.display = 'none';
        };
    }

    if (btnLogout) btnLogout.onclick = () => modalLogout.style.display = 'flex';
    if (btnConfirmarLogout) {
        btnConfirmarLogout.onclick = () => {
            localStorage.removeItem("usuarioLogueado");
            window.location.href = "index.html";
        };
    }
});





// ===============================
// REFERENCIAS
// ===============================
const inputCapital = document.getElementById("input-capital-valor");
const modalBienvenida = document.getElementById("modal-bienvenida");
const modalCapital = document.getElementById("modal-capital");
const modalGuia = document.getElementById("modal-guia-clientes");
const cardCapital = document.getElementById("card-capital-fijo");

// ===============================
// FORMATEO DISPLAY
// ===============================
function formatearMonto(numero) {
    return "$ " + numero.toLocaleString("es-AR");
}

// ===============================
// INICIO (CONTROL ONBOARDING) - CORREGIDO
// ===============================
window.addEventListener("load", function () {
     // Siempre ocultamos el modal aquí, lo maneja inicializarApp()
    modalBienvenida.style.display = "none";
    const capitalGuardado = localStorage.getItem("capitalInicial");
    const onboardingCompleto = localStorage.getItem("onboardingCompleto");

    // SI ya completó el onboarding O tiene capital > 0, NO mostrar modal
    if (onboardingCompleto === "true" || (capitalGuardado && parseInt(capitalGuardado, 10) > 0)) {
        modalBienvenida.style.display = "none";
        
        if (capitalGuardado) {
            const numero = parseInt(capitalGuardado, 10);
            document.getElementById("total-fijo").textContent = formatearMonto(numero);
        }
    } else {
        // Solo mostrar si es realmente la primera vez y no hay capital
        modalBienvenida.style.display = "flex";
    }
});

// ===============================
// PASO 1 → CERRAR BIENVENIDA
// ===============================
document.getElementById("btn-comenzar-onboarding").addEventListener("click", function () {
    modalBienvenida.style.display = "none";
    cardCapital.classList.add("highlight");
});

// ===============================
// PASO 2 → CLICK EN CARD
// ===============================
cardCapital.addEventListener("click", function () {
    modalCapital.style.display = "flex";
    cardCapital.classList.remove("highlight");
});

// ===============================
// PASO 3 → GUARDAR CAPITAL
// ===============================
document.getElementById("form-capital").addEventListener("submit", function (e) {
    e.preventDefault();

    let numero = parseInt(inputCapital.value, 10) || 0;

    // guardar correctamente
    localStorage.setItem("capitalInicial", numero);
    localStorage.setItem("onboardingCompleto", "true");

    // actualizar UI
    document.getElementById("total-fijo").textContent = formatearMonto(numero);

    // cerrar modal
    modalCapital.style.display = "none";

    // abrir guía
    modalGuia.style.display = "flex";
});

// ===============================
// PASO 4 → FINALIZAR (CORREGIDO)
// ===============================
document.getElementById("btn-ir-clientes").addEventListener("click", function () {
    // 1. Guardamos la bandera para que no se vuelva a abrir
    localStorage.setItem("onboardingCompleto", "true");

    // 2. Cerramos el modal correcto (modal-guia-clientes)
    const modalGuia = document.getElementById("modal-guia-clientes"); 
    if (modalGuia) {
        modalGuia.style.display = "none";
    }

    // 3. Por seguridad, ocultamos también el primero si estuviera abierto
    const modalBienvenida = document.getElementById("modal-bienvenida");
    if (modalBienvenida) {
        modalBienvenida.style.display = "none";
    }
});