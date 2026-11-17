"""Bake an Arm Pilot session into the Loop section's playback track.

The arm motion is not animated by hand: every phone packet goes through
armtrack's own controller (clutch, heading frame, IK, joint speed and
acceleration limits), stepped at 60 Hz, exactly as `armtrack phone` drives
the live view. The page only plays the result back against scroll.

    # a real session, recorded with `armtrack phone --record session.jsonl`
    uv run --project ../stereo-hand python scripts/loop-track/bake.py session.jsonl
    # the scripted stand-in used until a real session is recorded
    uv run --project ../stereo-hand python scripts/loop-track/bake.py --scripted

Writes src/assets/models/loop-track.json.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

from armtrack.arm.kinematics import ARM, JOINTS
from armtrack.tracking.phone import PhoneArm

OUT = Path(__file__).resolve().parents[2] / "src/assets/models/loop-track.json"
RATE = 60
KEEP = 2  # write every second step: 30 frames per second of session


def rot_matrix(yaw: float, pitch: float, roll: float) -> np.ndarray:
    """Phone held screen-up, top edge forward (ARKit world: x right, y up, z toward the operator),
    then turned by yaw about up, pitch about its right edge, roll about its long axis.
    Returns the ARKit camera rotation: columns are camera x (bottom edge), y (right side), z (out of screen)."""
    base = np.array([[0, 1, 0], [0, 0, 1], [1, 0, 0]], dtype=float)  # columns x=(0,0,1) y=(1,0,0) z=(0,1,0)
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])          # about world up
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])          # about world right: nose up for +pitch
    Rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]])          # about world z (the long axis at rest)
    return Ry @ Rx @ Rz @ base


# time (s), phone position (m: right, up, toward you), pitch, roll, yaw (deg), thumb down, grip open
KEYS = [
    (0.0, (0.0, 0.0, 0.0), 0, 0, 0, 0, 1.0),
    (1.6, (0.0, 0.0, 0.0), 0, 0, 0, 0, 1.0),
    (1.7, (0.0, 0.0, 0.0), 0, 0, 0, 1, 1.0),       # thumb down: engage
    (4.4, (0.02, -0.21, -0.06), -55, 0, 0, 1, 1.0),  # reach down to the rock
    (5.0, (0.02, -0.22, -0.065), -58, 0, 0, 1, 1.0),
    (5.9, (0.02, -0.22, -0.065), -58, 0, 0, 1, 0.0),  # close the gripper
    (7.6, (0.01, -0.03, -0.04), -20, 0, 0, 1, 0.0),   # lift
    (7.7, (0.01, -0.03, -0.04), -20, 0, 0, 0, 0.0),   # thumb up: the arm holds
    (9.4, (0.0, -0.08, 0.10), -5, 0, 0, 0, 0.0),     # bring the hand back to the body
    (9.5, (0.0, -0.08, 0.10), -5, 0, 0, 1, 0.0),     # thumb down again
    (10.1, (-0.24, -0.06, 0.08), -10, 0, 18, 1, 0.0),  # a fast sweep to the left: the arm lags
    (13.2, (-0.24, -0.06, 0.08), -10, 0, 18, 1, 0.0),
    (15.2, (-0.25, -0.24, 0.07), -60, 55, 18, 1, 0.0),  # lower and roll the wrist
    (16.4, (-0.25, -0.24, 0.07), -60, 55, 18, 1, 1.0),  # let go of the rock
    (17.6, (-0.12, -0.10, 0.05), -15, 0, 5, 1, 1.0),
    (20.2, (0.0, 0.08, -0.34), 15, 0, 0, 1, 1.0),       # reach far past the arm's range
    (21.8, (0.0, 0.08, -0.34), 15, 0, 0, 1, 1.0),
    (21.9, (0.0, 0.08, -0.34), 15, 0, 0, 0, 1.0),       # thumb up
    (22.2, (0.0, 0.08, -0.34), 15, 0, 0, 0, 1.0),
]
END = 22.6  # no Home press: the session ends with the thumb up after the out-of-reach hold


def scripted() -> list[dict]:
    """Synthetic Arm Pilot packets: eased between the keys, with a little hand tremor."""
    rng = np.random.default_rng(7)
    n = int(END * RATE) + 1
    # tremor: white noise, smoothed twice, about 1.5 mm and 0.6 degrees
    def smooth_noise(scale):
        x = rng.normal(0, 1, (n, 3))
        k = np.ones(25) / 25
        for _ in range(2):
            x = np.stack([np.convolve(x[:, i], k, mode="same") for i in range(3)], 1)
        return x / (x.std() + 1e-9) * scale
    tp, ta = smooth_noise(0.0015), smooth_noise(math.radians(0.6))
    out = []
    times = [k[0] for k in KEYS]
    for i in range(n):
        t = i / RATE
        j = max(0, min(len(KEYS) - 2, np.searchsorted(times, t, side="right") - 1))
        a, b = KEYS[j], KEYS[j + 1]
        u = 0.0 if b[0] == a[0] else min(1.0, max(0.0, (t - a[0]) / (b[0] - a[0])))
        u = u * u * u * (u * (6 * u - 15) + 10)  # smootherstep: hands start and stop softly
        if t >= KEYS[-1][0]:
            a = b = KEYS[-1]
            u = 0.0
        pos = np.array(a[1]) + (np.array(b[1]) - np.array(a[1])) * u
        pitch, roll, yaw = (math.radians(a[k] + (b[k] - a[k]) * u) for k in (2, 3, 4))
        live = a[5] if u < 1 else b[5]
        grip = a[6] + (b[6] - a[6]) * u
        tremor = 1.0 if live else 0.6
        R = rot_matrix(yaw + ta[i, 0] * tremor, pitch + ta[i, 1] * tremor, roll + ta[i, 2] * tremor)
        out.append({"rx": t, "msg": {
            "t": t, "pos": (pos + tp[i] * tremor).tolist(), "rot": R.tolist(),
            "engaged": bool(live), "tracking": "normal", "grip_open": float(grip),
        }})
    return out


def quat(R: np.ndarray) -> list[float]:
    """Rotation matrix -> quaternion (x, y, z, w)."""
    m = R
    tr = m[0, 0] + m[1, 1] + m[2, 2]
    if tr > 0:
        s = math.sqrt(tr + 1.0) * 2
        w, x, y, z = 0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w, x, y, z = (m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w, x, y, z = (m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w, x, y, z = (m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s
    return [x, y, z, w]


def bake(packets: list[dict], source: str) -> dict:
    packets = sorted(packets, key=lambda p: p["rx"])
    t0 = packets[0]["rx"]
    pa = PhoneArm()
    frames, step, k = [], 1.0 / RATE, 0
    end = packets[-1]["rx"] - t0 + 3.0  # let the arm settle after the last packet
    origin = np.array(packets[0]["msg"]["pos"], dtype=float)
    i = 0
    last = packets[0]["msg"]
    while k * step <= end:
        now = k * step
        while i < len(packets) and packets[i]["rx"] - t0 <= now:
            last = packets[i]["msg"]
            pa.feed(last, now)
            i += 1
        if i >= len(packets):
            pa.last_rx = now  # past the recording: keep the arm settling, not deadman-released
        st = pa.tick(now)
        if k % KEEP == 0:
            R = np.array(last["rot"], dtype=float)
            lim = sum(1 << JOINTS.index(n) for n in st["at_limit"]) if st["engaged"] else 0
            frames.append([
                round(now, 3),
                *[round(v, 4) for v in (np.array(last["pos"]) - origin)],
                *[round(v, 4) for v in quat(R)],
                1 if st["engaged"] else 0,
                round(float(last.get("grip_open", 1.0)), 3),
                *[round(v, 4) for v in st["q"]],
                st["gripper_open"],
                *st["target_tip_m"],
                lim,
                1 if st["reachable"] else 0,
                round(max(st["speed_frac"][:4]), 3),
            ])
        k += 1
    return {
        "source": source,
        "rate": RATE / KEEP,
        "fields": ["t", "px", "py", "pz", "qx", "qy", "qz", "qw", "engaged", "grip_cmd",
                   "yaw", "shoulder", "elbow", "wrist_pitch", "wrist_roll", "gripper",
                   "tx", "ty", "tz", "limit_bits", "reachable", "speed"],
        "spec": {"shoulder_h": ARM.shoulder_h, "upper": ARM.upper, "fore": ARM.fore, "wrist": ARM.wrist,
                 "finger": ARM.finger, "ground_z": ARM.ground_z, "limits_deg": [list(l) for l in ARM.limits_deg],
                 "max_speed_deg": ARM.max_speed_deg[0], "scale": ARM.scale},
        "frames": frames,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("session", nargs="?", help="JSON lines from `armtrack phone --record`")
    ap.add_argument("--scripted", action="store_true")
    ap.add_argument("--trim", nargs=2, type=float, metavar=("START", "END"), help="seconds of the recording to keep")
    a = ap.parse_args()
    if a.scripted:
        packets, source = scripted(), "scripted"
    else:
        packets = [json.loads(l) for l in open(a.session) if l.strip()]
        packets = [p for p in packets if "pos" in p.get("msg", {})]
        if a.trim:
            t0 = packets[0]["rx"]
            packets = [p for p in packets if a.trim[0] <= p["rx"] - t0 <= a.trim[1]]
        source = "recorded"
    track = bake(packets, source)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(track, separators=(",", ":")))
    f = np.array([fr for fr in track["frames"]])
    print(f"{source}: {len(f)} frames, {f[-1, 0]:.1f} s, {OUT.stat().st_size / 1024:.0f} KB")
    print(f"  engaged {f[:, 8].mean():.0%}, unreachable frames {int((f[:, 20] == 0).sum())}, "
          f"frames at a limit {int((f[:, 19] > 0).sum())}, max speed frac {f[:, 21].max():.2f}")


if __name__ == "__main__":
    main()
