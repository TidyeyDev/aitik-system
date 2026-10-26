"""Run the trained YOLO model on a pre-recorded clip and log what it detects.

Every detection is posted to the backend with source="recorded", so the
Detections page marks it "Recorded clip" and the Dashboard leaves it out.
The timestamp is the moment the clip is processed, not when it was filmed.

    pip install ultralytics requests
    python tools/run_clip.py clips/mating1.mp4 --camera cam3 --dry-run
    python tools/run_clip.py clips/mating1.mp4 --camera cam3

Keep --conf the same as the Pi's live threshold so the output is comparable.
"""

import argparse
import base64
import os
import sys
import time

import cv2
import requests
from ultralytics import YOLO


def snapshot_data_url(frame, width=640):
    """Frame with the model's boxes drawn, as a small JPEG data URL."""
    h, w = frame.shape[:2]
    if w > width:
        frame = cv2.resize(frame, (width, round(h * width / w)))
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    if not ok:
        raise RuntimeError("could not encode snapshot")
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


def should_log(label, t, last_logged, cooldown):
    """One detection per class per cooldown window, in clip time."""
    if t - last_logged.get(label, -cooldown) < cooldown:
        return False
    last_logged[label] = t
    return True


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("video")
    p.add_argument("--camera", default="cam3", help="camera id the clip came from")
    p.add_argument("--model", default=os.path.expanduser("~/best.pt"))
    p.add_argument("--backend", default="https://aitik-system.onrender.com")
    p.add_argument("--conf", type=float, default=0.5, help="confidence threshold")
    p.add_argument("--every", type=float, default=0.5, help="seconds between analysed frames")
    p.add_argument("--cooldown", type=float, default=10, help="seconds between logs of one class")
    p.add_argument("--dry-run", action="store_true", help="print detections, post nothing")
    args = p.parse_args()

    model = YOLO(args.model)
    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        sys.exit(f"Can't open {args.video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 15
    step = max(1, round(fps * args.every))
    clip = os.path.basename(args.video)

    last_logged, posted, index = {}, 0, -1
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        index += 1
        if index % step:
            continue

        result = model(frame, conf=args.conf, verbose=False)[0]
        if not len(result.boxes):
            continue
        best = max(result.boxes, key=lambda b: float(b.conf))
        label = model.names[int(best.cls)]
        conf = float(best.conf)
        t = index / fps
        if not should_log(label, t, last_logged, args.cooldown):
            continue

        print(f"{t:7.1f}s  {label:<14} {conf:.0%}")
        if args.dry_run:
            continue
        res = requests.post(
            f"{args.backend.rstrip('/')}/detect",
            json={
                "behavior": label,
                "confidence": round(conf, 4),
                "camera": args.camera,
                "snapshot": snapshot_data_url(result.plot()),
                "source": "recorded",
                "clip": clip,
            },
            timeout=30,
        )
        if not res.ok:
            sys.exit(f"Backend rejected detection ({res.status_code}): {res.text}")
        posted += 1
        time.sleep(0.2)  # don't flood the log in one burst

    cap.release()
    print(f"Done: {posted} detection(s) posted" + (" (dry run)" if args.dry_run else ""))


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        seen = {}
        assert should_log("mating", 0, seen, 10)
        assert not should_log("mating", 5, seen, 10)
        assert should_log("neutral", 5, seen, 10)
        assert should_log("mating", 10, seen, 10)
        print("ok")
    else:
        main()
