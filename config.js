// config.js
const SUPABASE_URL = "https://ljsnvsvlnazprcfhoytc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ELqT_WM7MrJonyYE6L6P1Q_kmAPw3bB";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
if (!usuarioLogueado) window.location.href = "index.html";