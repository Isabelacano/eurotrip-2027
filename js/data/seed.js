/*
 * Datos iniciales del viaje (en español). Los ids son FIJOS para que "Importar → Combinar" funcione
 * entre los teléfonos de las cuatro viajeras/os.
 *
 * Todos los precios son ESTIMACIONES orientativas por persona (no presupuestos confirmados).
 */
(function (root) {
  const T = (root.Trip = root.Trip || {});
  const TS = '2026-11-18T00:00:00.500Z';      // versión 2/3 de los datos iniciales
  const OLD_TS = '2026-11-18T00:00:00.000Z';  // versión 1 (inglés) — usada para migrar

  const travellers = [
    { id: 'isa', name: 'Isa', origin: 'Weimar, Alemania', fromCountry: 'Alemania', color: '#c2410c', photo: '', avatar: '', createdAt: TS, updatedAt: TS },
    { id: 'pili', name: 'Pili', origin: 'Colombia', fromCountry: 'Colombia', color: '#7c3aed', photo: '', avatar: '', createdAt: TS, updatedAt: TS },
    { id: 'pastu', name: 'Pastu', origin: 'Colombia', fromCountry: 'Colombia', color: '#0f766e', photo: '', avatar: '', createdAt: TS, updatedAt: TS },
    { id: 'lenva', name: 'Lenva', origin: 'Colombia', fromCountry: 'Colombia', color: '#2563eb', photo: '', avatar: '', createdAt: TS, updatedAt: TS },
  ];
  const ALL = travellers.map((t) => t.id);
  const COLOMBIA = ['pili', 'pastu', 'lenva'];

  const cities = [
    { id: 'madrid', name: 'Madrid', country: 'España', lat: 40.4168, lon: -3.7038, arrive: '2027-03-16', depart: '2027-03-19',
      overview: 'El punto de encuentro: Isa llega desde Alemania y Pili, Pastu y Lenva desde Colombia. Museos del Paseo del Prado, Madrid Río, arquitectura del siglo XX y excursión a Toledo.',
      highlights: ['Excursión a Toledo', 'Triángulo del arte'] },
    { id: 'barcelona', name: 'Barcelona', country: 'España', lat: 41.3874, lon: 2.1686, arrive: '2027-03-19', depart: '2027-03-22',
      overview: 'Gaudí, el modernismo de Domènech i Montaner, el Pabellón de Mies y la arquitectura contemporánea de EMBT. Reserven Sagrada Família y Park Güell con antelación.',
      highlights: ['Pabellón Mies van der Rohe', 'Gaudí'] },
    { id: 'rome', name: 'Roma', country: 'Italia', lat: 41.9028, lon: 12.4964, arrive: '2027-03-22', depart: '2027-03-25',
      overview: 'De la Roma antigua al barroco de Bernini y Borromini y al MAXXI de Zaha Hadid. Es la semana antes de Pascua (Pascua: 28 de marzo de 2027): habrá mucha gente y horarios especiales.',
      highlights: ['Semana Santa', 'Panteón', 'MAXXI'] },
    { id: 'florence', name: 'Florencia', country: 'Italia', lat: 43.7696, lon: 11.2558, arrive: '2027-03-25', depart: '2027-03-28',
      overview: 'La cuna del Renacimiento: Brunelleschi, Alberti y Miguel Ángel. Excursión a las Cinque Terre (quizá parando en Pisa) o a Siena si hace mal tiempo. El domingo 28 de marzo ven el Scoppio del Carro antes de salir hacia Venecia.',
      highlights: ['Cinque Terre (+ Pisa)', 'Siena si llueve', 'Scoppio del Carro · 28 mar'] },
    { id: 'venice', name: 'Venecia', country: 'Italia', lat: 45.4408, lon: 12.3155, arrive: '2027-03-28', depart: '2027-03-30',
      overview: 'Alojamiento en Mestre (tierra firme) para ahorrar; a 10 minutos en tren o bus de Venezia Santa Lucia. Carlo Scarpa, Palladio y Tadao Ando.',
      highlights: ['Dormir en Mestre', 'Carlo Scarpa'] },
    { id: 'munich', name: 'Múnich', country: 'Alemania', lat: 48.1351, lon: 11.582, arrive: '2027-03-30', depart: '2027-04-01',
      overview: 'La cubierta de Frei Otto en el Olympiapark, Herzog & de Meuron, las Pinakotheken y la cerveza. Posible excursión a Neuschwanstein el 31 de marzo (el Deutschlandticket de abril aún no vale: Bayern-Ticket).',
      highlights: ['Neuschwanstein (posible)', 'Olympiapark'] },
    { id: 'weimar-prague', name: 'Weimar', country: 'Alemania', lat: 50.9795, lon: 11.3235, arrive: '2027-04-01', depart: '2027-04-03',
      overview: 'Aún sin decidir. Weimar es la opción más barata: alojamiento gratis en casa de Isa y transporte regional con el Deutschlandticket; además es la cuna de la Bauhaus. Praga es la alternativa.',
      highlights: ['Weimar = alojamiento gratis + Deutschlandticket'],
      choice: 'undecided',
      options: [
        { key: 'weimar', name: 'Weimar', country: 'Alemania', lat: 50.9795, lon: 11.3235, note: 'Alojamiento gratis en casa de Isa; trenes regionales cubiertos por el Deutschlandticket; Bauhaus y excursión a Dessau.' },
        { key: 'prague', name: 'Praga', country: 'Chequia', lat: 50.0755, lon: 14.4378, note: 'Requiere alojamiento de pago y transporte internacional (no cubierto por el Deutschlandticket). Moneda: corona checa (CZK). Loos, cubismo checo y Gehry.' },
      ] },
    { id: 'berlin', name: 'Berlín', country: 'Alemania', lat: 52.52, lon: 13.405, arrive: '2027-04-03', depart: '2027-04-07',
      overview: 'Cuatro noches: Mies, Scharoun, Chipperfield, Libeskind y Foster, la vivienda modernista de Bruno Taut, museos y vida nocturna. Excursión a Potsdam con el Deutschlandticket.',
      highlights: ['Excursión a Potsdam', 'Mies · Scharoun · Chipperfield'] },
    { id: 'frankfurt', name: 'Frankfurt', country: 'Alemania', lat: 50.1109, lon: 8.6821, arrive: '2027-04-07', depart: '2027-04-09',
      overview: 'Última parada: el skyline de "Mainhattan", el Museo Alemán de Arquitectura y Das Neue Frankfurt. Posible excursión al Valle del Rin o a Heidelberg con el Deutschlandticket. Vuelta a casa desde el aeropuerto de Frankfurt.',
      highlights: ['Valle del Rin o Heidelberg', 'DAM'] },
  ].map((c, i) => Object.assign({ order: i, notes: '', createdAt: TS, updatedAt: TS }, c));

  /* Opciones de transporte por trayecto. min/max = euros por persona ESTIMADOS. */
  const L = (label, url) => ({ label, url });
  const legs = [
    { from: 'madrid', to: 'barcelona', date: '2027-03-19', mode: 'train', notes: '', options: [
      { mode: 'train', label: 'Alta velocidad: AVE, Iryo u Ouigo', duration: '2 h 30 – 3 h 10', min: 20, max: 90, recommended: true, note: 'La opción recomendada, de centro a centro (Atocha → Sants). Los operadores low-cost (Ouigo, Iryo) son los más baratos si se compra con antelación.', links: [L('Renfe', 'https://www.renfe.com'), L('Iryo', 'https://iryo.eu'), L('Ouigo', 'https://www.ouigo.com/es')] },
      { mode: 'bus', label: 'Autobús (Alsa o FlixBus)', duration: '7 – 8 h', min: 15, max: 35, note: 'Más barato, pero mucho más lento.', links: [L('Alsa', 'https://www.alsa.es'), L('FlixBus', 'https://www.flixbus.es')] },
      { mode: 'flight', label: 'Avión', duration: '1 h 15 + aeropuertos', min: 30, max: 100, note: 'Rara vez compensa frente al tren contando los traslados.', links: [] },
    ] },
    { from: 'barcelona', to: 'rome', date: '2027-03-22', mode: 'flight', notes: '', options: [
      { mode: 'flight', label: 'Vuelo directo BCN → Roma (FCO o CIA)', duration: '1 h 50 + traslados', min: 40, max: 150, recommended: true, note: 'Vueling, Ryanair, ITA Airways y otras. Revisen las condiciones del equipaje de mano. Del aeropuerto al centro: tren Leonardo Express (FCO) o autobús.', links: [L('Vueling', 'https://www.vueling.com'), L('Ryanair', 'https://www.ryanair.com'), L('ITA Airways', 'https://www.ita-airways.com')] },
      { mode: 'ferry', label: 'Ferry Barcelona → Civitavecchia', duration: '≈ 20 h (nocturno)', min: 60, max: 150, note: 'Alternativa lenta y con encanto que ahorra una noche de alojamiento. Civitavecchia está a ~1 h de Roma en tren.', links: [L('Grimaldi Lines', 'https://www.grimaldi-lines.com')] },
    ] },
    { from: 'rome', to: 'florence', date: '2027-03-25', mode: 'train', notes: '', options: [
      { mode: 'train', label: 'Alta velocidad: Frecciarossa o Italo', duration: '1 h 30 – 1 h 40', min: 20, max: 55, recommended: true, note: 'Muchas frecuencias al día; con antelación hay tarifas bajas.', links: [L('Trenitalia', 'https://www.trenitalia.com'), L('Italo', 'https://www.italotreno.com')] },
      { mode: 'train', label: 'Tren regional', duration: '3 h 30 – 4 h', min: 15, max: 25, note: 'Precio fijo y sin reserva obligatoria, pero bastante más lento.', links: [L('Trenitalia', 'https://www.trenitalia.com')] },
      { mode: 'bus', label: 'Autobús (FlixBus o Itabus)', duration: '3 – 4 h', min: 10, max: 25, note: 'La opción más barata.', links: [L('FlixBus', 'https://www.flixbus.it')] },
    ] },
    { from: 'florence', to: 'venice', date: '2027-03-28', mode: 'train', notes: 'Salir después del Scoppio del Carro. Esa noche se adelanta 1 h el reloj.', options: [
      { mode: 'train', label: 'Frecciarossa o Italo a Venezia Mestre', duration: '≈ 2 h', min: 25, max: 60, recommended: true, note: 'Bajen en Mestre, donde se alojan. Es domingo de Pascua: compren con antelación.', links: [L('Trenitalia', 'https://www.trenitalia.com'), L('Italo', 'https://www.italotreno.com')] },
      { mode: 'train', label: 'Regional vía Bolonia', duration: '3 h 30 – 4 h', min: 18, max: 25, note: 'Más barato, con transbordo en Bolonia.', links: [L('Trenitalia', 'https://www.trenitalia.com')] },
    ] },
    { from: 'venice', to: 'munich', date: '2027-03-30', mode: 'train', notes: 'El Deutschlandticket de abril todavía no es válido este día.', options: [
      { mode: 'train', label: 'EuroCity directo por el paso del Brennero', duration: '≈ 6 h 30 – 7 h', min: 40, max: 100, recommended: true, note: 'Uno de los trayectos en tren más bonitos de Europa, cruzando los Alpes. Pocas frecuencias al día: reserven pronto (tarifas Sparschiene / Sparpreis).', links: [L('ÖBB', 'https://www.oebb.at'), L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'bus', label: 'FlixBus por los Alpes', duration: '7 – 8 h', min: 25, max: 50, note: 'Alternativa más barata.', links: [L('FlixBus', 'https://www.flixbus.de')] },
    ] },
    { from: 'munich', to: 'weimar-prague', date: '2027-04-01', mode: 'train', notes: '', options: [
      { mode: 'train', variant: 'weimar', label: 'Trenes regionales a Weimar (Deutschlandticket)', duration: '≈ 6 – 7 h, 3–4 transbordos', min: 0, max: 0, recommended: true, note: 'Sin coste extra con el Deutschlandticket, válido desde el 1 de abril. Isa ya lo tiene; Pili, Pastu y Lenva necesitan el de abril de 2027. Es un día largo: lleven comida.', links: [L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'train', variant: 'weimar', label: 'ICE Múnich → Erfurt + regional a Weimar', duration: '≈ 3 h', min: 30, max: 90, note: 'Mucho más rápido, pero el ICE NO está cubierto por el Deutschlandticket (solo el tramo regional Erfurt → Weimar).', links: [L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'bus', variant: 'prague', label: 'Autobús Múnich → Praga', duration: '≈ 4 h 30 – 5 h', min: 20, max: 40, recommended: true, note: 'FlixBus directo, varias salidas diarias.', links: [L('FlixBus', 'https://www.flixbus.de')] },
      { mode: 'train', variant: 'prague', label: 'Tren Múnich → Praga', duration: '≈ 5 h 30 – 6 h', min: 25, max: 60, note: 'Ruta internacional: el Deutschlandticket solo cubriría el tramo alemán en trenes regionales.', links: [L('Deutsche Bahn', 'https://www.bahn.de'), L('České dráhy', 'https://www.cd.cz')] },
    ] },
    { from: 'weimar-prague', to: 'berlin', date: '2027-04-03', mode: 'train', notes: '', options: [
      { mode: 'train', variant: 'weimar', label: 'Trenes regionales Weimar → Berlín (Deutschlandticket)', duration: '≈ 3 h 30 – 4 h', min: 0, max: 0, recommended: true, note: 'Cubierto por el Deutschlandticket, con transbordos (por ejemplo en Halle o Leipzig).', links: [L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'train', variant: 'weimar', label: 'ICE desde Erfurt', duration: '≈ 2 h', min: 30, max: 80, note: 'Más rápido, no cubierto por el Deutschlandticket.', links: [L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'train', variant: 'prague', label: 'EuroCity Praga → Berlín', duration: '≈ 4 h 30', min: 20, max: 60, recommended: true, note: 'Recorre el valle del Elba; muy bonito.', links: [L('České dráhy', 'https://www.cd.cz'), L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'bus', variant: 'prague', label: 'FlixBus Praga → Berlín', duration: '≈ 4 h 30', min: 15, max: 35, note: 'La opción más barata.', links: [L('FlixBus', 'https://www.flixbus.de')] },
    ] },
    { from: 'berlin', to: 'frankfurt', date: '2027-04-07', mode: 'train', notes: '', options: [
      { mode: 'train', label: 'ICE directo', duration: '≈ 4 h', min: 30, max: 120, recommended: true, note: 'NO cubierto por el Deutschlandticket. Las tarifas Sparpreis compradas con antelación son mucho más baratas.', links: [L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'train', label: 'Solo trenes regionales (Deutschlandticket)', duration: '≈ 8 – 9 h, varios transbordos', min: 0, max: 0, note: 'Sin coste extra con el Deutschlandticket, pero ocupa el día entero.', links: [L('Deutsche Bahn', 'https://www.bahn.de')] },
      { mode: 'bus', label: 'FlixBus', duration: '7 – 8 h', min: 20, max: 40, note: 'Alternativa barata al ICE.', links: [L('FlixBus', 'https://www.flixbus.de')] },
    ] },
  ].map((l) => Object.assign({ id: 'leg-' + l.from + '-' + l.to, createdAt: TS, updatedAt: TS }, l));

  /*
   * ---------- Recomendaciones (catálogo curado, a partir de places.js + images.js) ----------
   * Desde la v3 NO se insertan en el itinerario: el itinerario empieza vacío y lo construye el grupo.
   * Las recomendaciones son de solo lectura y se pueden copiar al itinerario con "Añadir al itinerario".
   */
  const images = T.images || {};
  const recommendations = [];
  const activities = recommendations;
  Object.keys(T.places || {}).forEach((cityId) => {
    T.places[cityId].forEach((p) => {
      const [slug, category, name, description, euros, address, website, wiki, extra] = p;
      const img = wiki && images[wiki];
      activities.push(Object.assign({
        id: 'act-' + slug, cityId, category, name, description,
        priceCents: euros == null ? null : Math.round(euros * 100),
        address: address || '', website: website || '', youtube: '', notes: '', date: '', variant: '', planned: false,
        image: img ? img.card : '', imageCredit: img ? img.file : '', likes: {}, createdAt: TS, updatedAt: TS,
        wiki: wiki || '',
      }, extra || {}));
    });
  });

  const acc = (cityId, name, type, extra) => Object.assign({
    id: 'acc-' + cityId + (extra && extra.variant ? '-' + extra.variant : ''), cityId, name, type,
    checkIn: (cities.find((c) => c.id === cityId) || {}).arrive || '',
    checkOut: (cities.find((c) => c.id === cityId) || {}).depart || '',
    totalCents: null, people: 4, link: '', address: '', confirmation: '', payment: 'unpaid', confirmed: false, notes: '', variant: '',
    createdAt: TS, updatedAt: TS,
  }, extra || {});

  const accommodations = [
    acc('madrid', 'Por decidir', 'hotel'),
    acc('barcelona', 'Por decidir', 'hotel'),
    acc('rome', 'Por decidir', 'hotel'),
    acc('florence', 'Por decidir', 'hotel'),
    acc('venice', 'Alojamiento en Mestre (por decidir)', 'hotel', { notes: 'Dormir en Mestre es más barato; hay trenes y autobuses a Venecia cada pocos minutos.' }),
    acc('munich', 'Por decidir', 'hotel'),
    acc('weimar-prague', 'Casa de Isa (Weimar)', 'home', { variant: 'weimar', totalCents: 0, payment: 'free', confirmed: true, address: 'Weimar', notes: 'Alojamiento gratis, solo si elegimos Weimar.' }),
    acc('weimar-prague', 'Alojamiento en Praga (solo si elegimos Praga)', 'hotel', { variant: 'prague' }),
    acc('berlin', 'Por decidir', 'hotel'),
    acc('frankfurt', 'Por decidir', 'hotel'),
  ];

  const tr = (id, type, from, to, date, extra) => Object.assign({
    id: 'tr-' + id, type, from, to, date, time: '', arriveDate: '', arriveTime: '', company: '', priceCents: null,
    link: '', ticketLink: '', reference: '', status: 'to-book', confirmed: false, priceEstimated: true, travellers: ALL.slice(), legId: '', notes: '',
    createdAt: TS, updatedAt: TS,
  }, extra || {});

  const cityName = (id) => (id === 'weimar-prague' ? 'Weimar / Praga' : (cities.find((c) => c.id === id) || {}).name || id);
  const transports = [
    tr('isa-arrival', 'flight', 'Alemania', 'Madrid', '2027-03-16', { travellers: ['isa'], notes: 'Isa viaja desde Alemania a Madrid.' }),
    tr('colombia-arrival', 'flight', 'Colombia', 'Madrid', '', { arriveDate: '2027-03-16', travellers: COLOMBIA.slice(), notes: 'Pili, Pastu y Lenva vuelan desde Colombia y llegan a Madrid el 16 de marzo. Los vuelos nocturnos suelen salir el día anterior.' }),
  ].concat(legs.map((l) => tr(l.from + '-' + l.to, l.mode, cityName(l.from), cityName(l.to), l.date, { legId: l.id, notes: (l.options.find((o) => o.recommended) || {}).label || '' })))
    .concat([
      tr('isa-home', 'train', 'Frankfurt', 'Weimar', '2027-04-09', { travellers: ['isa'], notes: 'Trenes regionales cubiertos por el Deutschlandticket.' }),
      tr('colombia-home', 'flight', 'Frankfurt', 'Colombia', '2027-04-09', { travellers: COLOMBIA.slice(), notes: 'Vuelo de vuelta desde el aeropuerto de Frankfurt.' }),
    ]);

  const item = (list, key, text, owner) => ({ id: 'chk2-' + list + '-' + key + (owner ? '-' + owner : ''), list, owner: owner || '', text, done: false, createdAt: TS, updatedAt: TS });

  const checklist = [
    item('documents', 'pasaporte', 'Pasaporte (vigente al menos 3 meses después del 9 de abril de 2027)'),
    item('documents', 'seguro', 'Seguro de viaje'),
    item('documents', 'vuelos', 'Billetes de avión'),
    item('documents', 'reservas', 'Reservas de alojamiento y transporte (copias sin conexión)'),
    item('documents', 'personales', 'Documentos personales (cédula / DNI, tarjeta sanitaria)'),
    item('documents', 'dticket', 'Deutschlandticket de abril 2027 (Isa ya lo tiene)'),
    item('documents', 'schengen', 'Requisitos de entrada a Schengen para viajeros colombianos (incl. ETIAS)'),
    item('packing', 'ropa', 'Ropa por capas (5–18 °C en marzo/abril)'),
    item('packing', 'zapatos', 'Zapatos cómodos (ya usados)'),
    item('packing', 'higiene', 'Artículos de higiene'),
    item('packing', 'cargadores', 'Cargadores y batería externa'),
    item('packing', 'adaptadores', 'Adaptadores de enchufe (tipo C/F; Italia también usa el L)'),
    item('packing', 'medicamentos', 'Medicamentos personales'),
    item('packing', 'mochila', 'Mochila de día'),
    item('packing', 'lluvia', 'Chubasquero o paraguas pequeño'),
    item('packing', 'cuaderno', 'Cuaderno de dibujo y lápices (¡somos arquitectos!)'),
    item('before', 'alojamientos', 'Confirmar alojamientos'),
    item('before', 'billetes', 'Revisar billetes'),
    item('before', 'mapas', 'Descargar mapas sin conexión'),
    item('before', 'clima', 'Consultar el clima'),
    item('before', 'transporte', 'Organizar el transporte entre ciudades'),
    item('before', 'documentacion', 'Revisar la documentación'),
    item('before', 'banco', 'Avisar al banco y llevar una tarjeta sin comisiones'),
    item('before', 'datos', 'Contratar eSIM o datos móviles en la UE'),
    item('before', 'exportar', 'Exportar y compartir los datos de la app con el grupo'),
    item('reservations', 'weimarpraga', 'Decidir: Weimar o Praga (1–3 de abril)'),
    item('reservations', 'sagrada', 'Sagrada Família'),
    item('reservations', 'coliseo', 'Coliseo y Museos Vaticanos'),
    item('reservations', 'borghese', 'Galleria Borghese'),
    item('reservations', 'cupula', 'Cúpula de Brunelleschi'),
    item('reservations', 'uffizi', 'Uffizi'),
    item('reservations', 'neuschwanstein', 'Neuschwanstein + Bayern-Ticket (31 de marzo)'),
    item('reservations', 'reichstag', 'Registro para la cúpula del Reichstag'),
    item('personal', 'dticket', 'Deutschlandticket activo en el móvil (ya lo tengo)', 'isa'),
    item('personal', 'pasaporte', 'Pasaporte o DNI', 'isa'),
  ].concat(COLOMBIA.flatMap((id) => [
    item('personal', 'pasaporte', 'Pasaporte vigente (≥ 3 meses tras el 9 de abril de 2027)', id),
    item('personal', 'dticket', 'Comprar el Deutschlandticket de abril 2027', id),
    item('personal', 'tarjeta', 'Tarjeta sin comisiones por cambio de divisa', id),
  ])).concat([
    item('buy', 'dticket', 'Deutschlandticket de abril para Pili, Pastu y Lenva (válido desde el 1 de abril)'),
    item('buy', 'higiene', 'Productos de higiene en tamaño viaje'),
    item('buy', 'esim', 'eSIM o tarjeta de datos europea'),
    item('reminders', 'semanasanta', 'Roma, 22–25 de marzo: Semana Santa, mucha gente y horarios especiales.'),
    item('reminders', 'pascua', 'Domingo 28 de marzo: Pascua, Scoppio del Carro Y cambio de hora en la UE (+1 h).'),
    item('reminders', 'pasquetta', 'Lunes 29 de marzo (Pasquetta) es festivo en Italia: algunos museos y tiendas cierran.'),
    item('reminders', 'dticket', 'El Deutschlandticket solo cubre transporte regional (RE/RB/S-Bahn/U-Bahn), no ICE/IC/EC ni rutas internacionales.'),
    item('reminders', 'venecia', 'Venecia: comprueben si hay que registrarse en el sistema de tasa de acceso en sus fechas.'),
  ]);

  const notes = [
    { id: 'note2-weimar-praga', title: 'Weimar o Praga (1–3 de abril)', body: 'Weimar: alojamiento gratis en casa de Isa, trenes regionales con el Deutschlandticket, Bauhaus y excursión a Dessau.\nPraga: más grande y famosa, pero con alojamiento de pago, billetes internacionales y otra moneda (CZK).', url: '', createdAt: TS, updatedAt: TS },
    { id: 'note2-dticket', title: 'Deutschlandticket', body: 'Abono mensual para todo el transporte regional de Alemania (RE, RB, S-Bahn, U-Bahn, tranvía y autobús). Isa ya lo tiene; Pili, Pastu y Lenva necesitan el de abril de 2027, válido desde el 1 de abril. NO vale en ICE/IC/EC ni en rutas internacionales. Es una suscripción: recuerden darla de baja si no la necesitan el mes siguiente.', url: 'https://www.deutschlandticket.de', createdAt: TS, updatedAt: TS },
  ];

  T.seed = {
    TS, OLD_TS,
    /** Documento inicial (v3): el itinerario empieza VACÍO. */
    build() {
      return JSON.parse(JSON.stringify({ travellers, cities, legs, activities: [], expenses: [], accommodations, transports, checklist, notes }));
    },
    /** Datos iniciales de la v2 (con las recomendaciones dentro del itinerario): solo para migrar. */
    buildV2() {
      return JSON.parse(JSON.stringify({ travellers, cities, legs, activities, expenses: [], accommodations, transports, checklist, notes }));
    },
    /** Catálogo de recomendaciones curadas (solo lectura). */
    recommendations() { return recommendations; },
  };
})(typeof self !== 'undefined' ? self : this);
