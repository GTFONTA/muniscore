# Keep-alive de Supabase (proyecto Listado)

Mantiene despiertos los proyectos Supabase **Munilupa-listado** y **muniscore**
(plan Free) para que no se pausen por inactividad.

---

## Qué problema resuelve

Supabase **pausa cualquier proyecto Free que no reciba consultas a la base de
datos durante 7 días corridos**. Un proyecto pausado deja de responder hasta que
alguien lo despausa a mano desde el dashboard.

Lo importante: **el tráfico web NO alcanza.** Las visitas al sitio, las cargas del
mapa desde otro proyecto, o entrar al dashboard de Supabase **no cuentan** como
actividad. Solo cuenta que le peguen a la **API REST (PostgREST)** de *ese*
proyecto. Por eso hace falta un ping explícito y programado.

El workflow [`.github/workflows/keep-alive.yml`](../.github/workflows/keep-alive.yml)
hace un `SELECT` trivial contra la tabla `keep_alive` **cada 3 días** (no cada 7:
si una corrida falla, quedan días de margen antes de la pausa).

> **Alcance:** los **dos** proyectos Free, cada uno en su propio step del workflow:
> **Munilupa-listado** (`ltzfauobraykanxisgkx`, identidad/CEDU) y **muniscore**
> (`fdvoiaoobjtsvkzpobyq`, votos + lecturas públicas). Si en el futuro pasás muniscore
> a plan **PRO**, se puede quitar su step (PRO no se pausa).

---

## Paso previo (una sola vez): crear la tabla `keep_alive`

Antes de que el workflow funcione, hay que crear la tabla en **cada** proyecto
(el mismo SQL sirve para los dos):

1. Abrí **Supabase → proyecto Munilupa-listado → SQL Editor** y corré el contenido de
   [`supabase/migrations/0016_keep_alive.sql`](../supabase/migrations/0016_keep_alive.sql).
2. Repetí lo mismo en **Supabase → proyecto muniscore → SQL Editor** con el mismo archivo.
3. Listo: cada proyecto queda con su tabla `keep_alive` y una policy de `SELECT` solo para `anon`.

Si no corrés esto primero, el step correspondiente del workflow va a quedar en **rojo**
(la tabla no existe en ese proyecto).

---

## Los 4 secrets a cargar en GitHub

Dos por proyecto. En **GitHub → repo `GTFONTA/muniscore` → Settings → Secrets and
variables → Actions → New repository secret**, cargá:

| Nombre del secret | Qué valor va | Dónde sacarlo |
|---|---|---|
| `SUPABASE_URL_LISTADO` | el **Project URL** del proyecto Listado (`https://<ref>.supabase.co`) | Supabase → proyecto Listado → Settings → API → Project URL |
| `SUPABASE_ANON_KEY_LISTADO` | la **anon / publishable key** de Listado | Supabase → proyecto Listado → Settings → API → Project API keys |
| `SUPABASE_URL_MUNISCORE` | el **Project URL** del proyecto muniscore | Supabase → proyecto muniscore → Settings → API → Project URL |
| `SUPABASE_ANON_KEY_MUNISCORE` | la **anon / publishable key** de muniscore | Supabase → proyecto muniscore → Settings → API → Project API keys |

> Si ya cargaste los 2 de Listado antes, solo te faltan los 2 de muniscore.

⚠️ **Usá SIEMPRE la `anon` (publishable) key. NUNCA la `service_role`.** La
service_role saltea RLS y es una llave maestra; no tiene por qué estar en un
workflow. La anon key es pública por diseño y solo puede leer lo que RLS permite.

Los nombres de los secrets tienen que ser **exactos** (los lee el workflow por esos
nombres). Si más adelante agregás keep-alive para otro proyecto, seguí la misma
convención (`SUPABASE_URL_<PROYECTO>` / `SUPABASE_ANON_KEY_<PROYECTO>`).

---

## Cómo probarlo a mano

No hace falta esperar 3 días al cron:

1. **GitHub → repo → pestaña `Actions`.**
2. En la barra izquierda, elegí el workflow **`keep-alive-supabase`**.
3. Botón **`Run workflow`** (arriba a la derecha) → **`Run workflow`**.
4. Esperá unos segundos y refrescá. Aparece una corrida nueva.
   - ✅ **Verde** = el ping funcionó, el proyecto está despierto.
   - ❌ **Rojo** = algo falló. Clickeá la corrida → el step que falló
     (**`Ping Munilupa-listado`** o **`Ping muniscore`**) para ver el error de `curl`.
     Como son dos steps independientes, el nombre te dice cuál de los dos proyectos falló.
     Causas típicas: no corriste la migración 0016 en ese proyecto, un secret está mal
     cargado, o el proyecto ya estaba pausado (despausalo una vez a mano y el keep-alive
     lo mantiene).

Además, como el `curl` usa `--fail`, cualquier corrida programada que falle deja el
workflow en rojo y **GitHub te manda un mail** — así te enterás sin tener que mirar.

---

## ⚠️ Advertencia crítica: los cron mueren si el repo queda quieto

**GitHub deshabilita automáticamente los workflows `schedule` si el repositorio no
recibe ningún commit durante 60 días.** Manda un mail de aviso antes, pero si nadie
lo reactiva, **el keep-alive muere en silencio** y el proyecto vuelve a pausarse a
los pocos días.

Si el repo va a quedar mucho tiempo sin cambios:
- Prestá atención al mail de GitHub sobre workflows deshabilitados.
- Para reactivarlo: **Actions → keep-alive-supabase → Enable workflow**, o simplemente
  hacé cualquier commit al repo.

---

## Recordatorio final

`muniscore` es **producción**. El keep-alive es una **mitigación contra la pausa por
inactividad, NO un sustituto de backups.** Seguí teniendo una estrategia de respaldo
propia para los datos importantes.
