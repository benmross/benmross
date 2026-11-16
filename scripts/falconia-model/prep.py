"""Level and crop the Scaniverse Falconia V3 scan, write an OBJ for glTF conversion and a height map preview."""
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
