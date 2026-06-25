# PROMPT PARA CLAUDE CODE — MUNILUPA
## Segmentación por tipo de obra + Sistema de Puntaje v8 (integrados)

---

## CONTEXTO

En Munilupa los desarrolladores puntúan a los municipios sobre la facilidad o dificultad de los procesos de aprobación de obras de construcción. Este prompt integra **DOS cambios que deben implementarse juntos y en este orden**, porque comparten base de datos, formulario y lógica de cálculo:

- **A) SEGMENTACIÓN POR TIPO DE OBRA**, con regla estricta de "un desarrollador = un voto" en el índice general del municipio.
- **B) ACTUALIZACIÓN DEL SISTEMA DE PUNTAJE a la versión 8 (v8)**: nuevo catálogo de afirmaciones por categoría, pesos confirmados, afirmación crítica que anula la categoría Transparencia, y un cambio estructural en Velocidad de aprobación (los meses hasta el permiso pasan a ser un dato estadístico que NO afecta el puntaje, y se incorpora una autoevaluación de velocidad de 1 a 5 con cuadro orientativo según el tipo de obra).

### Principios clave (respetar estrictamente)

- Las afirmaciones de los cuestionarios miden **CAPACIDAD** del municipio → son compartidas, **NO se segmentan** por tipo de obra.
- Los datos cuantitativos (meses hasta el permiso, velocidad percibida 1–5, % de tasas sobre costo de obra) miden **RESULTADO** de un proyecto → se guardan e interpretan según el tipo de obra elegido en esa reseña.
- NO es crear varios sistemas de puntaje. Es UN set de afirmaciones compartido + datos cuantitativos etiquetados por tipo de obra.
- Las fórmulas, pesos y afirmaciones se modifican **ÚNICAMENTE según lo definido textualmente en este prompt (v8)**. Ningún otro cambio metodológico está autorizado.

### Tipos de obra (usar estos slugs y etiquetas)

| Slug | Etiqueta visible |
| --- | --- |
| `vivienda_unifamiliar` | Vivienda Unifamiliar |
| `vivienda_multifamiliar` | Vivienda Multifamiliar |
| `industrial_logistico` | Industrial y Logístico |
| `comercial_servicios` | Comercial y Servicios |
| `desarrollo_urbanistico` | Desarrollo Urbanístico |
| `otro` | Otro |

### Regla de votos (clave)

- Un desarrollador puede emitir **UNA reseña por municipio POR CADA tipo de obra** (hasta 6 reseñas por municipio).
- Para el **ÍNDICE GENERAL** del municipio, esas reseñas NO cuentan como votos separados. Se promedian primero a nivel del desarrollador (promedio de los puntajes finales de sus reseñas en ese municipio) y ese promedio entra como **UN SOLO voto**. El índice general es el promedio de esos votos-por-desarrollador.

---

## FASE 0 — DIAGNÓSTICO (NO modificar nada todavía)

Antes de escribir código, inspeccioná y reportá por escrito:

1. La tabla de reseñas/encuestas: nombre real, columnas, y dónde se guardan hoy los campos de "meses hasta el permiso" y "% de tasas".
2. Si cada reseña tiene un **IDENTIFICADOR DE DESARROLLADOR** (`empresa_id`, `user_id` o similar). Es imprescindible para la regla de votos: **si NO existe, FRENÁ y avisame antes de continuar**.
3. Dónde están definidas HOY las afirmaciones de cada categoría: ¿hardcodeadas en el frontend o en una tabla de Supabase? ¿Cuántas hay por categoría? ¿Cómo se guarda la respuesta de cada afirmación (booleans individuales, contador, JSON)? Esto determina cuán invasivo es el cambio al catálogo v8.
4. Cómo se calcula HOY: (a) el puntaje de cada categoría, (b) el puntaje final de cada reseña, (c) el índice del municipio que colorea el mapa, y (d) el **trigger** que mantiene las columnas denormalizadas `total_votos` y `puntaje_global` en la tabla `municipios`. Incluí también qué redondeo o presentación se aplica al puntaje final.
5. El componente del formulario de reseña: ruta y estructura del estado/inputs.
6. Si existe alguna definición de enums o constantes de tipos en el proyecto.
7. Cantidad de reseñas existentes en la base. Son datos de prueba/demostración: **NO deben borrarse en ninguna fase**.

**Listá los hallazgos y esperá mi confirmación antes de pasar a la Fase 1.**

---

## FASE 1 — BASE DE DATOS

Entregá la migración como **SQL listo para correr en el editor de Supabase**. NO toques otras columnas ni borres datos existentes.

- Agregá una columna `tipo_obra` (enum o text con CHECK) con los seis slugs. Las reseñas existentes quedan con `tipo_obra` NULL ("sin clasificar"): siguen contando para el índice general (a través de su desarrollador), pero NO para ningún filtro por tipo.
- Agregá una **restricción de unicidad** por combinación (desarrollador, municipio, tipo_obra). Esto garantiza "un voto por tipo".
- Campos cuantitativos — verificá y reusá lo existente, sin duplicar:
  - `meses_hasta_permiso` (numérico): pasa a ser un dato **ESTADÍSTICO**, NO entra en el puntaje.
  - `velocidad_percibida` (entero con CHECK entre 1 y 5): **NUEVO**, SÍ entra en el puntaje.
  - `tasas_porcentaje` (numérico): entra en el puntaje.
- Afirmación crítica de Transparencia: asegurate de que exista un **campo boolean propio** para registrarla (presión de pagos informales). Si las respuestas a afirmaciones se guardan por afirmación en la base, ajustá lo necesario para soportar el catálogo v8; si las afirmaciones están hardcodeadas en el front y solo se guarda un agregado, indicálo y proponé el ajuste mínimo.
- **Retrocompatibilidad (punto a confirmar conmigo):** las reseñas existentes no tienen `velocidad_percibida`. Regla por defecto propuesta: para esas reseñas, derivar el Puntaje_tiempo desde `meses_hasta_permiso` usando el cuadro de tipos generales (menos de 3 meses = 5; 3–6 = 4; 6–9 = 3; 9–12 = 2; 12 o más = 1). Marcá explícitamente este punto en tu reporte y esperá mi confirmación antes de aplicar el recálculo.

**Al terminar, mostrame el SQL y los archivos tocados, y esperá mi OK.**

---

## FASE 2 — CATÁLOGO v8: PESOS, FÓRMULAS Y AFIRMACIONES

Implementá todo lo siguiente como **configuración centralizada** (constantes en un único módulo o tabla, según lo que exista hoy): una sola fuente de verdad para afirmaciones, pesos y fórmulas. Los textos de las afirmaciones deben quedar **EXACTAMENTE como figuran abajo, sin parafrasear**.

### Pesos por categoría (puntaje final de la reseña = suma ponderada)

| Categoría | Peso |
| --- | --- |
| Transparencia e integridad | 25 % |
| Velocidad de aprobación | 25 % |
| Claridad y accesibilidad de la normativa | 10 % |
| Previsibilidad y consistencia de las decisiones | 15 % |
| Atención al público | 10 % |
| Razonabilidad de las tasas municipales | 15 % |

### Fórmula base (categorías solo-cuestionario)

```
Estrellas = 1 + (afirmaciones_tildadas ÷ total_afirmaciones_de_la_categoría) × 4
```

Velocidad y Tasas combinan:

```
Puntaje_final = (componente_cuantitativo × 0,60) + (componente_cuestionario × 0,40)
```

El componente cuestionario de ambas se calcula con la fórmula base sobre sus 6 afirmaciones.

### 2.1 Transparencia e integridad (25 % — 5 afirmaciones + 1 crítica)

Fórmula: `Estrellas = 1 + (tildadas ÷ 5) × 4`.
**REGLA DURA: si la afirmación crítica está tildada, el puntaje de toda la categoría se fija en 1 estrella, sin importar las demás. No es un cálculo: es un override.**

1. Cuenta con un expediente digital trazable que permite consultar el estado del trámite online y cuyo historial de cambios no puede modificarse unilateralmente por los funcionarios.
2. Publica un listado oficial de requisitos completo que el desarrollador puede consultar antes de iniciar el trámite.
3. Permite identificar al funcionario responsable de cada etapa del proceso.
4. Asienta por escrito en el expediente todas las observaciones y pedidos técnicos realizados.
5. El trámite puede completarse sin necesidad de recurrir a un gestor con contactos dentro del municipio.

**AFIRMACIÓN CRÍTICA (anula el puntaje, no suma):** "Durante el proceso existió presión para realizar pagos o contribuciones informales para que el trámite avanzara."

### 2.2 Velocidad de aprobación (25 % — 6 afirmaciones + componente cuantitativo)

Fórmula: `Puntaje_final = (Puntaje_velocidad_percibida × 0,60) + (Puntaje_cuestionario × 0,40)`, con `Puntaje_cuestionario = 1 + (tildadas ÷ 6) × 4`.

1. Tiene plazos máximos de respuesta para cada etapa del trámite establecidos en una ordenanza o norma municipal.
2. Aplica el silencio administrativo positivo: si el municipio no responde en el plazo establecido, el trámite se considera aprobado.
3. Ofrece ventanilla única o interlocutor único, evitando que el desarrollador deba recorrer distintas áreas por separado.
4. Las áreas técnicas revisan el expediente en paralelo y no en cadena secuencial (una área no espera a la otra para comenzar).
5. La prefactibilidad o consulta técnica previa se resuelve en días, no en semanas o meses.
6. Cuenta con una vía de aprobación simplificada y diferenciada para obras menores (por ejemplo, viviendas unifamiliares o locales de baja complejidad), distinta del circuito de las obras de gran escala.

**Componente cuantitativo — CAMBIO IMPORTANTE respecto del sistema actual:**

- **Pregunta 1 (estadística, NO modifica el puntaje):** "¿Cuántos meses tardó el municipio en otorgarle el permiso de obra desde la primera presentación del proyecto hasta el final?". Se guarda en `meses_hasta_permiso`, etiquetada por `tipo_obra`, solo con fines estadísticos y de contraste.
- **Pregunta 2 (SÍ entra en el puntaje, peso 60 %):** "¿Cómo evalúa la velocidad del municipio para acompañarlo en el proceso de obtención del permiso de obra desde la primera presentación del proyecto hasta el final?". El desarrollador elige un puntaje de 1 a 5 (`velocidad_percibida`). Junto a la pregunta se muestra un **cuadro de referencia ORIENTATIVO** que depende del `tipo_obra` seleccionado (el cuadro NO calcula nada, solo guía al usuario).

Cuadro orientativo para `vivienda_unifamiliar`:

| Tiempo hasta el permiso | Puntaje | Interpretación |
| --- | --- | --- |
| Menos de 1 mes | 5 | Proceso excepcionalmente ágil |
| 1 a 2 meses | 4 | Velocidad buena, dentro del estándar esperado |
| 2 a 3 meses | 3 | Demora moderada, aceptable pero mejorable |
| 3 a 6 meses | 2 | Proceso lento con impacto financiero significativo |
| 6 meses o más | 1 | Proceso crítico: insostenible para el desarrollo |

Cuadro orientativo para los otros cinco tipos (`vivienda_multifamiliar`, `industrial_logistico`, `comercial_servicios`, `desarrollo_urbanistico`, `otro`):

| Tiempo hasta el permiso | Puntaje | Interpretación |
| --- | --- | --- |
| Menos de 3 meses | 5 | Proceso excepcionalmente ágil |
| 3 a 6 meses | 4 | Velocidad buena, dentro del estándar esperado |
| 6 a 9 meses | 3 | Demora moderada, aceptable pero mejorable |
| 9 a 12 meses | 2 | Proceso lento con impacto financiero significativo |
| 12 meses o más | 1 | Proceso crítico: insostenible para el desarrollo |

**Texto obligatorio junto al cuadro (mostrar literalmente):** "El cuadro es orientativo, considerar que para algunos tipos de obra la velocidad de aprobación está limitada por los trámites en organismos provinciales, y en este caso estamos evaluando únicamente la gestión Municipal".

### 2.3 Claridad y accesibilidad de la normativa (10 % — 5 afirmaciones)

Fórmula: `Estrellas = 1 + (tildadas ÷ 5) × 4`.

1. Tiene el Código de Ordenamiento Urbano o de Edificación publicado online y vigente.
2. Permite consultar los indicadores urbanísticos por parcela (FOT, FOS, altura máxima, retiros) sin concurrir presencialmente.
3. Emite el certificado urbanístico o de zonificación en un plazo razonable y sin dificultades.
4. La normativa está compilada en un texto único y ordenado, sin necesidad de cruzar múltiples ordenanzas sueltas.
5. Ofrece guías, instructivos o glosarios que ayudan a interpretar la norma más allá del texto legal.

### 2.4 Previsibilidad y consistencia de las decisiones (15 % — 6 afirmaciones)

Fórmula: `Estrellas = 1 + (tildadas ÷ 6) × 4`.

1. Aplica criterios consistentes con los de proyectos similares aprobados anteriormente en el mismo municipio.
2. Tiene criterios escritos y públicos para otorgar o denegar excepciones o flexibilizaciones a la norma.
3. Pone a disposición precedentes documentados de casos similares que el desarrollador puede consultar antes de presentar.
4. Respeta las prefactibilidades o aprobaciones previas emitidas, sin revertirlas a mitad del proceso.
5. Mantiene el criterio técnico estable de principio a fin, sin pedir reformulaciones por cambio de interpretación.
6. Consolida sus observaciones en una única acta: no introduce objeciones nuevas en revisiones posteriores, salvo las derivadas de los cambios que el propio proyectista incorporó para subsanar.

### 2.5 Atención al público (10 % — 6 afirmaciones)

Fórmula: `Estrellas = 1 + (tildadas ÷ 6) × 4`.

1. Cuenta con sistema de turnos online o reserva anticipada que evita colas largas e impredecibles.
2. Tiene una mesa de entrada con registro formal de ingreso y comprobante de recepción del expediente.
3. El personal de atención tiene formación técnica suficiente para orientar sobre el proyecto.
4. Responde consultas por correo electrónico o teléfono en un plazo razonable.
5. Los tiempos de espera presencial son acotados y predecibles.
6. Ofrece una instancia de consulta o reunión técnica previa para proyectos complejos, donde se evalúa el alcance y se anticipan restricciones antes de la presentación formal.

### 2.6 Razonabilidad de las tasas municipales (15 % — 6 afirmaciones + componente cuantitativo)

Fórmula: `Puntaje_final = (Puntaje_costo × 0,60) + (Puntaje_cuestionario × 0,40)`, con `Puntaje_cuestionario = 1 + (tildadas ÷ 6) × 4`.

1. Tiene el tarifario de derechos y tasas de construcción publicado y accesible antes de presentar el proyecto.
2. Ofrece una tabla o calculadora oficial que permite estimar el costo total de tasas de antemano.
3. Cobra tasas proporcionales al servicio efectivamente prestado.
4. El trámite se completa sin cargos adicionales inesperados no detallados en el tarifario.
5. Emite comprobantes o recibos formales por cada pago realizado.
6. Calcula las tasas mediante una fórmula objetiva publicada en la ordenanza fiscal (por ejemplo, sobre superficie y categoría de obra), sin quedar libradas a la discrecionalidad del funcionario.

**Componente cuantitativo — Puntaje_costo (este SÍ se calcula automáticamente desde `tasas_porcentaje`):**

```
pct < 1 %          → 5
1 % ≤ pct < 2 %    → 4
2 % ≤ pct < 3 %    → 3
3 % ≤ pct ≤ 4 %    → 2
pct > 4 %          → 1
```

Pregunta del formulario (mostrar con la aclaración de base de cálculo): "¿Qué porcentaje representó el costo total de tasas municipales (aprobación de permiso, inspecciones, final de obra y cualquier otro derecho municipal) sobre el costo de construcción directo del proyecto (excluir valor del terreno y honorarios profesionales)?". Nota metodológica visible: el porcentaje se calcula sobre mano de obra, materiales y equipos; excluye terreno, honorarios profesionales y tasas provinciales o nacionales.

**Al terminar la Fase 2, mostrame el módulo/tabla de configuración resultante y esperá mi OK.**

---

## FASE 3 — FORMULARIO

- Agregá un **selector de tipo de obra como PRIMER paso del formulario**, obligatorio, con las seis opciones (etiquetas visibles, slugs como valor). Guardá el valor en `tipo_obra` junto con la reseña.
- Si el desarrollador YA votó ese municipio para ese tipo de obra, no permitas duplicar: ofrecé editar la reseña existente. Para los tipos que aún no votó, permití crear una nueva.
- Renderizá las afirmaciones **desde la configuración centralizada de la Fase 2** (no hardcodear textos en el componente). La afirmación crítica de Transparencia debe distinguirse visualmente usando los estilos de advertencia que YA existan en el proyecto; no inventes una paleta nueva.
- Sección Velocidad: la pregunta de meses queda como campo estadístico, con una nota breve indicando que no afecta el puntaje; agregá la nueva pregunta de velocidad percibida (1 a 5) con el cuadro orientativo correspondiente al `tipo_obra` elegido y el texto obligatorio literal de la Fase 2. Si el usuario cambia el tipo de obra, el cuadro debe actualizarse.
- Sección Tasas: el input de porcentaje YA existe; no lo dupliques. Asegurate de que se guarde junto con el `tipo_obra` de esa misma reseña y de que muestre la nota metodológica de base de cálculo.
- Respetá los estilos actuales: **NO cambies colores, tipografía ni el diseño** del resto del formulario. Usá los mismos componentes/clases que ya se usan.

**Al terminar, mostrame los archivos tocados y esperá mi OK.**

---

## FASE 4 — CÁLCULO DEL ÍNDICE Y MAPA

Puntaje final de cada reseña: recalculalo según v8 (Fase 2). A partir de acá, la fórmula de cada reseña individual no se vuelve a tocar.

**Índice general (color por defecto del mapa) — agregación en DOS niveles:**

1. Agrupar las reseñas del municipio por desarrollador.
2. Por cada desarrollador: promediar los puntajes finales de TODAS sus reseñas en ese municipio → un "voto-desarrollador".
3. Índice general = promedio de los votos-desarrollador.

Es decir: **NO promediar todas las reseñas planas** (eso contaría a un desarrollador con 6 reseñas como 6 votos). Primero por desarrollador, después entre desarrolladores.

- **Trigger de municipios:** ajustá el trigger que mantiene `total_votos` y `puntaje_global` para que `total_votos` cuente votos-desarrollador (no reseñas planas) y `puntaje_global` use la agregación en dos niveles con el puntaje v8. **Antes de modificarlo, explicame su funcionamiento actual y tu propuesta de cambio.**

**Filtro por tipo de obra:**

- Agregá un control "Tipo de obra" con las seis opciones + "Todas" (default).
- Al filtrar por un tipo, recalculá color y puntaje SOLO con las reseñas de ese tipo (ahí cada desarrollador aporta una sola reseña; no hace falta promediar a nivel desarrollador), y únicamente si el municipio tiene al menos `UMBRAL_MIN_RESEÑAS` de ese tipo. Definilo como constante configurable (inicial = 3).
- Si no alcanza el umbral, mostrá el municipio en estado neutro / "sin datos suficientes". No colorees con una sola opinión.
- Las reseñas con `tipo_obra` NULL cuentan para el índice general (vía su desarrollador) pero NUNCA para un filtro por tipo.

**Al terminar, mostrame los archivos tocados y esperá mi OK.**

---

## RESTRICCIONES (no negociables)

- Las fórmulas de puntaje, los pesos y las afirmaciones se modifican **ÚNICA y EXACTAMENTE según lo especificado en este prompt (v8)**. No introduzcas ningún otro cambio metodológico, redondeo nuevo ni afirmación adicional.
- NO cambies colores, tipografía ni estilos existentes.
- NO refactorices código no relacionado con esta feature.
- **NO borres ni alteres las reseñas existentes en la base**: son datos de prueba que deben conservarse.
- Cambios pequeños e incrementales. Si algo es ambiguo, preguntá antes de asumir.
- Al terminar cada fase, mostrame qué archivos tocaste y **esperá mi OK antes de seguir con la siguiente**.
