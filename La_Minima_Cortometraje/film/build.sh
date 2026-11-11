#!/usr/bin/env bash
# LA MÍNIMA — arma el corto completo: cuadros + banda sonora + video.
# uso: ./build.sh            (variables opcionales: OUT=carpeta  P=procesos)
set -euo pipefail
cd "$(dirname "$0")"
OUT="${OUT:-build}"; P="${P:-4}"; N=5394
mkdir -p "$OUT/frames"
for i in $(seq 0 $((P - 1))); do
  a=$((i * N / P)); b=$(((i + 1) * N / P))
  node render.cjs --from "$a" --to "$b" --out "$OUT/frames" &
done
wait
python3 audio.py "$OUT/la_minima.wav"
# dos pasadas a ~1,5 Mbps: el corto entero queda en menos de 50 MB
VF="hqdn3d=0:0:4:4"
ffmpeg -y -loglevel error -framerate 24 -i "$OUT/frames/f_%05d.jpg" -vf "$VF" -c:v libx264 -preset medium -b:v 1560k \
  -pass 1 -passlogfile "$OUT/p2" -pix_fmt yuv420p -an -f null /dev/null
ffmpeg -y -loglevel error -framerate 24 -i "$OUT/frames/f_%05d.jpg" -i "$OUT/la_minima.wav" -vf "$VF" \
  -c:v libx264 -preset medium -b:v 1560k -pass 2 -passlogfile "$OUT/p2" -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -af "volume=-1.6dB" -c:a aac -b:a 128k -ar 48000 -movflags +faststart -shortest ../La_Minima.mp4
echo "listo: ../La_Minima.mp4"
