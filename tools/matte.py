"""Cut you out of the background: writes a grayscale video where white = you.
usage: python3 tools/matte.py work/clip.mp4 work/alpha.mp4
Uses Robust Video Matting (https://github.com/PeterL1n/RobustVideoMatting, GPL-3.0), downloaded on first run.
Runs locally on the Apple GPU (mps), an NVIDIA GPU (cuda) or the CPU. Expects the 1080x1920 clip that extract.sh writes."""
import sys, os, subprocess
import torch
FF = os.environ.get("FFMPEG", "ffmpeg")
src, out = sys.argv[1], sys.argv[2]
W, H = 1080, 1920
dev = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
model = torch.hub.load("PeterL1n/RobustVideoMatting", "mobilenetv3", trust_repo=True).eval().to(dev)
rd = subprocess.Popen([FF, "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
wr = subprocess.Popen([FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", "30", "-i", "-",
                       "-c:v", "libx264", "-crf", "10", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
rec = [None] * 4; n = 0
with torch.no_grad():
    while True:
        buf = rd.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        x = torch.frombuffer(bytearray(buf), dtype=torch.uint8).view(H, W, 3).permute(2, 0, 1).float().div(255).to(dev)
        _, pha, *rec = model(x.unsqueeze(0), *rec, downsample_ratio=0.25)
        wr.stdin.write((pha[0, 0].clamp(0, 1) * 255).byte().cpu().numpy().tobytes()); n += 1
wr.stdin.close(); wr.wait(); print(f"Cut-out done: {n} frames")
