# Genera los 4 avatares ilustrados (SVG) de assets/avatars/.
# Estilo basado en REFERENCES/AVATAR.jpg: contorno negro grueso, colores planos,
# cabeza grande sin cuello, flequillo en "casco", ojos almendrados con rabillo,
# pendientes dorados con contorno y estrella negra detrás de la cabeza.
# Uso: python tools/make-avatars.py
import math
import os
import random

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'avatars')
os.makedirs(OUT, exist_ok=True)

K = '#0b0b0b'          # contorno
W = 5                  # grosor de contorno principal
GOLD = '#e3b45b'
SILVER = '#e6e9ef'


def shape(d, fill, w=W):
    return f'<path d="{d}" fill="{fill}" stroke="{K}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>'


def line(d, w=3, color=K):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'


def star():
    pts = []
    n = 5
    for i in range(n * 2):
        r = 104 if i % 2 == 0 else 54
        a = -math.pi / 2 + i * math.pi / n
        pts.append(f'{100 + r * math.cos(a):.1f} {104 + r * math.sin(a):.1f}')
    return f'<path d="M{" L".join(pts)} Z" fill="{K}"/>'


def background():
    return ('<defs><radialGradient id="bg" cx="30%" cy="22%" r="95%"><stop offset="0" stop-color="#4b57ff"/>'
            '<stop offset=".55" stop-color="#1b26d1"/><stop offset="1" stop-color="#0c128a"/></radialGradient>'
            '<clipPath id="c"><circle cx="100" cy="100" r="100"/></clipPath></defs>'
            '<g clip-path="url(#c)"><rect width="200" height="200" fill="url(#bg)"/>' + star())


def ears(skin, y=116):
    s = ''
    for x, sd in ((60, -1), (140, 1)):
        s += f'<ellipse cx="{x}" cy="{y}" rx="9.5" ry="12.5" fill="{skin}" stroke="{K}" stroke-width="{W}"/>'
        s += line(f'M{x - sd * 1} {y - 6} Q{x + sd * 5} {y - 2} {x + sd * 1} {y + 6}', 2.6)
    return s


def eye(cx, cy, side, iris, lashes=True):
    outer, inner = cx + side * 12, cx - side * 12
    # Blanco del ojo + iris de color recortado dentro de la almendra
    almond = f'M{cx - 12} {cy} Q{cx} {cy - 15} {cx + 12} {cy} Q{cx} {cy + 11} {cx - 12} {cy} Z'
    cid = f'eye{cx}'
    s = f'<clipPath id="{cid}"><path d="{almond}"/></clipPath>'
    s += f'<path d="{almond}" fill="#fff"/>'
    s += (f'<g clip-path="url(#{cid})"><circle cx="{cx}" cy="{cy - .6}" r="5.6" fill="{iris}"/>'
          f'<circle cx="{cx}" cy="{cy - .6}" r="2.6" fill="{K}"/></g>')
    s += f'<path d="{almond}" fill="none" stroke="{K}" stroke-width="2.4" stroke-linejoin="round"/>'
    s += f'<circle cx="{cx + 2.2}" cy="{cy - 2.8}" r="1.7" fill="#fff"/><circle cx="{cx - 2.4}" cy="{cy + 1.4}" r=".8" fill="#fff"/>'
    if lashes:
        s += line(f'M{inner} {cy - .5} Q{cx} {cy - 14} {outer} {cy - 1} L{outer + side * 7} {cy - 6}', 3.6)
        p0, c, p2 = (inner, cy - .5), (cx, cy - 14), (outer, cy - 1)
        for u, ln in ((.58, 2.8), (.74, 3.4), (.88, 3.8)):
            x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p2[0]
            y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p2[1]
            dx, dy = x - cx, y - (cy + 6)
            n = (dx * dx + dy * dy) ** .5
            ex, ey = x + dx / n * ln + side * 1.2, y + dy / n * ln
            s += line(f'M{x:.1f} {y:.1f} L{ex:.1f} {ey:.1f}', 1.6)
    else:
        s += line(f'M{inner} {cy - .5} Q{cx} {cy - 13.5} {outer + side * 1.5} {cy - .5}', 3.4)
    return s


def brows(y, t, lift=5):
    def one(m):
        X = (lambda x: x) if m == 1 else (lambda x: 200 - x)
        d = (f'M{X(93)} {y + t * .45 + 1:.1f} '
             f'L{X(92)} {y - t * .55:.1f} '
             f'Q{X(87)} {y - lift - t * .65:.1f} {X(80)} {y - lift - t * .5:.1f} '
             f'Q{X(73)} {y - lift - t * .25:.1f} {X(67)} {y + 3:.1f} '
             f'Q{X(73)} {y - lift + t * .35:.1f} {X(80)} {y - lift + t * .5:.1f} '
             f'Q{X(87)} {y - lift * .3 + t * .55:.1f} {X(93)} {y + t * .45 + 1:.1f} Z')
        return f'<path d="{d}" fill="{K}" stroke="{K}" stroke-width="1.2" stroke-linejoin="round"/>'
    return one(1) + one(-1)


def nose():
    return line('M96.5 124.5 C94.5 129.5 98 131.5 100 130.5 C102 131.5 105.5 129.5 103.5 124.5', 2.8)


def smile(y=140):
    return (f'<path d="M87 {y} Q100 {y + 15} 113 {y} Q100 {y + 4} 87 {y} Z" fill="{K}" stroke="{K}" stroke-width="2.6" stroke-linejoin="round"/>'
            f'<path d="M90.5 {y + 1.6} Q100 {y + 6} 109.5 {y + 1.6} Q100 {y + 3.6} 90.5 {y + 1.6} Z" fill="#fff"/>'
            f'<path d="M95 {y + 9} Q100 {y + 6} 105 {y + 9} Q100 {y + 11.5} 95 {y + 9} Z" fill="#d9665f"/>')


def full_lips(color, y=139):
    return (shape(f'M86 {y} Q100 {y + 24} 114 {y} Q100 {y + 6} 86 {y} Z', color, 2.4)
            + f'<path d="M86 {y} Q100 {y + 17} 114 {y} Q100 {y + 5} 86 {y} Z" fill="{K}"/>'
            + f'<path d="M90 {y + 1.8} Q100 {y + 6.4} 110 {y + 1.8} Q100 {y + 4} 90 {y + 1.8} Z" fill="#fff"/>'
            + shape(f'M85 {y} Q92 {y - 4.5} 100 {y - 2.2} Q108 {y - 4.5} 115 {y} Q100 {y + 1} 85 {y} Z', color, 1.8))


def _old_lips(color, y=139):
    return (f'<path d="M86 {y + 1} Q100 {y + 16} 114 {y + 1} Q100 {y + 5} 86 {y + 1} Z" fill="{K}"/>'
            f'<path d="M90 {y + 2.6} Q100 {y + 7} 110 {y + 2.6} Q100 {y + 4.6} 90 {y + 2.6} Z" fill="#fff"/>'
            + shape(f'M85 {y + 1} Q92 {y - 5} 100 {y - 2} Q108 {y - 5} 115 {y + 1} Q100 {y + 3} 85 {y + 1} Z', color, 2.6)
            + shape(f'M89 {y + 8} Q100 {y + 21} 111 {y + 8} Q100 {y + 13} 89 {y + 8} Z', color, 2.6))


def hoop(x, y, r, color, w=3.6):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{K}" stroke-width="{w + 3}"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{color}" stroke-width="{w}"/>')


def stud(x, y, r, color):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="{K}" stroke-width="2"/>'


FACE_OVAL = 'M60 102 C60 72 78 58 100 58 C122 58 140 72 140 102 C140 134 124 160 100 162 C76 160 60 134 60 102 Z'
FACE_SQUARE = 'M60 100 C60 72 78 58 100 58 C122 58 140 72 140 100 L140 124 C140 148 122 160 100 161 C78 160 60 148 60 124 Z'
FACE_BALD = 'M62 102 C60 62 80 40 100 40 C120 40 140 62 138 102 C138 136 122 162 100 164 C78 162 62 136 62 102 Z'

# ---------- Isa ----------
skin, hair = '#e9bf9f', '#2f1d15'
ISA = (
    # mismo corte que Lenva (melena con raya al lado), en castaño
    shape('M100 32 C62 32 40 58 40 102 L40 152 C52 160 64 158 72 150 L72 124 L128 124 L128 150 C136 158 148 160 160 152 L160 102 C160 58 138 32 100 32 Z', hair)
    + ears(skin) + shape(FACE_SQUARE, skin)
    + shape('M88 32 C62 34 46 54 45 92 L46 110 C53 104 57 95 61 86 C68 72 78 62 88 56 Z', hair)
    + shape('M88 32 C128 30 154 52 155 94 L154 112 C147 104 143 94 139 86 C128 68 108 60 88 56 Z', hair)
    + line('M98 40 C116 40 134 50 144 68', 2.4, '#5a3a2b')
    + hoop(56, 134, 9.5, GOLD) + hoop(144, 134, 9.5, GOLD)
    + brows(95, 4.2) + eye(80, 113, -1, '#a8692d') + eye(120, 113, 1, '#a8692d') + nose() + full_lips('#c4635b')
)

# ---------- Pili ----------
skin, hair = '#e9bf9f', '#7a361a'
PILI = (
    ears(skin) + shape(FACE_OVAL, skin)
    + shape('M100 30 C64 30 46 52 47 90 L50 112 C54 106 56 98 58 90 L64 80 L68 88 L76 72 L82 82 L92 66 L98 76 L110 62 C124 64 134 72 140 84 C143 94 145 102 148 110 L153 90 C154 52 136 30 100 30 Z', hair)
    + line('M112 40 C124 44 134 52 140 64', 2.4, '#4a1d0b')
    + hoop(58, 130, 5, GOLD, 3) + hoop(142, 130, 5, GOLD, 3)
    + brows(95, 3.4) + eye(80, 113, -1, '#7a4a26') + eye(120, 113, 1, '#7a4a26') + nose() + full_lips('#c4635b')
)

# ---------- Lenva ----------
skin, hair = '#8b5636', '#151010'
LENVA = (
    shape('M100 32 C62 32 40 58 40 102 L40 152 C52 160 64 158 72 150 L72 124 L128 124 L128 150 C136 158 148 160 160 152 L160 102 C160 58 138 32 100 32 Z', hair)
    + ears(skin) + shape(FACE_SQUARE, skin)
    + shape('M88 32 C62 34 46 54 45 92 L46 110 C53 104 57 95 61 86 C68 72 78 62 88 56 Z', hair)
    + shape('M88 32 C128 30 154 52 155 94 L154 112 C147 104 143 94 139 86 C128 68 108 60 88 56 Z', hair)
    + line('M98 40 C116 40 134 50 144 68', 2.4, '#3d3230')
    + stud(60, 128, 3.4, GOLD) + stud(140, 128, 3.4, GOLD)
    + brows(94, 4.6, 4) + eye(80, 113, -1, '#1c1412') + eye(120, 113, 1, '#1c1412') + nose() + full_lips('#5e2f2b')
)

# ---------- Pastu ----------
skin = '#e8b996'
stubble = ('<path d="M66 120 C68 150 84 163 100 164 C116 163 132 150 134 120 C130 133 121 139 112 139 Q100 136 88 139 C79 139 70 133 66 120 Z" fill="#5a3d2e" opacity=".32"/>'
           + shape('M85 139.5 Q92 133 100 136 Q108 133 115 139.5 Q108 137.5 100 139.5 Q92 137.5 85 139.5 Z', '#4a3226', 1.6))
PASTU = (
    ears(skin, 114) + shape(FACE_BALD, skin)
    + line('M78 56 C84 49 92 46 98 45', 3.4, '#ffffff')
    + stubble
    + hoop(141, 128, 4.6, SILVER, 3)
    + brows(94, 4, 3) + eye(80, 113, -1, '#3f9a52', lashes=False) + eye(120, 113, 1, '#3f9a52', lashes=False) + nose() + smile(142)
)

for tid, name, art in [('isa', 'Isa', ISA), ('pili', 'Pili', PILI), ('lenva', 'Lenva', LENVA), ('pastu', 'Pastu', PASTU)]:
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Avatar de {name}">'
           f'<title>Avatar de {name}</title>{background()}<g transform="translate(100 106) scale(.9) translate(-100 -106)">{art}</g></g></svg>\n')
    with open(os.path.join(OUT, tid + '.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)
print('ok')
