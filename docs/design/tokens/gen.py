from color import *
import json

def tok(L, C, h):
    C = min(C, max_chroma(L, h) * 0.98) if C > 0 else 0
    return (L, round(C, 4), h)

def css(t):
    L, C, h = t
    return f"oklch({L:.3f} {C:.4f} {h})" if C > 0 else f"oklch({L:.3f} 0 0)"

NEU = {
    'light': {
        'surface-0': (0.975, 0.003, 260), 'surface-1': (1, 0, 0), 'surface-2': (0.955, 0.004, 260), 'surface-3': (0.925, 0.005, 260),
        'line': (0.915, 0.005, 260), 'line-strong': (0.64, 0.012, 260),
        'text-strong': (0.215, 0.012, 260), 'text': (0.32, 0.012, 260), 'text-subtle': (0.50, 0.012, 260), 'text-disabled': (0.68, 0.008, 260),
        'danger': (0.52, 0.19, 27), 'danger-soft': (0.955, 0.025, 27), 'success': (0.49, 0.12, 150),
        'warning': (0.80, 0.15, 80), 'warning-text': (0.50, 0.10, 70), 'focus': (0.55, 0.19, 258),
        'ink': (0.215, 0.012, 260), 'on-ink': (1, 0, 0),
    },
    'dark': {
        'surface-0': (0.19, 0.008, 260), 'surface-1': (0.25, 0.009, 260), 'surface-2': (0.30, 0.011, 260), 'surface-3': (0.35, 0.012, 260),
        'line': (0.33, 0.012, 260), 'line-strong': (0.56, 0.012, 260),
        'text-strong': (0.95, 0.004, 260), 'text': (0.905, 0.005, 260), 'text-subtle': (0.75, 0.01, 260), 'text-disabled': (0.55, 0.01, 260),
        'danger': (0.75, 0.15, 25), 'danger-soft': (0.31, 0.05, 25), 'success': (0.76, 0.14, 150),
        'warning': (0.82, 0.14, 80), 'warning-text': (0.82, 0.14, 80), 'focus': (0.74, 0.13, 258),
        'ink': (0.95, 0.004, 260), 'on-ink': (0.19, 0.008, 260),
    },
}
# Curated pastel group palette (2026-09-29 v2). key, Korean name, hue, light-solid L, target C.
# Hand-tuned per color (not a uniform hue sweep): yellows lighter/brighter, blues deeper, plus dusty (sage, mauve) and a neutral (greige).
PALETTE = [
    ('cherry', '체리블라썸', 355, 0.885, 0.065), ('rose', '로즈', 8, 0.82, 0.10), ('coral', '코랄', 32, 0.81, 0.105),
    ('peach', '피치', 52, 0.87, 0.075), ('apricot', '살구', 68, 0.84, 0.10), ('mango', '망고', 82, 0.87, 0.12),
    ('butter', '버터', 96, 0.925, 0.10), ('lemon', '레몬', 108, 0.945, 0.13), ('lime', '라임', 125, 0.905, 0.13),
    ('pistachio', '피스타치오', 138, 0.855, 0.085), ('sage', '세이지', 150, 0.80, 0.05), ('mint', '민트', 162, 0.885, 0.085),
    ('aqua', '아쿠아', 185, 0.885, 0.075), ('teal', '틸', 196, 0.795, 0.075), ('sky', '스카이', 225, 0.875, 0.065),
    ('baby', '베이비블루', 240, 0.83, 0.08), ('cobalt', '코발트', 258, 0.76, 0.10), ('periwinkle', '페리윙클', 272, 0.82, 0.085),
    ('lavender', '라벤더', 292, 0.85, 0.075), ('lilac', '라일락', 306, 0.80, 0.10), ('orchid', '오키드', 322, 0.82, 0.10),
    ('pink', '핑크', 342, 0.845, 0.09), ('mauve', '모브', 335, 0.72, 0.065), ('greige', '그레이지', 70, 0.84, 0.018),
]
DEFAULT_KEY = 'baby'

def group_tokens(h, L, C):
    return {
        'light': {
            'solid': tok(L, C, h),                                  # pastel fill; text on it is always ink
            'text': tok(0.44, min(0.11, C * 1.1 + 0.02), h),        # deep tone: labels + indicators on white/soft
            'soft': tok(0.965, min(0.03, C * 0.45), h),
            'soft-strong': tok(0.925, min(0.05, C * 0.7), h),
        },
        'dark': {
            'solid': tok(L - 0.02, C, h),
            'text': tok(0.86, C * 0.9, h),                          # pastel itself reads as text on dark
            'soft': tok(0.30, min(0.045, C * 0.6), h),
            'soft-strong': tok(0.36, min(0.06, C * 0.8), h),
        },
    }

for mode in NEU:
    for k, v in NEU[mode].items():
        NEU[mode][k] = tok(*v)
Ys = {m: {k: Y(*v) for k, v in NEU[m].items()} for m in NEU}

presets = {}
INK = {'light': Ys['light']['ink'], 'dark': Ys['dark']['surface-0']}
for key, name, h, L, C in PALETTE:
    p = group_tokens(h, L, C)
    yl = {k: Y(*v) for k, v in p['light'].items()}
    yd = {k: Y(*v) for k, v in p['dark'].items()}
    c = {
        'L ink/solid': cr(INK['light'], yl['solid']),
        'L ink/soft-strong': cr(INK['light'], yl['soft-strong']),
        'L text/surface-1': cr(yl['text'], Ys['light']['surface-1']),
        'L text/surface-0': cr(yl['text'], Ys['light']['surface-0']),
        'L text/soft': cr(yl['text'], yl['soft']),
        'D surface-0/solid': cr(INK['dark'], yd['solid']),
        'D text/surface-1': cr(yd['text'], Ys['dark']['surface-1']),
        'D text/soft': cr(yd['text'], yd['soft']),
        'D text-strong/soft-strong': cr(Ys['dark']['text-strong'], yd['soft-strong']),
    }
    presets[key] = {
        'name': name, 'hue': h,
        'light': {k: hexc(*v) for k, v in p['light'].items()},
        'dark': {k: hexc(*v) for k, v in p['dark'].items()},
        'css': p,
        'min': round(min(c.values()), 2),
        'c': {k: round(v, 2) for k, v in c.items()},
        'clamped': [],
    }

json.dump({h: {k: v for k, v in d.items() if k != 'css'} for h, d in presets.items()}, open('presets.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
json.dump([(m, k, hexc(*v), css(v)) for m in NEU for k, v in NEU[m].items()], open('neutrals.json', 'w'), ensure_ascii=False)

L = []
w = L.append
w("/* IdolUniv design tokens — DRAFT 2026-09-29. Direction A: neutral canvas + group color.")
w("   Generated by a script; every value is inside sRGB and was checked for WCAG 2.x contrast.")
w("   Spec: docs/design/TOKENS.md. Not wired into app/globals.css yet. */")
w("")
for mode, sel in [('light', ':root'), ('dark', '.dark')]:
    w(f"{sel} {{")
    for k, v in NEU[mode].items():
        w(f"  --iu-{k}: {css(v)}; /* {hexc(*v)} */")
    w("  /* outside a group space, 'group' = ink */")
    w("  --iu-group-solid: var(--iu-ink);")
    w("  --iu-group-on-solid: var(--iu-on-ink);")
    w("  --iu-group-text: var(--iu-text-strong);")
    w("  --iu-group-soft: var(--iu-surface-2);")
    w("  --iu-group-soft-strong: var(--iu-surface-3);")
    w("}")
    w("")
w("/* shadcn semantic names -> IdolUniv tokens, so components/ui keep working.")
w("   Note: shadcn 'accent' is a hover surface (menus, ghost buttons), not a brand color. */")
w(":root {")
for a, b in [('background', 'surface-0'), ('foreground', 'text'), ('card', 'surface-1'), ('card-foreground', 'text'),
             ('popover', 'surface-1'), ('popover-foreground', 'text'), ('primary', 'group-solid'), ('primary-foreground', 'group-on-solid'),
             ('secondary', 'surface-2'), ('secondary-foreground', 'text-strong'), ('muted', 'surface-2'), ('muted-foreground', 'text-subtle'),
             ('accent', 'surface-2'), ('accent-foreground', 'text-strong'), ('destructive', 'danger'), ('border', 'line'),
             ('input', 'line-strong'), ('ring', 'focus'), ('sidebar', 'surface-1'), ('sidebar-foreground', 'text'),
             ('sidebar-primary', 'group-solid'), ('sidebar-primary-foreground', 'group-on-solid'), ('sidebar-accent', 'surface-2'),
             ('sidebar-accent-foreground', 'text-strong'), ('sidebar-border', 'line'), ('sidebar-ring', 'focus')]:
    w(f"  --{a}: var(--iu-{b});")
w("  --radius: 0.75rem;")
w("}")
w("")
w("/* Group palette: 24 curated pastels. Use <section data-group-color=\"peach\">.")
w("   Rules: text/icons ON the pastel solid are always ink (--iu-group-on-solid).")
w("   --iu-group-text is the deep tone for labels and state indicators (tab underline, heart, progress) on white/soft surfaces.")
w("   Chroma is pre-clamped so the browser never gamut-maps. */")
for key, d in presets.items():
    for mode, sel in [('light', f'[data-group-color="{key}"]'), ('dark', f'.dark [data-group-color="{key}"], [data-group-color="{key}"].dark')]:
        p = d['css'][mode]
        on = "var(--iu-ink)" if mode == 'light' else "var(--iu-surface-0)"
        w(f"{sel} {{ --iu-group-solid: {css(p['solid'])}; --iu-group-on-solid: {on}; --iu-group-text: {css(p['text'])}; "
          f"--iu-group-soft: {css(p['soft'])}; --iu-group-soft-strong: {css(p['soft-strong'])}; }} /* {d['name']} */")
open('tokens.draft.css', 'w', encoding='utf-8').write("\n".join(L) + "\n")

print('min contrast across all presets:', min(d['min'] for d in presets.values()))
worst = {}
for h, d in presets.items():
    for k, v in d['c'].items():
        if k not in worst or v < worst[k][0]:
            worst[k] = (v, h)
for k, v in worst.items():
    print(f"  {k:30} {v[0]:5.2f} @ {v[1]}")
print('dark surface steps', [round(cr(Ys['dark'][a], Ys['dark'][b]), 3) for a, b in
                             [('surface-0', 'surface-1'), ('surface-1', 'surface-2'), ('surface-2', 'surface-3')]])
for m in ['light', 'dark']:
    for fg in ['text-strong', 'text', 'text-subtle', 'danger', 'success', 'warning-text', 'focus']:
        print(m, fg, [round(cr(Ys[m][fg], Ys[m][b]), 2) for b in ['surface-0', 'surface-1', 'surface-2', 'surface-3']])
    print(m, 'line-strong/surface-1', round(cr(Ys[m]['line-strong'], Ys[m]['surface-1']), 2))
print('L white/danger', round(cr(1, Ys['light']['danger']), 2), 'L ink/warning', round(cr(Ys['light']['ink'], Ys['light']['warning']), 2),
      'D surface-0/danger', round(cr(Ys['dark']['surface-0'], Ys['dark']['danger']), 2))
print('neutral gamut ok', all(in_gamut(*v) for m in NEU for v in NEU[m].values()))
