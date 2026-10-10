import math
import random

random.seed(1337)

def squircle_dist(x, y, cx=256, cy=256, r=188, p=3.6):
    dx = abs(x - cx) / r
    dy = abs(y - cy) / r
    return (dx**p + dy**p)**(1.0 / p)

def get_squircle_point(angle, cx=256, cy=256, r=188, p=3.6):
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    denom = (abs(cos_a)**p + abs(sin_a)**p)**(1.0 / p)
    x = cx + (r * cos_a) / denom
    y = cy + (r * sin_a) / denom
    return x, y

lines = []
lines.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">')
lines.append('  <defs>')
lines.append('    <!-- Discord Blurple Plush Base -->')
lines.append('    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">')
lines.append('      <stop offset="0%" stop-color="#6776F9" />')
lines.append('      <stop offset="40%" stop-color="#5865F2" />')
lines.append('      <stop offset="100%" stop-color="#3B44B2" />')
lines.append('    </linearGradient>')
lines.append('    <radialGradient id="topGlow" cx="50%" cy="20%" r="75%">')
lines.append('      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.30" />')
lines.append('      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.05" />')
lines.append('      <stop offset="100%" stop-color="#000000" stop-opacity="0.22" />')
lines.append('    </radialGradient>')
lines.append('    <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">')
lines.append('      <stop offset="0%" stop-color="#FFFFFF" />')
lines.append('      <stop offset="100%" stop-color="#F2F4FA" />')
lines.append('    </linearGradient>')
lines.append('    <linearGradient id="flapGrad" x1="0%" y1="0%" x2="0%" y2="100%">')
lines.append('      <stop offset="0%" stop-color="#FFFFFF" />')
lines.append('      <stop offset="100%" stop-color="#E6EAF8" />')
lines.append('    </linearGradient>')
lines.append('  </defs>')

# Base Squircle
lines.append('  <!-- Plush Fur Squircle Base -->')
lines.append('  <rect x="56" y="56" width="400" height="400" rx="98" fill="url(#bgGrad)" />')
lines.append('  <rect x="56" y="56" width="400" height="400" rx="98" fill="url(#topGlow)" />')

# Undercoat Fur Fringe (Denser, softer)
lines.append('  <!-- Deep Fluffy Fur Undercoat -->')
lines.append('  <g stroke-linecap="round">')
deep_colors = ['#4752C4', '#3E47B6', '#353D9E', '#505CD8']
for i in range(1200):
    angle = (i / 1200.0) * 2.0 * math.pi + random.uniform(-0.006, 0.006)
    bx, by = get_squircle_point(angle, r=188 + random.uniform(-6, 2))
    hair_len = random.uniform(10, 24)
    curl = random.uniform(-0.4, 0.4)
    hair_angle = angle + curl
    ex = bx + math.cos(hair_angle) * hair_len
    ey = by + math.sin(hair_angle) * hair_len
    cx = (bx + ex) / 2.0 + random.uniform(-4, 4)
    cy = (by + ey) / 2.0 + random.uniform(-4, 4)
    col = random.choice(deep_colors)
    width = random.uniform(2.5, 4.2)
    opacity = random.uniform(0.55, 0.9)
    lines.append(f'    <path d="M {bx:.1f} {by:.1f} Q {cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}" stroke="{col}" stroke-width="{width:.1f}" stroke-opacity="{opacity:.2f}" fill="none" />')
lines.append('  </g>')

# Topcoat Fur Fringe (Vibrant Discord Blurple with light tips)
lines.append('  <!-- Fluffy Fur Fringe (OneUI Plush Style) -->')
lines.append('  <g stroke-linecap="round">')
top_colors = ['#5865F2', '#6B79FA', '#7F8DFF', '#939FFF', '#505CE0']
for i in range(1600):
    angle = (i / 1600.0) * 2.0 * math.pi + random.uniform(-0.008, 0.008)
    bx, by = get_squircle_point(angle, r=190 + random.uniform(-5, 4))
    hair_len = random.uniform(8, 26)
    curl = random.uniform(-0.45, 0.45)
    hair_angle = angle + curl
    ex = bx + math.cos(hair_angle) * hair_len
    ey = by + math.sin(hair_angle) * hair_len
    cx = (bx + ex) / 2.0 + random.uniform(-3, 3)
    cy = (by + ey) / 2.0 + random.uniform(-3, 3)
    
    # Highlight tips on top half
    if by < 220 and random.random() < 0.45:
        col = random.choice(['#8E9AFF', '#A4AFFF', '#7B88FF'])
    else:
        col = random.choice(top_colors)
        
    width = random.uniform(1.8, 3.4)
    opacity = random.uniform(0.5, 0.95)
    lines.append(f'    <path d="M {bx:.1f} {by:.1f} Q {cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}" stroke="{col}" stroke-width="{width:.1f}" stroke-opacity="{opacity:.2f}" fill="none" />')
lines.append('  </g>')

# Dense Surface Velvet Texture
lines.append('  <!-- Fluffy Velvet Cushion Surface -->')
lines.append('  <g stroke-linecap="round">')
surface_colors = ['#5865F2', '#6876F8', '#4C56C8', '#7885FF', '#3D45B2']
for _ in range(2400):
    rx = random.uniform(66, 446)
    ry = random.uniform(66, 446)
    if squircle_dist(rx, ry, r=185) < 0.96:
        hair_len = random.uniform(6, 16)
        angle = random.uniform(0, 2 * math.pi)
        ex = rx + math.cos(angle) * hair_len
        ey = ry + math.sin(angle) * hair_len
        cx = (rx + ex) / 2.0 + random.uniform(-2, 2)
        cy = (ry + ey) / 2.0 + random.uniform(-2, 2)
        
        if ry < 200 and random.random() < 0.4:
            col = random.choice(['#929EFF', '#7A87FF', '#A8B2FF'])
            opacity = random.uniform(0.4, 0.75)
        else:
            col = random.choice(surface_colors)
            opacity = random.uniform(0.3, 0.65)
            
        width = random.uniform(1.6, 3.2)
        lines.append(f'    <path d="M {rx:.1f} {ry:.1f} Q {cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}" stroke="{col}" stroke-width="{width:.1f}" stroke-opacity="{opacity:.2f}" fill="none" />')
lines.append('  </g>')

# White Mail Envelope (Значок письма)
lines.append('  <!-- Tactile White Plush Envelope (100% Crisp & Recognizable) -->')
# Shadow of envelope onto plush fur bed
lines.append('  <rect x="106" y="166" width="300" height="204" rx="30" fill="#15123A" fill-opacity="0.5" />')

# Envelope Body
lines.append('  <rect x="106" y="154" width="300" height="204" rx="28" fill="url(#envelopeGrad)" />')

# Envelope soft micro-felt felt fringe around the white edges
lines.append('  <!-- Soft Plush Envelope Edges -->')
lines.append('  <g stroke-linecap="round">')
for _ in range(450):
    side = random.randint(0, 3)
    if side == 0: # Top
        px = random.uniform(114, 398)
        py = 154
        angle = -math.pi / 2 + random.uniform(-0.55, 0.55)
    elif side == 1: # Bottom
        px = random.uniform(114, 398)
        py = 358
        angle = math.pi / 2 + random.uniform(-0.55, 0.55)
    elif side == 2: # Left
        px = 106
        py = random.uniform(162, 350)
        angle = math.pi + random.uniform(-0.55, 0.55)
    else: # Right
        px = 406
        py = random.uniform(162, 350)
        angle = 0 + random.uniform(-0.55, 0.55)
        
    hlen = random.uniform(3, 8)
    ex = px + math.cos(angle) * hlen
    ey = py + math.sin(angle) * hlen
    lines.append(f'    <path d="M {px:.1f} {py:.1f} L {ex:.1f} {ey:.1f}" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.8" fill="none" />')
lines.append('  </g>')

# Bottom fold diagonal accents (Discord purple lines)
lines.append('  <path d="M 116 346 L 222 260" fill="none" stroke="#5865F2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.75" />')
lines.append('  <path d="M 396 346 L 290 260" fill="none" stroke="#5865F2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.75" />')

# Flap shadow cast onto lower envelope
lines.append('  <path d="M 114 162 L 256 278 L 398 162 Z" fill="#24205D" fill-opacity="0.22" />')

# Top Flap (folded down V-shape)
lines.append('  <path d="M 112 162 C 112 156 116 154 124 154 L 388 154 C 396 154 400 156 400 162 L 263 272 C 259 275 253 275 249 272 Z" fill="url(#flapGrad)" />')

# Top Flap Crisp Fold Outline
lines.append('  <path d="M 114 160 L 252 270 C 254.5 272 257.5 272 260 270 L 398 160" fill="none" stroke="#5865F2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />')

lines.append('</svg>')

with open('public/icon.svg', 'w') as f:
    f.write('\n'.join(lines))

print("public/icon.svg written with fluffy fur texture")
