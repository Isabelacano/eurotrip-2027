# Genera el logo de EuroTrip 2027 (perrita coqueta basada en REFERENCES/LOGO.jpg).
# Blanco + líneas y detalles índigo. Detalle italiano discreto: pañuelo de lunares al cuello
# (foulard "de Vespa") y guiño coqueto con pestañas.
# Uso: python tools/make-logo.py   (los PNG se generan después con tools/render-icons.ps1)
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
IND = '#1b26d1'
SOFT = '#8c95ff'
SW = 16


def p(d, fill='#fff', w=SW):
    return f'<path d="{d}" fill="{fill}" stroke="{IND}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>'


def mirror(d):
    # refleja una ruta "M x y C ..." respecto a x = 256 (solo números en pares x y)
    import re
    out, toks = [], re.findall(r'[A-Za-z]|-?[0-9]*[.]?[0-9]+', d)
    nums = []
    for t in toks:
        try:
            nums.append(float(t))
            out.append(None)
        except ValueError:
            out.append(t)
    k = 0
    res = []
    for t in out:
        if t is None:
            v = nums[k]
            res.append(f'{(512 - v) if k % 2 == 0 else v:g}')
            k += 1
        else:
            res.append(t)
            k = k  # los comandos no cuentan
    return ' '.join(res)


def star(cx, cy, ro, ri, rot=0):
    import math
    pts = []
    for i in range(10):
        r = ro if i % 2 == 0 else ri
        a = math.radians(-90 + rot + i * 36)
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return f'<path d="M{" L".join(pts)} Z" fill="{IND}" stroke="{IND}" stroke-width="6" stroke-linejoin="round"/>'


EAR = 'M196 186 C152 178 118 208 112 256 C108 292 110 324 118 348 C126 360 138 356 142 346 C148 358 160 358 166 346 C172 356 184 354 186 342 L192 252 Z'
HEAD = 'M160 262 C160 196 202 158 256 158 C310 158 352 196 352 262 C352 318 316 354 256 354 C196 354 160 318 160 262 Z'

dog = ''.join([
    p(EAR), p(mirror(EAR)),
    p(HEAD),
    # manchas en forma de estrella alrededor de los ojos (como la referencia)
    star(214, 238, 44, 21, -8), star(298, 238, 44, 21, 8),
    # ojo izquierdo abierto
    '<ellipse cx="216" cy="240" rx="11" ry="13" fill="#fff"/>',
    f'<circle cx="218" cy="242" r="6.5" fill="{IND}"/><circle cx="220.5" cy="238.5" r="2.4" fill="#fff"/>',
    # guiño (ojo derecho)
    '<path d="M285 243 Q298 231 311 243" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
    # pestañas
    f'<path d="M176 222 L164 214 M174 236 L160 234 M316 224 L330 214 M320 238 L334 236" stroke="{IND}" stroke-width="8" stroke-linecap="round"/>',
    # boca abierta (debajo del hocico)
    f'<path d="M206 312 C212 350 234 370 256 370 C278 370 300 350 306 312 C290 326 272 330 256 326 C240 330 222 326 206 312 Z" fill="{IND}" stroke="{IND}" stroke-width="10" stroke-linejoin="round"/>',
    f'<path d="M236 352 C240 366 272 366 276 352 C266 346 246 346 236 352 Z" fill="{SOFT}"/>',
    '<path d="M218 326 L224 342 L230 328 Z M294 326 L288 342 L282 328 Z" fill="#fff"/>',
    # hocico en dos lóbulos
    p('M256 288 C246 280 210 284 206 306 C204 326 230 334 256 322 C282 334 308 326 306 306 C302 284 266 280 256 288 Z', '#fff', 12),
    f'<path d="M256 296 L256 322" stroke="{IND}" stroke-width="8" stroke-linecap="round"/>',
    f'<g fill="{IND}"><circle cx="226" cy="306" r="3.6"/><circle cx="236" cy="314" r="3.6"/><circle cx="222" cy="318" r="3.2"/>'
    f'<circle cx="286" cy="306" r="3.6"/><circle cx="276" cy="314" r="3.6"/><circle cx="290" cy="318" r="3.2"/></g>',
    # nariz
    f'<path d="M226 272 C226 256 286 256 286 272 C286 290 270 302 256 302 C242 302 226 290 226 272 Z" fill="{IND}"/>',
    '<ellipse cx="244" cy="268" rx="9" ry="5" fill="#fff" opacity=".85" transform="rotate(-12 244 268)"/>',
    # pañuelo de lunares al cuello, con nudo y puntas a un lado
    f'<path d="M190 356 C222 378 290 378 322 356 L328 380 C292 404 220 404 184 380 Z" fill="{IND}" stroke="{IND}" stroke-width="8" stroke-linejoin="round"/>',
    f'<path d="M212 384 L300 384 L256 426 Z" fill="{IND}" stroke="{IND}" stroke-width="10" stroke-linejoin="round"/>',
    '<g fill="#fff"><circle cx="212" cy="377" r="4.5"/><circle cx="236" cy="387" r="4.5"/><circle cx="276" cy="387" r="4.5"/><circle cx="300" cy="377" r="4.5"/><circle cx="256" cy="404" r="4.5"/></g>',
])


def svg(inner, title='EuroTrip 2027'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>\n'


CENTER = 'translate(256 256) scale({s}) translate(-256 -290)'
os.makedirs(os.path.join(ROOT, 'assets', 'icons'), exist_ok=True)
# Logo suelto (fondo transparente) y en círculo blanco para la cabecera de la app
open(os.path.join(ROOT, 'assets', 'logo.svg'), 'w', encoding='utf-8').write(svg(f'<g transform="{CENTER.format(s=1.05)}">{dog}</g>'))
open(os.path.join(ROOT, 'assets', 'logo-badge.svg'), 'w', encoding='utf-8').write(svg(f'<circle cx="256" cy="256" r="256" fill="#fff"/><g transform="{CENTER.format(s=1.04)}">{dog}</g>'))
# Icono de la app y favicon: cuadrado blanco redondeado
open(os.path.join(ROOT, 'icon.svg'), 'w', encoding='utf-8').write(svg(f'<rect width="512" height="512" rx="112" fill="#fff"/><g transform="{CENTER.format(s=1.1)}">{dog}</g>'))
# Versión "maskable": fondo a sangre y el dibujo dentro de la zona segura (círculo del 80 %)
open(os.path.join(ROOT, 'assets', 'icons', 'maskable.svg'), 'w', encoding='utf-8').write(svg(f'<rect width="512" height="512" fill="#fff"/><g transform="{CENTER.format(s=.84)}">{dog}</g>'))
# Icono de pantalla de inicio (iOS recorta las esquinas solo): fondo a sangre
open(os.path.join(ROOT, 'assets', 'icons', 'apple.svg'), 'w', encoding='utf-8').write(svg(f'<rect width="512" height="512" fill="#fff"/><g transform="{CENTER.format(s=1)}">{dog}</g>'))
print('ok')
