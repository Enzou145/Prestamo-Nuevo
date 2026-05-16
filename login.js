const SUPABASE_URL = "https://ljsnvsvlnazprcfhoytc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ELqT_WM7MrJonyYE6L6P1Q_kmAPw3bB";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formLogin = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnLogin = document.getElementById("btnLogin");
const togglePassword = document.getElementById("togglePassword");

// Ver/Ocultar Contraseña
togglePassword.addEventListener('click', () => {
    const isPass = passwordInput.type === 'password';
    passwordInput.type = isPass ? 'text' : 'password';
    togglePassword.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}"></i>`;
    lucide.createIcons();
});

// Login
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    btnLogin.disabled = true;
    btnLogin.innerHTML = `<span>Ingresando...</span>`;
    mensajeLogin.style.display = "none";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value.trim()
        });

        if (error) throw new Error("Credenciales inválidas.");

        // Buscamos perfil
        const { data: perfil, error: pErr } = await supabaseClient
            .from("usuarios")
            .select("*")
            .eq("auth_user_id", data.user.id)
            .single();

        if (pErr || !perfil) {
            await supabaseClient.auth.signOut();
            throw new Error("No tienes acceso de administrador.");
        }

        localStorage.setItem("usuarioLogueado", JSON.stringify(perfil));
        window.location.href = "inicio.html";

    } catch (err) {
        mensajeLogin.textContent = err.message;
        mensajeLogin.style.display = "block";
        btnLogin.disabled = false;
        btnLogin.innerHTML = `<span>Ingresar</span> <i data-lucide="arrow-right"></i>`;
        lucide.createIcons();
    }
});