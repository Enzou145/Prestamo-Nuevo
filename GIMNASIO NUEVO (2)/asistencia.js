const supabaseUrl = 'https://mhipqrjxnyykrwfjquxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaXBxcmp4bnl5a3J3ZmpxdXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzYwNzIsImV4cCI6MjA5MzkxMjA3Mn0.U8nEWlt2ARh7Sq0ZX_boxXQGgbkuopAJqLtJcegPh34';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const GIMNASIO_ID = localStorage.getItem("gimnasio_id") || '83e9348c-9aa8-4c64-9207-f78adc8c30fe';

document.addEventListener('DOMContentLoaded', () => {

    const formAsistencia = document.getElementById('form-asistencia');
    const inputAsistencia = document.getElementById('input-asistencia');
    const dropdownAsistencia = document.getElementById('lista-clientes-dropdown');
    
    const alertaIngreso = document.getElementById('alerta-ingreso');
    const alertaTitulo = document.getElementById('alerta-titulo');
    const alertaMensaje = document.getElementById('alerta-mensaje');
    const alertaIcono = document.querySelector('.alerta-icono svg');
    const tablaAsistencia = document.getElementById('tabla-asistencia');
    const totalIngresosEl = document.querySelector('.tarjeta-valorr');
    
    const previewSocio = document.getElementById('preview-socio');
    const previewInicial = document.getElementById('preview-inicial');
    const previewNombre = document.getElementById('preview-nombre');
    const previewDni = document.getElementById('preview-dni');
    const previewBadge = document.getElementById('preview-badge');

    const iconoExito = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
    const iconoError = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';

    let timeoutBuscador = null;

    // Actualiza el texto de la fecha de hoy en el header
    const fechaHoyText = document.querySelector('.fecha-hoy p');
    if (fechaHoyText) {
        const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        fechaHoyText.textContent = new Date().toLocaleDateString('es-ES', opciones);
    }

    // --- CARGAR ASISTENCIAS ---
    async function cargarAsistencias(fechaStr) {
        // fechaStr en formato YYYY-MM-DD
        const startOfDay = new Date(`${fechaStr}T00:00:00`);
        const endOfDay = new Date(`${fechaStr}T23:59:59.999`);

        const { data, error } = await supabaseClient
            .from('asistencias')
            .select(`
                id,
                fecha_hora_ingreso,
                socios (id, nombre, apellido, telefono, membresias_socios (estado, planes(nombre)))
            `)
            .eq('gimnasio_id', GIMNASIO_ID)
            .gte('fecha_hora_ingreso', startOfDay.toISOString())
            .lte('fecha_hora_ingreso', endOfDay.toISOString())
            .order('fecha_hora_ingreso', { ascending: false });

        const contenedorFilas = document.getElementById('contenedor-filas-asistencia');
        contenedorFilas.innerHTML = '';
        
        // Calcular fecha local para comparar "hoy" correctamente
        const hoyLocal = new Date();
        const yyyy = hoyLocal.getFullYear();
        const mm = String(hoyLocal.getMonth() + 1).padStart(2, '0');
        const dd = String(hoyLocal.getDate()).padStart(2, '0');
        const hoyStrLocal = `${yyyy}-${mm}-${dd}`;

        // Si la fecha es hoy, actualiza la tarjeta
        if (fechaStr === hoyStrLocal && totalIngresosEl) {
            totalIngresosEl.textContent = data ? data.length : 0;
        }

        if (error) {
            console.error("Error al cargar asistencias", error);
            return;
        }

        if (data.length === 0) {
            contenedorFilas.innerHTML = '<p style="padding: 1rem; color: #888;">No hay ingresos registrados para esta fecha.</p>';
            return;
        }

        data.forEach(asistencia => {
            const socio = Array.isArray(asistencia.socios) ? asistencia.socios[0] : asistencia.socios;
            if (!socio) return;
            
            const nombreCompleto = `${socio.nombre} ${socio.apellido}`;
            const iniciales = (socio.nombre.charAt(0) + socio.apellido.charAt(0)).toUpperCase();
            
            const fechaIngreso = new Date(asistencia.fecha_hora_ingreso);
            const hora = fechaIngreso.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            
            let estado = "SIN PLAN";
            let claseEstado = "vencido";
            
            if (socio.membresias_socios && socio.membresias_socios.length > 0) {
                const mem = Array.isArray(socio.membresias_socios) ? socio.membresias_socios[0] : socio.membresias_socios;
                estado = mem.estado ? mem.estado.toUpperCase() : "VENCIDA";
                claseEstado = estado === 'ACTIVA' ? 'activo' : 'vencido';
            }

            const html = `
                <div class="cliente">
                    <div class="socio-info">
                        <div class="inicial">${iniciales}</div>
                        <div class="nombre-correo">
                            <h1>${nombreCompleto}</h1>
                            <p>${socio.telefono || 'Sin Teléfono'}</p>
                        </div>
                    </div>
                    <div class="vencimiento-info">
                        <h1>${hora} hs</h1>
                        <p>Ingreso</p>
                    </div>
                    <div>
                        <div class="estado ${claseEstado}">${estado}</div>
                    </div>
                </div>
            `;
            contenedorFilas.insertAdjacentHTML('beforeend', html);
        });
    }

    // Inicializar hoy
    const filtroFecha = document.getElementById('filtro-fecha-asistencia');
    const tituloTabla = document.getElementById('titulo-tabla-asistencia');
    
    // Obtener hoy en zona local
    const hoyParaInit = new Date();
    const initY = hoyParaInit.getFullYear();
    const initM = String(hoyParaInit.getMonth() + 1).padStart(2, '0');
    const initD = String(hoyParaInit.getDate()).padStart(2, '0');
    const initHoyStr = `${initY}-${initM}-${initD}`;

    if (filtroFecha) {
        filtroFecha.value = initHoyStr;
        cargarAsistencias(initHoyStr);

        filtroFecha.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === initHoyStr) {
                tituloTabla.textContent = "HISTORIAL DE ASISTENCIAS DE HOY";
            } else {
                const arr = val.split('-');
                tituloTabla.textContent = `HISTORIAL DE ASISTENCIAS - ${arr[2]}/${arr[1]}/${arr[0]}`;
            }
            cargarAsistencias(val);
        });
    }

    // --- BÚSQUEDA DE SOCIOS ---
    async function buscarSocios(texto) {
        let query = supabaseClient
            .from('socios')
            .select(`
                id, nombre, apellido, telefono,
                membresias_socios (
                    id, estado, fecha_vencimiento, planes (nombre)
                )
            `)
            .eq('gimnasio_id', GIMNASIO_ID)
            .limit(50);

        if (texto) {
            query = query.or(`nombre.ilike.%${texto}%,apellido.ilike.%${texto}%`);
        } else {
            query = query.order('nombre', { ascending: true });
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error buscando socios", error);
            return;
        }

        dropdownAsistencia.innerHTML = '';
        if (data.length === 0) {
            dropdownAsistencia.innerHTML = '<div class="autocomplete-item"><span>No se encontraron socios</span></div>';
            dropdownAsistencia.classList.add('activo');
            return;
        }

        data.forEach(socio => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            const nombreCompleto = `${socio.nombre} ${socio.apellido}`;
            item.innerHTML = `
                <span class="autocomplete-nombre">${nombreCompleto}</span>
                <span class="autocomplete-dni">${socio.telefono || 'Sin Teléfono'}</span>
            `;
            
            item.addEventListener('click', () => {
                inputAsistencia.value = nombreCompleto;
                dropdownAsistencia.classList.remove('activo');
                mostrarPreviewSocio(socio);
            });
            
            dropdownAsistencia.appendChild(item);
        });
        dropdownAsistencia.classList.add('activo');
    }

    inputAsistencia.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        previewSocio.classList.add('oculta'); // Ocultar preview al escribir
        
        clearTimeout(timeoutBuscador);
        timeoutBuscador = setTimeout(() => {
            buscarSocios(val);
        }, 300);
    });

    inputAsistencia.addEventListener('click', () => {
        if (inputAsistencia.value.trim() === '') {
            buscarSocios('');
        }
    });

    document.addEventListener('click', (e) => {
        if (!inputAsistencia.contains(e.target) && !dropdownAsistencia.contains(e.target)) {
            dropdownAsistencia.classList.remove('activo');
        }
    });

    let socioSeleccionadoParaIngreso = null;

    function mostrarPreviewSocio(socio) {
        socioSeleccionadoParaIngreso = socio;
        
        const nombreCompleto = `${socio.nombre} ${socio.apellido}`;
        previewInicial.textContent = (socio.nombre.charAt(0) + socio.apellido.charAt(0)).toUpperCase();
        previewNombre.textContent = nombreCompleto;
        previewDni.textContent = socio.telefono || 'Sin teléfono';
        
        let estado = 'vencido';
        let textoEstado = 'SIN PLAN / VENCIDO';
        
        if (socio.membresias_socios && socio.membresias_socios.length > 0) {
            const mem = Array.isArray(socio.membresias_socios) ? socio.membresias_socios[0] : socio.membresias_socios;
            
            const hoyIso = new Date().toISOString().split('T')[0];
            const hoyF = new Date(hoyIso + 'T00:00:00');
            const vencObj = new Date(mem.fecha_vencimiento + 'T00:00:00');
            const diffTime = vencObj - hoyF;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const nombrePlan = mem.planes ? (Array.isArray(mem.planes) ? mem.planes[0].nombre : mem.planes.nombre) : 'Plan';

            if (mem.estado === 'Vencida' || diffDays < 0) {
                estado = 'vencido';
                textoEstado = `VENCIDO (${nombrePlan})`;
            } else if (diffDays >= 0 && diffDays <= 3) {
                estado = 'por-vencer';
                textoEstado = `POR VENCER (${nombrePlan})`;
            } else {
                estado = 'activo';
                textoEstado = `ACTIVO (${nombrePlan})`;
            }
        }

        previewSocio.querySelector('.preview-estado').className = 'preview-estado ' + estado;
        previewBadge.textContent = textoEstado;
        previewSocio.classList.remove('oculta');
        
        socioSeleccionadoParaIngreso.estadoComputado = estado;
        socioSeleccionadoParaIngreso.textoEstado = textoEstado;
    }

    // --- REGISTRAR ASISTENCIA ---
    if (formAsistencia) {
        formAsistencia.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!socioSeleccionadoParaIngreso) {
                return;
            }

            const socio = socioSeleccionadoParaIngreso;
            
            if (socio.estadoComputado === 'vencido') {
                alertaIngreso.className = 'alerta-ingreso error';
                alertaTitulo.textContent = 'Acceso Denegado';
                alertaMensaje.textContent = `${socio.nombre} ${socio.apellido} - ${socio.textoEstado}`;
                alertaIcono.innerHTML = iconoError;
                
                setTimeout(() => {
                    alertaIngreso.classList.add('oculta');
                }, 4000);
                return; 
            }

            const { error } = await supabaseClient
                .from('asistencias')
                .insert({
                    gimnasio_id: GIMNASIO_ID,
                    socio_id: socio.id
                });
                
            if (error) {
                console.error("Error registrando asistencia", error);
                alert("Error al registrar: " + error.message);
                return;
            }

            alertaIngreso.className = 'alerta-ingreso exito';
            alertaTitulo.textContent = 'Acceso Autorizado';
            alertaMensaje.textContent = `${socio.nombre} ${socio.apellido} - ${socio.textoEstado}`;
            alertaIcono.innerHTML = iconoExito;
            
            setTimeout(() => {
                alertaIngreso.classList.add('oculta');
            }, 4000);

            inputAsistencia.value = '';
            previewSocio.classList.add('oculta');
            socioSeleccionadoParaIngreso = null;
            
            const filtroVal = document.getElementById('filtro-fecha-asistencia').value;
            cargarAsistencias(filtroVal);
            
            inputAsistencia.focus();
        });
    }

});
