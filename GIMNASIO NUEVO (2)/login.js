// 1. CONFIGURACIÓN
const supabaseUrl = 'https://mhipqrjxnyykrwfjquxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaXBxcmp4bnl5a3J3ZmpxdXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzYwNzIsImV4cCI6MjA5MzkxMjA3Mn0.U8nEWlt2ARh7Sq0ZX_boxXQGgbkuopAJqLtJcegPh34';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);


const formLogin = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnLogin = document.getElementById("btnLogin");

// 2. Función ÚNICA para mostrar errores
function mostrarNotificacionError(msj) {
    mensajeLogin.textContent = msj;
    mensajeLogin.style.opacity = "1";
    mensajeLogin.style.color = "#ff4444";
    // Si añadiste el CSS de la animación anterior:
    mensajeLogin.classList.remove("error-active");
    void mensajeLogin.offsetWidth; // Truco para reiniciar animación
    mensajeLogin.classList.add("error-active");
}

// 3. Proceso de Login
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // 1. Limpiar UI y bloquear botón
    mensajeLogin.textContent = "";
    mensajeLogin.style.opacity = "0";
    btnLogin.disabled = true;
    const textoOriginal = btnLogin.innerHTML;
    btnLogin.innerHTML = "<span>Verificando...</span>";

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    try {
        // 2. Intento de Login
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        // 3. SI HAY ERROR DE CREDENCIALES (Aquí entra el error 400)
        if (authError) {
            console.log("Error detectado:", authError); // Para que lo veas en consola
            
            // Mensajes amigables
            if (authError.status === 400) {
                throw new Error("El correo o la contraseña no son válidos.");
            } else {
                throw new Error(authError.message);
            }
        }

        // 4. Buscar gimnasio (Si el login fue exitoso)
        const { data: gimnasio, error: gymError } = await supabaseClient
            .from("gimnasios")
            .select("*")
            .eq("usuario_id", authData.user.id)
            .single();

        if (gymError || !gimnasio) {
            await supabaseClient.auth.signOut();
            throw new Error("Acceso denegado: No tienes un gimnasio asociado.");
        }

        // 5. Todo bien: Guardar y entrar
        localStorage.setItem("gimnasio_id", gimnasio.id);
        window.location.href = "inicio.html";

    } catch (err) {
        // 6. MOSTRAR ERROR EN EL HTML (Asegúrate de que el ID exista)
        console.error("Error en catch:", err.message);
        
        mensajeLogin.textContent = err.message;
        mensajeLogin.style.opacity = "1";
        mensajeLogin.style.color = "#ff4444";
        mensajeLogin.style.display = "block"; // Forzamos que se vea
        
        // Animación de sacudida
        mensajeLogin.classList.remove("error-active");
        void mensajeLogin.offsetWidth;
        mensajeLogin.classList.add("error-active");

        // Liberar botón
        btnLogin.disabled = false;
        btnLogin.innerHTML = textoOriginal;
    }
});