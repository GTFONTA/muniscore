// ============================================================
//  avisoLegal.js — Fuente única del Aviso Legal y Descargo de
//  Responsabilidad de Munilupa.
//
//  La vista de Aviso Legal, el link del footer y el checkbox del
//  flujo de voto importan de acá. Si mañana cambia el texto, se
//  bumpea AVISO_LEGAL_VERSION en este único lugar.
//
//  IMPORTANTE: la versión es SOLO para mostrarla en pantalla. No
//  se persiste en la base, no se pasa a ninguna RPC, no se guarda
//  la aceptación. El checkbox es una barrera de UI y nada más.
//
//  Texto pendiente de revisión legal del punto de anonimato
//  (la whitelist guarda emails identificables). Si cambia, solo
//  se bumpea la versión acá.
// ============================================================

// El sitio NO usa router: la "ruta" /aviso-legal se materializa
// como un valor de `vista` (setVista) en App.jsx. Esta constante
// es ese identificador de vista — reutilizarla para navegar, NO
// hardcodear el string suelto.
export const AVISO_LEGAL_VISTA = 'aviso-legal';

export const AVISO_LEGAL_VERSION = 'v1-2026-06';
export const AVISO_LEGAL_FECHA = 'Junio 2026';

// Los 11 puntos del Anexo, textuales. Solo el punto 1 lleva un
// encabezado en negrita (`titulo`); el resto es texto corrido.
export const AVISO_LEGAL_TEXTO = {
  titulo: 'Aviso legal y descargo de responsabilidad',
  puntos: [
    {
      titulo: 'Objetivos del Responsable del Sitio Web',
      texto:
        'Este sitio web (“Munilupa”) tiene por objeto la recopilación de puntajes y opiniones y la elaboración de índices y ponderaciones referidos a la gestión de los municipios de la República Argentina en relación con la facilidad o dificultad en el desarrollo de proyectos de construcción de inmuebles. Dichos índices y ponderaciones son construidos de manera privada y anónima. Toda la información se presenta de manera objetiva, veraz, precisa y clara.',
    },
    {
      texto:
        'La información utilizada para la construcción de los índices y ponderaciones proviene exclusivamente del parecer, voto y opinión personal de las personas con acceso al Sitio Web mediante el proceso allí indicado. El responsable del Sitio Web no garantiza su exactitud, integridad, actualidad ni veracidad, limitándose a recopilarlas y publicarlas del modo que decida hacerlo. Los índices y opiniones que se observan en el Sitio Web son el resultado de un procesamiento propio que no provocará omisiones ni modificaciones de las fuentes de información originales, ya sea en su contenido como en la forma de ser informados.',
    },
    {
      texto:
        'El responsable del Sitio Web no asumirá responsabilidad alguna, directa ni indirecta, por las opiniones y comentarios de los usuarios del Sitio Web ni por los daños y perjuicios de cualquier naturaleza que pudieran derivarse del uso o de la imposibilidad de uso de la información publicada en el Sitio Web, incluyendo —sin limitarse a— opiniones de los usuarios, descalificaciones, decisiones políticas, periodísticas, comerciales o de cualquier otra índole adoptadas con base en los índices, puntajes y/u opiniones transcriptas en el Sitio Web. El Sitio Web no contendrá consideraciones propias sobre cuestiones políticas, jurídicas, comerciales, ni de cualquier otra naturaleza.',
    },
    {
      texto:
        'Los índices, puntajes y opiniones personales recopilados, elaborados y publicados en este Sitio Web no pretende proporcionar respuestas ni soluciones a ninguna cuestión ajena a su objeto que es el de hacer pública la información mencionada.',
    },
    {
      texto:
        'El responsable del Sitio Web en ningún caso tendrá responsabilidad legal por el uso que puedan dar terceros a los índices, puntajes y opiniones personales recopilados y publicados en este Sitio Web. Todo uso y/o aplicación de la información contenida en el Sitio Web será de exclusiva responsabilidad de quien haga uso de la misma para cualquier fin.',
    },
    {
      texto:
        'Debido a que todos los índices, puntajes y opiniones personales son anónimos, el Sitio Web no tendrá la obligación de incorporarlos a una base de datos registrada ante la Agencia de Acceso a la Información Pública (AAIP) o el organismo competente que la reemplace, de conformidad con la Ley N.º 25.326 de Protección de los Datos Personales y su Decreto Reglamentario N.º 1558/2001. Los datos personales no serán comunicados a terceros sin consentimiento expreso del titular, salvo en los casos expresamente previstos por la ley, en los que la autoridad judicial competente así lo ordene. La base de datos no será utilizada por el Sitio Web con fines distintos al objeto aquí declarado.',
    },
    {
      texto:
        'En virtud de lo previsto por el artículo 7, inciso 4, párrafo 2.º de la Ley N.º 25.326, los datos referidos al desempeño de los funcionarios municipales en su actividad pública —en tanto se refieren al ejercicio de sus cargos en el ámbito estatal— pueden ser tratados sin requerir el consentimiento del titular, siempre que dicho tratamiento sea pertinente al objeto del Sitio Web y respete la dignidad de las personas involucradas. El Sitio Web no publicará datos sensibles en los términos del artículo 2 de la Ley N.º 25.326, ni datos privados de los funcionarios ajenos al ejercicio de sus funciones públicas.',
    },
    {
      texto:
        'La recepción, elaboración y publicación de índices en base a puntajes y opiniones personales de los usuarios y su difusión pública por medio de internet, se encuentra amparada por la Ley N.º 26.032 y por el artículo 14 de la Constitución Nacional ya que constituyen un debido ejercicio de la libertad de expresión e información, por lo que no podrán ser objeto de censura previa ni restricción ilegítima alguna.',
    },
    {
      texto:
        'Al hacer uso del Sitio Web, los usuarios se obligan a mantener indemne al responsable del Sitio Web y/o a sus representantes y/o su personal, de cualquier cargo, acción, denuncia, demanda y/o reclamo derivado de sus opiniones.',
    },
    {
      texto:
        'Los índices, metodologías, puntajes, textos, diseño gráfico y demás contenidos originales publicados en este Sitio Web son titularidad de su responsable y se encuentran protegidos por la Ley N.º 11.723 de Propiedad Intelectual. Se autoriza únicamente su reproducción parcial para fines periodísticos, académicos o de interés público, con cita expresa de la fuente. Queda prohibida su reproducción total o comercial sin autorización previa y escrita del responsable del Sitio Web.',
    },
    {
      texto:
        'El Sitio Web actúa con estricto apego al principio de buena fe y al respeto a la dignidad de las personas e instituciones involucradas. Los municipios o funcionarios que consideren que algún contenido publicado vulnera sus derechos o contiene inexactitudes, podrán ejercer su derecho de rectificación o respuesta conforme al artículo 14 de la Convención Americana sobre Derechos Humanos (Pacto de San José de Costa Rica), con jerarquía constitucional en virtud de lo dispuesto por el artículo 75, inciso 22 de la Constitución Nacional.',
    },
  ],
};
