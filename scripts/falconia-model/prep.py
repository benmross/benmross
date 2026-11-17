"""Level and crop the Scaniverse Falconia V3 scan, fill its holes, write an OBJ for glTF conversion and a height map preview."""
import numpy as np
from PIL import Image

SRC = '/home/benmross/herald/projects/falconia-model-src/Falconia V3/Falconia_V3.obj'
OUT = '/home/benmross/herald/projects/falconia-model-src/work/terrain.obj'
import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)

V, T, F = [], [], []
for line in open(SRC):
    if line.startswith('v '):
        V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '):
        T.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('f '):
        F.append([[int(i) for i in p.split('/')[:2]] for p in line.split()[1:4]])
V = np.array(V); T = np.array(T); F = np.array(F) - 1  # (n,3,2)
print('faces', F.shape)

# fit a plane to the table surface (central region, typical height band)
c = V[(np.abs(V[:, 0]) < 0.9) & (np.abs(V[:, 2]) < 1.3) & (V[:, 1] > 0.22) & (V[:, 1] < 0.36)]
A = np.c_[c[:, 0], c[:, 2], np.ones(len(c))]
for _ in range(3):
    coef, *_ = np.linalg.lstsq(A, c[:, 1], rcond=None)
    r = c[:, 1] - A @ coef
    keep = np.abs(r) < 2.5 * r.std()
    c, A = c[keep], A[keep]
a, b, d = coef
n = np.array([-a, 1.0, -b]); n /= np.linalg.norm(n)
print('plane', coef, 'normal', n)
# rotation taking n to +y
y = np.array([0, 1.0, 0]); v = np.cross(n, y); s = np.linalg.norm(v); cth = n @ y
vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
R = np.eye(3) + vx + vx @ vx * ((1 - cth) / (s * s))
P = (V - np.array([0, d, 0])) @ R.T
h = P[:, 1]
print('height pct', np.percentile(h, [0.5, 1, 5, 50, 95, 99, 99.5]).round(4))

# keep the table: drop walls and anything under it
ok_v = (h < 0.12) & (h > -0.16)
fv = F[:, :, 0]
ok_f = ok_v[fv].all(1)
# drop faces with very long edges (scan bridging artefacts)
e = np.linalg.norm(P[fv[:, [1, 2, 0]]] - P[fv], axis=2).max(1)
ok_f &= e < 0.06
F2 = F[ok_f]

# keep the largest connected piece (drops floating scraps around the table)
lab = np.arange(len(P))
f0 = F2[:, :, 0]
for it in range(2000):
    m = lab[f0].min(1)
    new = lab.copy()
    for k in range(3):
        np.minimum.at(new, f0[:, k], m)
    new = new[new]
    if (new == lab).all():
        break
    lab = new
fl = lab[f0[:, 0]]
vals, counts = np.unique(fl, return_counts=True)
F2 = F2[fl == vals[counts.argmax()]]
print('components', len(vals), 'largest', counts.max(), 'iters', it)

# trim the ragged skirt that hangs off the table edge
f0 = F2[:, :, 0]
u0 = np.unique(f0)
x0, x1 = P[u0, 0].min(), P[u0, 0].max()
z0, z1 = P[u0, 2].min(), P[u0, 2].max()
mg = 0.2
fx, fz, fh = P[f0, 0], P[f0, 2], P[f0, 1]
edge = ((fx < x0 + mg) | (fx > x1 - mg) | (fz < z0 + mg) | (fz > z1 - mg)).any(1)
nrm = np.cross(P[f0[:, 1]] - P[f0[:, 0]], P[f0[:, 2]] - P[f0[:, 0]])
ny = np.abs(nrm[:, 1]) / (np.linalg.norm(nrm, axis=1) + 1e-12)
F2 = F2[~(edge & ((fh < -0.012).any(1) | ((ny < 0.3) & (fh < 0.02).any(1))))]
used = np.unique(F2[:, :, 0])
Pu = P[used]
cx, cz = (Pu[:, 0].min() + Pu[:, 0].max()) / 2, (Pu[:, 2].min() + Pu[:, 2].max()) / 2
P[:, 0] -= cx; P[:, 2] -= cz
Pu = P[used]
print('kept faces', len(F2), 'extent x', Pu[:, 0].min().round(3), Pu[:, 0].max().round(3), 'z', Pu[:, 2].min().round(3), Pu[:, 2].max().round(3), 'h', Pu[:, 1].min().round(3), Pu[:, 1].max().round(3))

# fill the holes inside the table: every boundary loop except the outer edge. The scan
# leaves gaps where the phone saw nothing, and the long-edge filter above opens more.
def loops_of(faces):
    from collections import defaultdict
    cnt = defaultdict(int)
    for tri in faces[:, :, 0]:
        for k in range(3):
            a, b = int(tri[k]), int(tri[(k + 1) % 3])
            cnt[(min(a, b), max(a, b))] += 1
    # directed boundary edges, with the texture coordinate each end has in its face
    nxt = defaultdict(list)
    vt_of = {}
    for tri in faces:
        for k in range(3):
            a, b = int(tri[k][0]), int(tri[(k + 1) % 3][0])
            if cnt[(min(a, b), max(a, b))] == 1:
                nxt[b].append(a)  # reversed, so the fill faces wind like their neighbours
                vt_of.setdefault(a, int(tri[k][1]))
                vt_of.setdefault(b, int(tri[(k + 1) % 3][1]))
    loops, seen = [], set()
    for start in list(nxt):
        for first in list(nxt[start]):
            if (start, first) in seen:
                continue
            loop, cur, prev = [start], first, start
            seen.add((start, first))
            while cur != start and len(loop) < 20000:
                loop.append(cur)
                opts = [n for n in nxt[cur] if (cur, n) not in seen]
                if not opts:
                    break
                prev, cur = cur, opts[0]
                seen.add((prev, cur))
            if cur == start and len(loop) >= 3:
                loops.append(loop)
    return loops, vt_of

def area2(pts):
    x, z = pts[:, 0], pts[:, 1]
    return 0.5 * np.sum(x * np.roll(z, -1) - np.roll(x, -1) * z)

def ear_clip(pts):
    """Triangles (as index triples into pts) for a simple polygon in 2D, or None."""
    idx = list(range(len(pts)))
    if area2(pts) < 0:
        idx.reverse()
    out = []
    guard = 0
    while len(idx) > 3 and guard < 10 * len(pts) ** 2:
        guard += 1
        n = len(idx)
        for i in range(n):
            a, b, c = idx[i - 1], idx[i], idx[(i + 1) % n]
            pa, pb, pc = pts[a], pts[b], pts[c]
            cr = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])
            if cr <= 1e-14:
                continue
            ok = True
            for j in idx:
                if j in (a, b, c):
                    continue
                p = pts[j]
                d1 = (pb[0] - pa[0]) * (p[1] - pa[1]) - (pb[1] - pa[1]) * (p[0] - pa[0])
                d2 = (pc[0] - pb[0]) * (p[1] - pb[1]) - (pc[1] - pb[1]) * (p[0] - pb[0])
                d3 = (pa[0] - pc[0]) * (p[1] - pc[1]) - (pa[1] - pc[1]) * (p[0] - pc[0])
                if d1 >= 0 and d2 >= 0 and d3 >= 0:
                    ok = False
                    break
            if ok:
                out.append((a, b, c))
                del idx[i]
                break
        else:
            return None
    if len(idx) == 3:
        out.append(tuple(idx))
    return out

loops, vt_of = loops_of(F2)
outer = max(loops, key=lambda l: abs(area2(P[l][:, [0, 2]])))
Tl = [list(t) for t in T]
Pl = [list(p) for p in P]
new = []
filled = 0
for loop in loops:
    if loop is outer:
        continue
    pts = P[loop][:, [0, 2]]
    vts = np.array([T[vt_of[v]] for v in loop])
    # one texture island if neighbouring corners are close in texture space; otherwise the
    # patch takes the texture at a single corner rather than smearing across islands
    step = np.linalg.norm(vts - np.roll(vts, -1, 0), axis=1).max()
    one = step < 0.03
    vt_patch = vt_of[loop[0]]
    tris = ear_clip(pts)
    if tris is None:
        # fan from the middle
        c = P[loop].mean(0)
        Pl.append(list(c))
        ci = len(Pl) - 1
        Tl.append(list(vts.mean(0)) if one else list(T[vt_patch]))
        cti = len(Tl) - 1
        for k in range(len(loop)):
            a, b = loop[k], loop[(k + 1) % len(loop)]
            new.append([[a, vt_of[a] if one else vt_patch], [b, vt_of[b] if one else vt_patch], [ci, cti]])
    else:
        for (i, j, k) in tris:
            tri = [loop[i], loop[j], loop[k]]
            new.append([[v, vt_of[v] if one else vt_patch] for v in tri])
    filled += 1
if new:
    F2 = np.concatenate([F2, np.array(new)], 0)
P = np.array(Pl)
T = np.array(Tl)
print('holes filled', filled, 'of', len(loops) - 1, 'new faces', len(new))

with open(OUT, 'w') as f:
    f.write('mtllib terrain.mtl\nusemtl main\n')
    np.savetxt(f, P, fmt='v %.5f %.5f %.5f')
    np.savetxt(f, T, fmt='vt %.6f %.6f')
    ff = (F2 + 1).reshape(len(F2), 6)
    np.savetxt(f, ff, fmt='f %d/%d %d/%d %d/%d')
open(os.path.dirname(OUT) + '/terrain.mtl', 'w').write('newmtl main\nKd 1 1 1\nmap_Kd terrain.jpg\n')

# height map preview, top down
res = 900
x, z, hh = Pu[:, 0], Pu[:, 2], Pu[:, 1]
xi = ((x - x.min()) / (x.max() - x.min()) * (res - 1)).astype(int)
zi = ((z - z.min()) / (z.max() - z.min()) * (res - 1)).astype(int)
img = np.full((res, res), np.nan)
o = np.argsort(hh); img[zi[o], xi[o]] = hh[o]
lo, hi = np.nanpercentile(img, [1, 99.5])
g = np.nan_to_num((img - lo) / (hi - lo), nan=0).clip(0, 1)
rgb = np.stack([g, g ** 0.7 * 0.8, 1 - g], -1) * (~np.isnan(img))[..., None]
Image.fromarray((rgb * 255).astype(np.uint8)).save('/tmp/falc_height.png')
print('x range', x.min(), x.max(), 'z range', z.min(), z.max())
# print local maxima-ish: coarse grid of max heights
gx, gz = 12, 16
H = np.full((gz, gx), np.nan)
bx = ((x - x.min()) / (x.max() - x.min() + 1e-9) * gx).astype(int); bz = ((z - z.min()) / (z.max() - z.min() + 1e-9) * gz).astype(int)
for i in range(gz):
    for j in range(gx):
        m = (bz == i) & (bx == j)
        if m.sum() > 20:
            H[i, j] = np.percentile(hh[m], 95)
np.set_printoptions(linewidth=200)
print((H * 100).round(0))
