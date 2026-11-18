# EuroTrip 2027

Aplicación web (móvil primero) para planificar el viaje de **Isa, Pili, Pastu y Lenva** por Europa del **16 de marzo al 9 de abril de 2027**.
Gratuita, sin servidor, sin cuentas y sin claves de API.

## Secciones

| Pestaña | Qué hace |
|---|---|
| **Ruta** | Mapa (Leaflet) con las 9 paradas numeradas, líneas cronológicas y ventanas emergentes; cronología con opciones de transporte por trayecto (duración, precio **estimado** por persona, alternativas y enlaces), aviso del Deutschlandticket y la decisión Weimar / Praga. |
| **Itinerario** | Espacio colaborativo **vacío por defecto**: 11 categorías por ciudad, cada una con **+ Añadir lugar** (se pega un enlace y la app intenta leer nombre, foto, web y descripción; si no puede, se rellena a mano). Cada lugar muestra quién lo añadió, favoritos, comentarios, notas y el enlace original; "Mi plan por días". Aparte, la pestaña **Recomendaciones** (catálogo curado con fotos de Wikimedia Commons) permite copiar al itinerario solo lo que interese. |
| **Gastos** | Tipo Splitwise: reparto a partes iguales entre quienes participan, historial, tabla tipo Excel + CSV, saldos y "Saldar" con el mínimo de pagos. |
| **Reservas** (Planificación) | Alojamientos (con botón "Abrir reserva en Airbnb / Booking.com…") y transportes (enlaces de reserva y de billete, n.º de reserva, horas, precio estimado o confirmado, estado). |
| **Checklist** | Documentos importantes, Equipaje general, Antes del viaje, Pendientes de reserva, Equipaje personal, Compras, Recordatorios y notas. |

## Cómo se comparten los datos (importante)

Todo se guarda **en el navegador de cada teléfono** (localStorage). Para que las cuatro personas vean lo mismo:

1. Menú **⋮ → Exportar** y enviar el `.json` al grupo.
2. Las demás: **⋮ → Importar → Combinar**.

La combinación es segura: gana la versión editada más reciente de cada elemento, se respetan los borrados y se conservan los favoritos de todos.
Las **fotos de perfil** se comprimen (≈ 400 px, unos 20–40 KB) y viajan **dentro del archivo exportado**, así que las ven las cuatro tras combinar.
No es sincronización en tiempo real: si algún día quieren eso, la opción gratuita sería un backend como Supabase (plan gratuito, requiere crear una cuenta).

## Publicar en GitHub Pages

1. Subir esta carpeta a un repositorio de GitHub.
2. *Settings → Pages → Deploy from a branch → main / (root)*.
3. Abrir `https://<usuario>.github.io/<repositorio>/` y, en el móvil, "Añadir a pantalla de inicio".

También funciona abriendo `index.html` directamente (sin la capa de detalle de OpenStreetMap, que exige servir la página por http/https).

## Leer datos de un enlace ("Añadir lugar")

El navegador no puede leer otra web directamente (CORS), así que se usan servicios **gratuitos y sin clave**:
1. [Jina Reader](https://jina.ai/reader/) (`r.jina.ai`, unas 20 consultas/minuto por dispositivo sin clave).
2. [Microlink](https://microlink.io/) (`api.microlink.io`, cupo diario pequeño sin clave).
3. Lo que se pueda deducir del propio enlace (p. ej. el nombre en un enlace de Google Maps).

Solo se envía el enlace pegado. Webs como Instagram o algunas con Cloudflare bloquean la lectura: entonces se escriben los datos a mano.

## Diseño

Fondo oscuro (`#0b0b0e`) con un único acento índigo (`#1b26d1` en rellenos, `#8c95ff` para texto sobre negro), degradados azules con grano, corchetes [ ] y versalitas; tipografía Poppins. Todas las fotos se muestran en B/N y se cargan en alta resolución con `srcset` (500–1920 px según la pantalla).

- **Portada:** la foto del grupo (`assets/foto-grupo.jpg`, copia de `REFERENCES/FOTO.jpeg`) en un círculo fundido con la esfera azul.
- **Logo:** perrita coqueta índigo sobre blanco con pañuelo de lunares (`assets/logo.svg`, basado en `REFERENCES/LOGO.jpg`). `python tools/make-logo.py` genera los SVG y `powershell -File tools/render-icons.ps1` los PNG (192, 512, maskable, apple-touch-icon) y `favicon.ico`.
- **Avatares:** cada perfil usa por defecto su ilustración (`assets/avatars/*.svg`, estilo de `REFERENCES/AVATAR.jpg`, generadas con `python tools/make-avatars.py`). Si alguien sube su propia foto o logo (menú de perfil → Editar), esa imagen la sustituye y viaja a los demás teléfonos con Exportar → Importar → Combinar. Al quitar la foto vuelve la ilustración.

## Mapa y fuentes

- **Leaflet 1.9.4** (cdnjs). Mapa base vectorial con países de **Natural Earth** (dominio público) incluido en `js/data/europe.js`, así que no depende de ningún servidor de teselas.
- Capa opcional **OpenStreetMap** en escala de grises (solo por http/https; respeta la [política de uso de teselas](https://operations.osmfoundation.org/policies/tiles/) con atribución visible). No se usa CARTO porque sus mapas base exigen clave de API.
- Tipografía de Google Fonts: Poppins.

## Fotos

`tools/fetch-images.js` consulta la API de Wikipedia (`pageimages`, solo licencias libres), sustituye por fotos más grandes de Wikimedia Commons las que miden menos de 1280 px (búsquedas en `tools/image-overrides.json`) y genera `js/data/images.js` con miniaturas de Wikimedia Commons y el enlace a la página de autoría de cada archivo ("Foto · Wikimedia Commons" en cada imagen). Las fotos se muestran en blanco y negro con CSS. Si una imagen falta o no carga, aparece un marcador editorial con el nombre.

```
node tools/fetch-images.js
```

## Precios

Todos los precios de transporte y actividades son **estimaciones orientativas** basadas en tarifas públicas habituales; no son presupuestos ni disponibilidad confirmada. El Deutschlandticket (Isa ya lo tiene; las demás pueden comprar el de abril de 2027) solo cubre transporte regional en Alemania: no ICE, IC/EC ni trayectos internacionales.

## Estructura

```
index.html            · css/styles.css
js/core/utils.js      formato es-ES, fechas, céntimos, enlaces seguros
js/core/finance.js    reparto y saldos (céntimos enteros)
js/core/linkinfo.js   lectura gratuita de título/foto/descripción de un enlace
js/core/store.js      datos, migraciones v1→v2→v3, validación, exportar/combinar
js/data/*.js          lugares, imágenes, países, datos iniciales
js/ui/components.js   hojas, formularios, avatares, fotos
js/views/*.js         una vista por pestaña + ajustes
tests/*.test.js       node tests/finance.test.js && node tests/store.test.js
```
