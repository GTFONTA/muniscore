// ============================================================
//  DOMINIO A — Edge Function "votar-anonimo" (la compuerta)
//
//  PASAMANOS CIEGO: su único trabajo es
//   1) verificar QUIÉN vota (mail del JWT del Dominio A),
//   2) confirmar que está en la whitelist y activo,
//   3) resolver/crear su voter_token OPACO,
//   4) reenviar el voto TAL CUAL (sin mirar los campos) a la RPC
//      `votar_por_token` del Dominio B, con el secreto compartido.
//
//  Nunca manda el mail/empresa a B. Nunca devuelve el token al navegador.
//  Agregar preguntas al formulario en el futuro NO toca este archivo:
//  el voto viaja como un JSON que se reenvía sin abrir.
//
//  Variables de entorno (secrets) que usa:
//   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//        → del PROPIO Dominio A (las inyecta Supabase sola).
//   - DOMINIO_B_URL  → la Project URL del Dominio B.
//   - DOMINIO_B_KEY  → la PUBLISHABLE key de B (anon, NO la secret: A no
//                      debe poder leer B, solo escribir vía el secreto).
//   - COMPUERTA_SECRETO  → el mismo valor que en config_compuerta de B.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'metodo' }, 405)

  try {
    const A_URL     = Deno.env.get('SUPABASE_URL')!
    const A_ANON    = Deno.env.get('SUPABASE_ANON_KEY')!
    const A_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const B_URL     = Deno.env.get('DOMINIO_B_URL')!
    const B_KEY     = Deno.env.get('DOMINIO_B_KEY')!
    const SECRETO   = Deno.env.get('COMPUERTA_SECRETO')!

    // 1) ¿Quién es? — mail del usuario autenticado en el Dominio A.
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(A_URL, A_ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await asUser.auth.getUser()
    const email = user?.email?.toLowerCase().trim()
    if (!email) return json({ error: 'no_autenticado' }, 401)

    // 2) ¿Autorizado? + resolver/crear el token (service role, omite RLS).
    const admin = createClient(A_URL, A_SERVICE)
    const { data: empresa } = await admin
      .from('empresas_autorizadas')
      .select('id, voter_token, activo')
      .eq('email', email)
      .maybeSingle()

    if (!empresa || empresa.activo !== true) {
      return json({ error: 'no_autorizado' }, 403)
    }

    let token = empresa.voter_token as string | null
    if (!token) {
      const nuevo = 'tk_' + crypto.randomUUID()
      // `.is(null)` evita pisar el token si otro request lo creó primero.
      await admin
        .from('empresas_autorizadas')
        .update({ voter_token: nuevo })
        .eq('id', empresa.id)
        .is('voter_token', null)
      // Releer el valor autoritativo (gane quien gane una posible carrera).
      const { data: re } = await admin
        .from('empresas_autorizadas')
        .select('voter_token')
        .eq('id', empresa.id)
        .maybeSingle()
      token = re?.voter_token ?? nuevo
    }

    // 3) Reenviar el voto TAL CUAL a B (sin abrir el JSON).
    //    Cliente con la PUBLISHABLE key de B → corre como `anon`: solo
    //    puede ejecutar la RPC de escritura (protegida por el secreto),
    //    no leer los votos. Así A nunca puede de-anonimizar.
    const payload = await req.json()
    const b = createClient(B_URL, B_KEY)
    const { error } = await b.rpc('votar_por_token', {
      p_secreto: SECRETO,
      p_token: token,
      p_payload: payload,
    })

    if (error) return json({ error: 'b_rechazo', detalle: error.message }, 502)
    return json({ ok: true }, 200)
  } catch (e) {
    return json({ error: 'interno', detalle: String(e) }, 500)
  }
})
