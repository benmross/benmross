"""Extract the SMCSKart mainboard's top side from its KiCad file for the kart scene.

usage: python3 -I scripts/kart-board/extract.py path/to/SMCSKart-Mainboard.kicad_pcb public/media/kart/board.json

Source: github.com/PHS-SMCS/SMCSKart-Mainboard (public). Units are millimetres in KiCad's
frame (x right, y down). Only what the camera can see from the front is kept: F.Cu tracks,
vias, front pads, zone fills, front silkscreen and every footprint's place and size.
The silkscreen's list of class members is left out on purpose.
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sexp import find, one, parse  # noqa: E402

# nets that carry a signal the scene shows, the part it leaves from, and its kind
SIGNALS = {
    '/D+': ('USB1', 'cmd'), '/D-': ('USB1', 'cmd'),
    '/TEENSY_CAN_TX': ('U1', 'cmd'), '/TEENSY_CAN_RX': ('U5', 'tel'),
    '/CAN+': ('U5', 'cmd'), '/CAN-': ('U5', 'cmd'),
    '/TEENSY_SDA': ('U1', 'cmd'), '/TEENSY_SCL': ('U1', 'cmd'),
    '/RS232_TxD': ('U1', 'cmd'), '/RS232_RxD': ('J4', 'tel'),
    '/CONTACTOR_TOGGLE': ('U1', 'cmd'), '+24V': ('U3', 'pwr'),
}
KEEP_TEXT = {'SMCSKART MAINBOARD', 'REV 1.0', 'SMCSKART\\nMAINBOARD', '12-36v IN'}


def f(v):
    return round(float(v), 3)


def rot(x, y, deg):
    a = math.radians(deg)
    return x * math.cos(a) + y * math.sin(a), -x * math.sin(a) + y * math.cos(a)


def simplify(pts, eps=0.06):
    """Ramer-Douglas-Peucker on a closed outline: zone fills only paint the board texture."""
    if len(pts) < 4:
        return pts
    def rdp(a, b):
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, at = 0.0, -1
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L
            if d > best:
                best, at = d, i
        if best <= eps:
            return [pts[a]]
        return rdp(a, at) + rdp(at, b)
    return rdp(0, len(pts) - 1) + [pts[-1]]


def main(src, dst):
    t = parse(Path(src).read_text())
    nets = {}

    def net(node):
        n = one(node, 'net')
        if not n:
            return -1
        name = n[1]
        if name not in nets:
            nets[name] = len(nets)
        return nets[name]

    # outline
    xs, ys, radii = [], [], []
    for kind in ('gr_line', 'gr_arc', 'gr_rect'):
        for g in find(t, kind):
            if one(g, 'layer')[1] != 'Edge.Cuts':
                continue
            pts = [one(g, k) for k in ('start', 'end', 'mid')]
            pts = [(float(p[1]), float(p[2])) for p in pts if p]
            for x, y in pts:
                xs.append(x)
                ys.append(y)
            if kind == 'gr_arc':
                (sx, sy), (ex, ey) = pts[0], pts[1]
                radii.append(math.hypot(ex - sx, ey - sy) / math.sqrt(2))
    outline = {'x0': min(xs), 'y0': min(ys), 'x1': max(xs), 'y1': max(ys), 'r': round(max(radii) if radii else 0, 2)}

    tracks = []
    for s in find(t, 'segment'):
        if one(s, 'layer')[1] != 'F.Cu':
            continue
        a, b = one(s, 'start'), one(s, 'end')
        tracks.append([f(a[1]), f(a[2]), f(b[1]), f(b[2]), f(one(s, 'width')[1]), net(s)])
    for s in find(t, 'arc'):
        if one(s, 'layer')[1] != 'F.Cu':
            continue
        a, m, b = one(s, 'start'), one(s, 'mid'), one(s, 'end')
        w = f(one(s, 'width')[1])
        n = net(s)
        tracks.append([f(a[1]), f(a[2]), f(m[1]), f(m[2]), w, n])
        tracks.append([f(m[1]), f(m[2]), f(b[1]), f(b[2]), w, n])

    vias = []
    for v in find(t, 'via'):
        a = one(v, 'at')
        vias.append([f(a[1]), f(a[2]), f(one(v, 'size')[1]), f(one(v, 'drill')[1]), net(v)])

    zones = []
    for z in find(t, 'zone'):
        for fp in find(z, 'filled_polygon'):
            if one(fp, 'layer')[1] != 'F.Cu':
                continue
            pts = [[f(p[1]), f(p[2])] for p in one(fp, 'pts')[1:] if p[0] == 'xy']
            zones.append({'net': net(z), 'pts': simplify(pts)})

    parts, pads, silk, pad_ref = [], [], [], []
    for fpn in find(t, 'footprint'):
        side = one(fpn, 'layer')[1]
        at = one(fpn, 'at')
        fx, fy = float(at[1]), float(at[2])
        fr = float(at[3]) if len(at) > 3 else 0.0
        props = {p[1]: p[2] for p in find(fpn, 'property')}
        # courtyard (or fab) extent, in the footprint's own frame
        ex = []
        for layer in ('F.CrtYd', 'B.CrtYd', 'F.Fab', 'B.Fab'):
            for g in find(fpn, 'fp_line') + find(fpn, 'fp_rect') + find(fpn, 'fp_poly') + find(fpn, 'fp_circle'):
                if one(g, 'layer')[1] != layer:
                    continue
                if g[0] == 'fp_poly':
                    ex += [(float(p[1]), float(p[2])) for p in one(g, 'pts')[1:] if p[0] == 'xy']
                elif g[0] == 'fp_circle':
                    c, e = one(g, 'center'), one(g, 'end')
                    r = math.hypot(float(e[1]) - float(c[1]), float(e[2]) - float(c[2]))
                    ex += [(float(c[1]) - r, float(c[2]) - r), (float(c[1]) + r, float(c[2]) + r)]
                else:
                    ex += [(float(one(g, k)[1]), float(one(g, k)[2])) for k in ('start', 'end')]
            if ex:
                break
        box = [min(p[0] for p in ex), min(p[1] for p in ex), max(p[0] for p in ex), max(p[1] for p in ex)] if ex else [-1, -1, 1, 1]
        lp = [(float(one(pp, 'at')[1]), float(one(pp, 'at')[2]), float(one(pp, 'size')[1]) / 2, float(one(pp, 'size')[2]) / 2) for pp in find(fpn, 'pad')]
        pbox = [round(min(a - w for a, b, w, h in lp), 2), round(min(b - h for a, b, w, h in lp), 2), round(max(a + w for a, b, w, h in lp), 2), round(max(b + h for a, b, w, h in lp), 2)] if lp else box
        parts.append({
            'pbox': pbox,
            'ref': props.get('Reference', ''),
            'value': props.get('Value', ''),
            'fp': fpn[1].split(':')[-1],
            'at': [f(fx), f(fy), f(fr)],
            'side': 'F' if side == 'F.Cu' else 'B',
            'box': [round(v, 2) for v in box],
        })
        for p in find(fpn, 'pad'):
            layers = one(p, 'layers')[1:]
            if side == 'B.Cu' and p[2] != 'thru_hole':
                continue
            if not any(l in ('F.Cu', '*.Cu') for l in layers):
                continue
            pa = one(p, 'at')
            px, py = rot(float(pa[1]), float(pa[2]), fr)
            prot = float(pa[3]) if len(pa) > 3 else fr
            size = one(p, 'size')
            drill = one(p, 'drill')
            shape = {'circle': 0, 'rect': 1, 'roundrect': 2, 'oval': 3}.get(p[3], 1)
            d = 0.0
            if drill and len(drill) > 1:
                d = float(drill[2]) if drill[1] == 'oval' else float(drill[1])
            pads.append([f(fx + px), f(fy + py), f(size[1]), f(size[2]), shape, f(prot), f(d), net(p)])
            pad_ref.append(props.get('Reference', ''))
        # front silkscreen outlines
        for g in find(fpn, 'fp_line') + find(fpn, 'fp_rect') + find(fpn, 'fp_circle') + find(fpn, 'fp_arc'):
            if one(g, 'layer')[1] != 'F.SilkS':
                continue
            if g[0] == 'fp_circle':
                c, e = one(g, 'center'), one(g, 'end')
                cx, cy = rot(float(c[1]), float(c[2]), fr)
                silk.append(['c', f(fx + cx), f(fy + cy), f(math.hypot(float(e[1]) - float(c[1]), float(e[2]) - float(c[2])))])
                continue
            a, b = one(g, 'start'), one(g, 'end')
            ax, ay = rot(float(a[1]), float(a[2]), fr)
            bx, by = rot(float(b[1]), float(b[2]), fr)
            if g[0] == 'fp_rect':
                silk.append(['r', f(fx + ax), f(fy + ay), f(fx + bx), f(fy + by)])
            else:
                silk.append(['l', f(fx + ax), f(fy + ay), f(fx + bx), f(fy + by)])
        ref = one(fpn, 'property')
        for pr in find(fpn, 'property'):
            if pr[1] in ('Reference', 'Value') and one(pr, 'layer') and one(pr, 'layer')[1] == 'F.SilkS' and not one(pr, 'hide'):
                pa = one(pr, 'at')
                px, py = rot(float(pa[1]), float(pa[2]), fr)
                r = float(pa[3]) if len(pa) > 3 else 0
                size = one(one(one(pr, 'effects'), 'font'), 'size')
                silk.append(['t', f(fx + px), f(fy + py), f(r), f(size[1]), pr[2]])

    for g in find(t, 'gr_text'):
        if g[1] not in KEEP_TEXT or one(g, 'layer')[1] != 'F.SilkS':
            continue
        pa = one(g, 'at')
        size = one(one(one(g, 'effects'), 'font'), 'size')
        silk.append(['t', f(pa[1]), f(pa[2]), f(pa[3]) if len(pa) > 3 else 0, f(size[1]), g[1].replace('\\n', '\n')])

    # distance along the copper from each signal's source, so pulses run outward from it
    import heapq
    signals = []
    names = {i: n for n, i in nets.items()}
    for name, (src, kind) in SIGNALS.items():
        if name not in nets:
            continue
        ni = nets[name]
        idx = [i for i, tr in enumerate(tracks) if tr[5] == ni]
        if not idx:
            continue
        key = lambda x, y: (round(x * 20), round(y * 20))
        adj = {}
        for i in idx:
            x1, y1, x2, y2 = tracks[i][:4]
            a, b = key(x1, y1), key(x2, y2)
            L = math.hypot(x2 - x1, y2 - y1)
            adj.setdefault(a, []).append((b, L))
            adj.setdefault(b, []).append((a, L))
        # vias and pads on the net join copper that leaves and rejoins this layer
        joins = [(v[0], v[1], v[2] / 2 + 0.1) for v in vias if v[4] == ni] + [(p[0], p[1], max(p[2], p[3]) / 2 + 0.1) for p in pads if p[7] == ni]
        nodes = list(adj)
        for jx, jy, r in joins:
            near = [n for n in nodes if math.hypot(n[0] / 20 - jx, n[1] / 20 - jy) <= r]
            for a in near:
                for b in near:
                    if a != b:
                        adj[a].append((b, 0.0))
        starts = [(p[0], p[1]) for p, r in zip(pads, pad_ref) if p[7] == ni and r == src]
        dist = {}
        heap = []
        for n in nodes:
            d0 = min((math.hypot(n[0] / 20 - sx, n[1] / 20 - sy) for sx, sy in starts), default=1e9)
            if d0 < 3:
                heapq.heappush(heap, (d0, n))
        while heap:
            d, n = heapq.heappop(heap)
            if n in dist:
                continue
            dist[n] = d
            for m, L in adj[n]:
                if m not in dist:
                    heapq.heappush(heap, (d + L, m))
        far = max(dist.values(), default=0)
        for i in idx:
            x1, y1, x2, y2 = tracks[i][:4]
            da, db = dist.get(key(x1, y1)), dist.get(key(x2, y2))
            if da is None and db is None:
                da = db = far
            elif da is None:
                da = db + math.hypot(x2 - x1, y2 - y1)
            elif db is None:
                db = da + math.hypot(x2 - x1, y2 - y1)
            signals.append([i, round(da, 2), round(db, 2), {'cmd': 0, 'tel': 1, 'pwr': 2}[kind]])

    out = {
        'source': 'github.com/PHS-SMCS/SMCSKart-Mainboard',
        'outline': outline,
        'nets': [n for n, _ in sorted(nets.items(), key=lambda kv: kv[1])],
        'tracks': tracks,
        'vias': vias,
        'zones': zones,
        'pads': pads,
        'parts': parts,
        'silk': silk,
        'signals': signals,
    }
    Path(dst).write_text(json.dumps(out, separators=(',', ':'), ensure_ascii=False))
    print(f'{dst}: {len(tracks)} tracks, {len(vias)} vias, {len(pads)} pads, {len(parts)} parts, {len(zones)} zones, {len(silk)} silk, {Path(dst).stat().st_size // 1024} KB')


if __name__ == '__main__':
    main(*sys.argv[1:3])
