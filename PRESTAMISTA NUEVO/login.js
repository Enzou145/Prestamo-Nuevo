const SUPABASE_URL = "https://tztuukgwhsmtuhtinsod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vH8kgFdKWHCOIaQAhfZglQ_ybkjmNQO";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formLogin = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnLogin = document.getElementById("btnLogin");

function mostrarMensaje(texto, esError = true) {
    mensajeLogin.textContent = texto;
    mensajeLogin.style.color = esError ? "#ef4444" : "#22c55e";
}

async function obtenerPerfilUsuario(authUserId) {
    const { data, error } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();

    if (error) {
        console.error("Error buscando perfil:", error);
        return null;
    }

    return data;
}

async function verificarSesionActiva() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) return;

    const perfil = await obtenerPerfilUsuario(data.user.id);

    if (!perfil) {
        await supabaseClient.auth.signOut();
        mostrarMensaje("Tu usuario no está vinculado al sistema.");
        return;
    }

    if (perfil.estado !== "Activo") {
        await supabaseClient.auth.signOut();
        mostrarMensaje("Tu usuario está inactivo.");
        return;
    }

    localStorage.setItem("usuarioLogueado", JSON.stringify(perfil));
    window.location.href = "clientes.html";
}

formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        mostrarMensaje("Completá email y contraseña.");
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";
    mostrarMensaje("");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error || !data?.user) {
        console.error("Error login:", error);
        mostrarMensaje("Email o contraseña incorrectos.");
        btnLogin.disabled = false;
        btnLogin.textContent = "Ingresar";
        return;
    }

    const perfil = await obtenerPerfilUsuario(data.user.id);

    if (!perfil) {
        await supabaseClient.auth.signOut();
        mostrarMensaje("El usuario existe en login pero no en la tabla usuarios.");
        btnLogin.disabled = false;
        btnLogin.textContent = "Ingresar";
        return;
    }

    if (perfil.estado !== "Activo") {
        await supabaseClient.auth.signOut();
        mostrarMensaje("Tu usuario está inactivo.");
        btnLogin.disabled = false;
        btnLogin.textContent = "Ingresar";
        return;
    }

    localStorage.setItem("usuarioLogueado", JSON.stringify(perfil));
    window.location.href = "clientes.html";
});

document.addEventListener("DOMContentLoaded", async () => {
    await verificarSesionActiva();
});