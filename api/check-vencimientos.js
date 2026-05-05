import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    const { data: prestamos, error } = await supabase
      .from('prestamos')
      .select('*, clientes(nombre, apellido)')
      .neq('estado_prestamo', 'finalizado');

    if (error) throw error;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let vencidosHoy = [];

    prestamos.forEach(p => {
      const cuotaSiguiente = (p.cuotas_pagadas || 0) + 1;
      const intervalo = p.intervalo_pago || 1;
      const frecuencia = (p.frecuencia_pago || "diario").toLowerCase();
      let fechaVencimiento = new Date(p.fecha_inicio + 'T00:00:00');
      
      if (frecuencia.includes("diario")) fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo));
      else if (frecuencia.includes("semanal")) fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo * 7));
      else if (frecuencia.includes("mensual")) fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (cuotaSiguiente * intervalo));

      fechaVencimiento.setHours(0, 0, 0, 0);
      if (fechaVencimiento < hoy) vencidosHoy.push(`${p.clientes.nombre} ${p.clientes.apellido}`);
    });

    if (vencidosHoy.length > 0) {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: "69853c34-00e4-46ca-9d17-ef926cf8660f",
          included_segments: ["Total Subscriptions"],
          // Agregamos "en" para que OneSignal no de error
          headings: { 
            "en": "⚠️ Cobros Vencidos",
            "es": "⚠️ Cobros Vencidos" 
          },
          contents: { 
            "en": `Hoy vencen cuotas de: ${vencidosHoy.join(', ')}`,
            "es": `Hoy vencen cuotas de: ${vencidosHoy.join(', ')}` 
          }
        })
    });

      const oneSignalData = await response.json();
      
      // Si OneSignal devuelve un error, lo veremos en el navegador
      if (!response.ok) {
        return res.status(response.status).json({ error: "Error de OneSignal", details: oneSignalData });
      }

      return res.status(200).json({ success: true, informados: vencidosHoy, oneSignal: oneSignalData });
    }

    return res.status(200).json({ success: true, informados: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}