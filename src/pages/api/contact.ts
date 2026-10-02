import type { APIRoute } from 'astro';

export const prerender = false;

const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? '').replace(/[<>\u0000-\u001F]/g, '').trim().slice(0, max);
const allowedServices = ['Diseño y desarrollo web', 'Diseño para redes', 'Vídeo / reel', 'Necesito orientación'];

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  if (clean(data.get('website'), 200)) return new Response(JSON.stringify({ ok: true }), { status: 202 });
  const startedAt = Number(data.get('startedAt'));
  if (!startedAt || Date.now() - startedAt < 2500) return Response.json({ message: 'El formulario se envió demasiado rápido. Inténtalo de nuevo.' }, { status: 429 });
  const payload = {
    name: clean(data.get('name'), 80), email: clean(data.get('email'), 160), company: clean(data.get('company'), 100), whatsapp: clean(data.get('whatsapp'), 40),
    service: clean(data.get('service'), 60), budget: clean(data.get('budget'), 100), message: clean(data.get('message'), 3000), privacy: data.get('privacy') === 'on', submittedAt: new Date().toISOString(),
  };
  const fields: Record<string, string> = {};
  if (payload.name.length < 2) fields.name = 'Escribe tu nombre.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) fields.email = 'Escribe un email válido.';
  if (!allowedServices.includes(payload.service)) fields.service = 'Selecciona un servicio.';
  if (payload.message.length < 20) fields.message = 'Cuéntanos un poco más (mínimo 20 caracteres).';
  if (!payload.privacy) fields.privacy = 'Necesitamos tu aceptación para gestionar el mensaje.';
  if (Object.keys(fields).length) return Response.json({ message: 'Hay campos que necesitan revisión.', fields }, { status: 400 });

  if (import.meta.env.CONTACT_PROVIDER !== 'webhook' || !import.meta.env.CONTACT_WEBHOOK_URL) {
    return Response.json({ message: 'El envío todavía no está configurado. No se ha enviado ni guardado tu mensaje.' }, { status: 503 });
  }
  try {
    const response = await fetch(import.meta.env.CONTACT_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(import.meta.env.CONTACT_WEBHOOK_TOKEN ? { Authorization: `Bearer ${import.meta.env.CONTACT_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Contact provider error', error);
    return Response.json({ message: 'El proveedor no aceptó el mensaje. No se ha mostrado un éxito falso; inténtalo de nuevo más tarde.' }, { status: 502 });
  }
};
