# Munilupa — Manual de operación del padrón (CEDU)

> Guía para administrar el **listado de empresas autorizadas a votar** en Munilupa.
> Está escrita para que la puedas seguir sin conocimientos técnicos. Si algo no
> coincide con lo que ves en pantalla, frená y escribinos antes de tocar nada
> (datos de contacto al final).

---

## Qué es esto y cuál es tu rol

Munilupa es el mapa que muestra qué tan fácil o difícil es construir en cada
municipio, según la opinión de las empresas constructoras. Para que **solo voten
las empresas autorizadas**, existe un **padrón**: una lista de mails habilitados,
cada uno asociado a una empresa y a su cámara.

**Tu única tarea es mantener ese padrón:** dar de alta empresas nuevas,
corregir datos, dar de baja a las que ya no corresponden, y —si querés— ver
quiénes ya votaron y quiénes no.

Para todo eso usás **una sola herramienta**: el **Panel de administración**, una
página web simple. No necesitás entrar a ningún sistema técnico en el día a día.

---

## 🔒 La regla de oro: el voto es secreto, incluso para vos

El sistema está diseñado para que **nadie pueda saber qué votó cada empresa** —
ni vos desde este panel, ni el equipo técnico de Munilupa.

- Vos ves **quién está autorizado** y **quién participó** (votó / no votó).
- **Nunca** vas a ver **qué** votó una empresa (qué puntaje le puso a qué
  municipio). Esa información vive separada y no se puede cruzar con los mails.

Esto es a propósito y es lo que les da confianza a las empresas para votar con
sinceridad. **No es una limitación a resolver: es la garantía del sistema.**

---

## Parte 1 — Puesta en seguridad (una sola vez, al recibir la cuenta)

> Esto se hace **junto con Gonzalo en la reunión de entrega**. Son los pasos que
> hacen que, a partir de ese momento, **solo la CEDU** tenga acceso. Tené a mano
> un correo de la CEDU al que solo accedas vos (o el área que corresponda).

Hay **tres llaves** que cambiar. Cambiá las tres:

1. **Contraseña de la cuenta principal (Supabase).**
   Es la llave maestra del sistema.
   - Entrá a la cuenta que te entrega Gonzalo.
   - Andá a la configuración de la cuenta → **Contraseña** → poné una nueva, que
     **solo vos** conozcas. Guardala en un lugar seguro.

2. **Correo de la cuenta principal (Supabase).**
   - En la misma configuración → **Email** → cambialo al **correo de la CEDU**.
   - Te va a llegar un mail de confirmación a esa casilla: confirmá.
   - Esto evita que alguien externo pueda recuperar la cuenta con el mail viejo.

3. **Contraseña del Panel de administración.**
   - Entrá al panel (ver Parte 2) con el usuario y la contraseña provisoria que
     te da Gonzalo.
   - Apretá **“Cambiar contraseña”** y poné una nueva, que solo vos conozcas.

✅ Cuando terminás estos tres pasos, Gonzalo ya **no puede entrar** ni al sistema
ni al panel. La administración del padrón queda 100 % en manos de la CEDU.

> Anotá las tres contraseñas nuevas en un lugar seguro (un gestor de contraseñas
> o un sobre cerrado). Si las perdés, recuperarlas es complicado.

---

## Parte 2 — Entrar al panel (todos los días)

1. Abrí en el navegador la dirección del panel:
   **`https://<la-dirección-que-te-pasamos>/admin.html`**
2. Vas a ver la pantalla **“Panel de administración · whitelist”**.
3. Escribí tu **Email** y tu **Contraseña** y apretá **“Entrar”**.
4. Si la clave está mal, te avisa “Email o contraseña incorrectos”. Reintentá.

Para salir, apretá **“Salir”** arriba a la derecha. (Conviene salir si usás una
computadora compartida.)

---

## Parte 3 — Cargar una empresa nueva en el padrón

Arriba de todo está el recuadro **“Agregar empresa”** con tres campos:

| Campo | Qué poner | ¿Obligatorio? |
|---|---|---|
| **Nombre de la empresa** | Razón social o nombre conocido (ej. *Zanara SA*) | Sí |
| **email@empresa.com** | El mail con el que esa empresa va a votar | Sí |
| **Cámara (ej. CEDU)** | La cámara a la que pertenece | No (recomendado) |

Pasos:

1. Completá los tres campos.
2. Apretá **“Agregar”**.
3. Si salió bien, aparece el cartel verde **“Empresa agregada”** y la ves en la
   lista de abajo.

**Cosas a tener en cuenta:**

- El mail se guarda siempre en **minúsculas y sin espacios** automáticamente. No
  te preocupes por cómo lo escribís.
- **Un mail = una empresa.** Si intentás cargar un mail que ya existe, te avisa
  **“Ese email ya está cargado”** y no lo duplica.
- Cargá **el mail exacto** con el que la empresa va a iniciar sesión. Si se
  equivocan de mail al votar, el sistema no los va a reconocer.

---

## Parte 4 — Editar, dar de baja o reactivar una empresa

En la lista, cada empresa tiene a la derecha los botones de acción.

**Editar** (corregir nombre, mail o cámara):
1. Apretá **“Editar”** en la fila de esa empresa.
2. Los campos se vuelven editables. Cambiá lo que necesites.
3. Apretá **“Guardar”** (o **“Cancelar”** si te arrepentís).

**Dar de baja** (la empresa deja de poder votar):
1. Apretá **“Dar de baja”**.
2. La empresa pasa a estado **“Inactiva”** y se pinta en gris.

> ⚠️ Dar de baja **no borra** la empresa ni su participación: solo la deshabilita.
> Esto es intencional. **No existe un botón de “borrar” y está bien que así sea.**

**Reactivar** (volver a habilitar una que estaba inactiva):
1. Apretá **“Reactivar”**. Vuelve a estado **“Activa”**.

> **Cambio de mail de una empresa:** si una empresa cambia su correo, **no crees
> una empresa nueva**. Entrá a **“Editar”** y cambiale el mail. Así conserva su
> historial y su participación. (Crear una nueva la haría figurar dos veces.)

---

## Parte 5 — Buscar y revisar duplicados

- **Buscador:** arriba de la lista, escribí parte del nombre, mail o cámara para
  filtrar. A la derecha ves el conteo: *“X activas · Y en total”*.
- **Alerta de duplicados:** si hay dos empresas con el **mismo mail** o el
  **mismo nombre**, aparece un aviso azul y las filas quedan marcadas con ⚠️.
  Revisalas: corregí con **“Editar”** o dá de baja la que sobra.

---

## Parte 6 — Ver quién votó y quién no

> Recordá la **regla de oro**: acá ves **si** una empresa votó, **nunca qué**
> votó. Es imposible verlo desde el panel, por diseño.

1. Entrá a la solapa **“Participación”**.
2. Vas a ver la lista de empresas con una columna **“¿Votó?”** → **Sí / No**.
3. Podés filtrar por cámara o buscar una empresa puntual.

Esto sirve para hacer seguimiento (por ejemplo, recordarle a las empresas que
todavía no participaron). Lo que ves es únicamente:

- ✅ Nombre de la empresa, mail, cámara
- ✅ Un indicador **Sí / No** de si participó

Lo que **nunca** vas a ver desde acá:

- ❌ Qué municipio calificó
- ❌ Qué puntaje puso
- ❌ Ningún dato del contenido del voto

---

## Parte 7 — Situaciones comunes y qué NO hacer

**“Una empresa dice que no puede votar.”**
- Verificá que su mail esté en el padrón y **Activa** (usá el buscador).
- Confirmá que el mail cargado sea **idéntico** al que usan para entrar.
- Si está todo bien y sigue sin poder, escribinos.

**“Tengo que cargar muchas empresas de una vez.”**
- Para una carga grande (decenas de empresas), **no las cargues una por una**:
  pedile el bloque al equipo de Munilupa y lo subimos nosotros de forma segura.

**“Una empresa ya no pertenece a la cámara / se dio de baja como socia.”**
- Usá **“Dar de baja”**. No borres nada.

**Qué NO hacer:**
- ❌ No compartas las contraseñas (ni la del sistema, ni la del panel).
- ❌ No intentes “borrar” empresas ni votos: el sistema, a propósito, no lo
  permite, y no hace falta.
- ❌ No entres a configuraciones técnicas del sistema principal salvo que te
  guiemos nosotros. Para tu tarea diaria **alcanza con el panel**.

---

## Parte 8 — Soporte

Ante cualquier duda, error en pantalla o algo que no coincida con este manual,
**no improvises**: escribinos.

- **Contacto técnico (Munilupa):** _________________________
- **Referente CEDU:** _________________________

---

*Munilupa · Manual de operación del padrón — versión 1*
