// ============================================================
//  puntajeV8.js — Catálogo central del Sistema de Puntaje v8
//
//  FUENTE ÚNICA DE VERDAD de la feature "tipo de obra + puntaje v8":
//  tipos de obra, pesos por categoría, afirmaciones (textuales),
//  fórmulas, cuadros orientativos y textos obligatorios.
//
//  El formulario (Fase 3) y el cálculo de índice (Fase 4) deben leer
//  de acá. NO duplicar textos ni fórmulas en otros archivos.
//
//  ⚠️ Los textos de afirmaciones están EXACTOS según el prompt v8.
//     No parafrasear, no reordenar (los ids dependen del orden/sentido).
//  ⚠️ No introducir pesos, redondeos ni afirmaciones que no estén acá.
// ============================================================

// ── Tipos de obra (slug en DB ↔ etiqueta visible) ───────────
export const TIPOS_OBRA = [
  { slug: "vivienda_unifamiliar",   label: "Vivienda Unifamiliar" },
  { slug: "vivienda_multifamiliar", label: "Vivienda Multifamiliar" },
  { slug: "industrial_logistico",   label: "Industrial y Logístico" },
  { slug: "comercial_servicios",    label: "Comercial y Servicios" },
  { slug: "desarrollo_urbanistico", label: "Desarrollo Urbanístico" },
  { slug: "otro",                   label: "Otro" },
];

export const SLUGS_TIPO_OBRA = TIPOS_OBRA.map(t => t.slug);

export const labelTipoObra = (slug) =>
  TIPOS_OBRA.find(t => t.slug === slug)?.label || null;

// ── Umbral de reseñas para colorear un filtro por tipo (Fase 4) ──
export const UMBRAL_MIN_RESENAS = 3;

// ── Pesos por categoría (suman 1.00) ────────────────────────
//  Clave semántica v8 ↔ columna DB de puntaje por categoría.
//  Ojo: "tasas" (v8) se guarda en la columna `puntaje_impuestos` (legacy).
export const PESOS = {
  transparencia:  0.25,
  velocidad:      0.25,
  normativa:      0.10,
  previsibilidad: 0.15,
  atencion:       0.10,
  tasas:          0.15,
};

// Etiquetas visibles de cada categoría (orden de presentación en el form).
export const CATEGORIAS = [
  { key: "transparencia",  label: "Transparencia e integridad" },
  { key: "velocidad",      label: "Velocidad de aprobación" },
  { key: "normativa",      label: "Claridad y accesibilidad de la normativa" },
  { key: "previsibilidad", label: "Previsibilidad y consistencia de las decisiones" },
  { key: "atencion",       label: "Atención al público" },
  { key: "tasas",          label: "Razonabilidad de las tasas municipales" },
];

// Mapa categoría v8 → columna de puntaje en `encuestas` (para Fase 4).
export const COLUMNA_PUNTAJE = {
  transparencia:  "puntaje_transparencia",
  velocidad:      "puntaje_velocidad",
  normativa:      "puntaje_normativa",
  previsibilidad: "puntaje_previsibilidad",
  atencion:       "puntaje_atencion",
  tasas:          "puntaje_impuestos",
};

// ── Afirmaciones por categoría (TEXTO EXACTO v8) ────────────
//  Cada afirmación tiene un id estable para guardarla en el JSONB
//  `respuestas`. El orden replica el del prompt.
export const AFIRMACIONES = {
  transparencia: [
    { id: "transp_1", texto: "Cuenta con un expediente digital trazable que permite consultar el estado del trámite online y cuyo historial de cambios no puede modificarse unilateralmente por los funcionarios." },
    { id: "transp_2", texto: "Publica un listado oficial de requisitos completo que el desarrollador puede consultar antes de iniciar el trámite." },
    { id: "transp_3", texto: "Permite identificar al funcionario responsable de cada etapa del proceso." },
    { id: "transp_4", texto: "Asienta por escrito en el expediente todas las observaciones y pedidos técnicos realizados." },
    { id: "transp_5", texto: "El trámite puede completarse sin necesidad de recurrir a un gestor con contactos dentro del municipio." },
  ],
  velocidad: [
    { id: "vel_1", texto: "Tiene plazos máximos de respuesta para cada etapa del trámite establecidos en una ordenanza o norma municipal." },
    { id: "vel_2", texto: "Aplica el silencio administrativo positivo: si el municipio no responde en el plazo establecido, el trámite se considera aprobado." },
    { id: "vel_3", texto: "Ofrece ventanilla única o interlocutor único, evitando que el desarrollador deba recorrer distintas áreas por separado." },
    { id: "vel_4", texto: "Las áreas técnicas revisan el expediente en paralelo y no en cadena secuencial (una área no espera a la otra para comenzar)." },
    { id: "vel_5", texto: "La prefactibilidad o consulta técnica previa se resuelve en días, no en semanas o meses." },
    { id: "vel_6", texto: "Cuenta con una vía de aprobación simplificada y diferenciada para obras menores (por ejemplo, viviendas unifamiliares o locales de baja complejidad), distinta del circuito de las obras de gran escala." },
  ],
  normativa: [
    { id: "norm_1", texto: "Tiene el Código de Ordenamiento Urbano o de Edificación publicado online y vigente." },
    { id: "norm_2", texto: "Permite consultar los indicadores urbanísticos por parcela (FOT, FOS, altura máxima, retiros) sin concurrir presencialmente." },
    { id: "norm_3", texto: "Emite el certificado urbanístico o de zonificación en un plazo razonable y sin dificultades." },
    { id: "norm_4", texto: "La normativa está compilada en un texto único y ordenado, sin necesidad de cruzar múltiples ordenanzas sueltas." },
    { id: "norm_5", texto: "Ofrece guías, instructivos o glosarios que ayudan a interpretar la norma más allá del texto legal." },
  ],
  previsibilidad: [
    { id: "prev_1", texto: "Aplica criterios consistentes con los de proyectos similares aprobados anteriormente en el mismo municipio." },
    { id: "prev_2", texto: "Tiene criterios escritos y públicos para otorgar o denegar excepciones o flexibilizaciones a la norma." },
    { id: "prev_3", texto: "Pone a disposición precedentes documentados de casos similares que el desarrollador puede consultar antes de presentar." },
    { id: "prev_4", texto: "Respeta las prefactibilidades o aprobaciones previas emitidas, sin revertirlas a mitad del proceso." },
    { id: "prev_5", texto: "Mantiene el criterio técnico estable de principio a fin, sin pedir reformulaciones por cambio de interpretación." },
    { id: "prev_6", texto: "Consolida sus observaciones en una única acta: no introduce objeciones nuevas en revisiones posteriores, salvo las derivadas de los cambios que el propio proyectista incorporó para subsanar." },
  ],
  atencion: [
    { id: "aten_1", texto: "Cuenta con sistema de turnos online o reserva anticipada que evita colas largas e impredecibles." },
    { id: "aten_2", texto: "Tiene una mesa de entrada con registro formal de ingreso y comprobante de recepción del expediente." },
    { id: "aten_3", texto: "El personal de atención tiene formación técnica suficiente para orientar sobre el proyecto." },
    { id: "aten_4", texto: "Responde consultas por correo electrónico o teléfono en un plazo razonable." },
    { id: "aten_5", texto: "Los tiempos de espera presencial son acotados y predecibles." },
    { id: "aten_6", texto: "Ofrece una instancia de consulta o reunión técnica previa para proyectos complejos, donde se evalúa el alcance y se anticipan restricciones antes de la presentación formal." },
  ],
  tasas: [
    { id: "tasas_1", texto: "Tiene el tarifario de derechos y tasas de construcción publicado y accesible antes de presentar el proyecto." },
    { id: "tasas_2", texto: "Ofrece una tabla o calculadora oficial que permite estimar el costo total de tasas de antemano." },
    { id: "tasas_3", texto: "Cobra tasas proporcionales al servicio efectivamente prestado." },
    { id: "tasas_4", texto: "El trámite se completa sin cargos adicionales inesperados no detallados en el tarifario." },
    { id: "tasas_5", texto: "Emite comprobantes o recibos formales por cada pago realizado." },
    { id: "tasas_6", texto: "Calcula las tasas mediante una fórmula objetiva publicada en la ordenanza fiscal (por ejemplo, sobre superficie y categoría de obra), sin quedar libradas a la discrecionalidad del funcionario." },
  ],
};

// ── Afirmación CRÍTICA de Transparencia (override, no suma) ──
//  Campo boolean propio (columna `presion_pagos_informales`).
export const AFIRMACION_CRITICA = {
  id: "transp_critica",
  categoria: "transparencia",
  texto: "Durante el proceso existió presión para realizar pagos o contribuciones informales para que el trámite avanzara.",
};

// ── Cuadros orientativos de Velocidad percibida (NO calculan) ──
//  Solo guían al usuario al elegir velocidad_percibida (1-5).
export const CUADRO_VELOCIDAD = {
  vivienda_unifamiliar: [
    { rango: "Menos de 1 mes", puntaje: 5, interpretacion: "Proceso excepcionalmente ágil" },
    { rango: "1 a 2 meses",    puntaje: 4, interpretacion: "Velocidad buena, dentro del estándar esperado" },
    { rango: "2 a 3 meses",    puntaje: 3, interpretacion: "Demora moderada, aceptable pero mejorable" },
    { rango: "3 a 6 meses",    puntaje: 2, interpretacion: "Proceso lento con impacto financiero significativo" },
    { rango: "6 meses o más",  puntaje: 1, interpretacion: "Proceso crítico: insostenible para el desarrollo" },
  ],
  // Aplica a los otros cinco tipos.
  general: [
    { rango: "Menos de 3 meses", puntaje: 5, interpretacion: "Proceso excepcionalmente ágil" },
    { rango: "3 a 6 meses",      puntaje: 4, interpretacion: "Velocidad buena, dentro del estándar esperado" },
    { rango: "6 a 9 meses",      puntaje: 3, interpretacion: "Demora moderada, aceptable pero mejorable" },
    { rango: "9 a 12 meses",     puntaje: 2, interpretacion: "Proceso lento con impacto financiero significativo" },
    { rango: "12 meses o más",   puntaje: 1, interpretacion: "Proceso crítico: insostenible para el desarrollo" },
  ],
};

// Devuelve el cuadro orientativo correspondiente al tipo de obra.
export const cuadroVelocidad = (slug) =>
  slug === "vivienda_unifamiliar"
    ? CUADRO_VELOCIDAD.vivienda_unifamiliar
    : CUADRO_VELOCIDAD.general;

// ── Textos obligatorios (mostrar LITERALES en el form) ──────
export const TEXTO_VELOCIDAD =
  "El cuadro es orientativo, considerar que para algunos tipos de obra la velocidad de aprobación está limitada por los trámites en organismos provinciales, y en este caso estamos evaluando únicamente la gestión Municipal";

export const PREGUNTA_MESES =
  "¿Cuántos meses tardó el municipio en otorgarle el permiso de obra desde la primera presentación del proyecto hasta el final?";

export const PREGUNTA_VELOCIDAD_PERCIBIDA =
  "¿Cómo evalúa la velocidad del municipio para acompañarlo en el proceso de obtención del permiso de obra desde la primera presentación del proyecto hasta el final?";

export const PREGUNTA_TASAS =
  "¿Qué porcentaje representó el costo total de tasas municipales (aprobación de permiso, inspecciones, final de obra y cualquier otro derecho municipal) sobre el costo de construcción directo del proyecto (excluir valor del terreno y honorarios profesionales)?";

export const NOTA_TASAS =
  "El porcentaje se calcula sobre mano de obra, materiales y equipos; excluye terreno, honorarios profesionales y tasas provinciales o nacionales.";

// ============================================================
//  FÓRMULAS (puras, sin estado) — única fuente de verdad
// ============================================================

// Fórmula base: 1 + (tildadas / total) × 4  →  rango [1, 5].
export const estrellasBase = (tildadas, total) => {
  if (!total) return 1;
  return 1 + (tildadas / total) * 4;
};

// Componente cuestionario de una categoría a partir de su array de
// booleans (en el orden de AFIRMACIONES[cat]).
export const puntajeCuestionario = (cat, respuestasCat) => {
  const afirms = AFIRMACIONES[cat] || [];
  const total = afirms.length;
  const tildadas = afirms.reduce(
    (acc, a) => acc + (respuestasCat?.[a.id] ? 1 : 0),
    0
  );
  return estrellasBase(tildadas, total);
};

// Transparencia: cuestionario sobre 5, con OVERRIDE crítico a 1.
export const puntajeTransparencia = (respuestasCat, presionPagosInformales) => {
  if (presionPagosInformales === true) return 1; // override duro
  return puntajeCuestionario("transparencia", respuestasCat);
};

// Velocidad: 60% percibida (1-5) + 40% cuestionario (sobre 6).
export const puntajeVelocidad = (velocidadPercibida, respuestasCat) => {
  const cuant = Number(velocidadPercibida) || 0; // 1-5
  const cuest = puntajeCuestionario("velocidad", respuestasCat);
  return cuant * 0.6 + cuest * 0.4;
};

// Puntaje_costo a partir del % de tasas (se calcula automático).
//   pct < 1 → 5 ; 1≤pct<2 → 4 ; 2≤pct<3 → 3 ; 3≤pct≤4 → 2 ; pct>4 → 1
export const puntajeCosto = (pct) => {
  const p = Number(pct);
  if (!isFinite(p)) return null;
  if (p < 1) return 5;
  if (p < 2) return 4;
  if (p < 3) return 3;
  if (p <= 4) return 2;
  return 1;
};

// Tasas: 60% Puntaje_costo + 40% cuestionario (sobre 6).
export const puntajeTasas = (tasasPorcentaje, respuestasCat) => {
  const costo = puntajeCosto(tasasPorcentaje) ?? 0;
  const cuest = puntajeCuestionario("tasas", respuestasCat);
  return costo * 0.6 + cuest * 0.4;
};

// Derivación de velocidad para reseñas LEGACY (sin velocidad_percibida):
// se infiere desde los meses con el cuadro de tipos GENERALES.
//   <3 → 5 ; 3-6 → 4 ; 6-9 → 3 ; 9-12 → 2 ; ≥12 → 1
export const velocidadDesdeMeses = (meses) => {
  const m = Number(meses);
  if (!isFinite(m)) return null;
  if (m < 3)  return 5;
  if (m < 6)  return 4;
  if (m < 9)  return 3;
  if (m < 12) return 2;
  return 1;
};

// ── Puntaje final de UNA reseña (suma ponderada de las 6 cats) ──
//  Recibe un objeto con todos los insumos de la reseña. Devuelve un
//  número en [1, 5] (sin redondear; el redondeo/presentación se decide
//  donde corresponda, igual que hoy).
//
//  insumos = {
//    respuestas: { transparencia:{id:bool}, velocidad:{...}, ... },
//    presionPagosInformales: bool,
//    velocidadPercibida: 1..5,
//    tasasPorcentaje: number,
//  }
export const puntajeReseña = (insumos = {}) => {
  const r = insumos.respuestas || {};
  const cat = {
    transparencia:  puntajeTransparencia(r.transparencia, insumos.presionPagosInformales),
    velocidad:      puntajeVelocidad(insumos.velocidadPercibida, r.velocidad),
    normativa:      puntajeCuestionario("normativa", r.normativa),
    previsibilidad: puntajeCuestionario("previsibilidad", r.previsibilidad),
    atencion:       puntajeCuestionario("atencion", r.atencion),
    tasas:          puntajeTasas(insumos.tasasPorcentaje, r.tasas),
  };
  const final = Object.keys(PESOS).reduce(
    (acc, k) => acc + cat[k] * PESOS[k],
    0
  );
  return { categorias: cat, final };
};
