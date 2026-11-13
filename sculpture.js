/**
 * Silent hero sculpture. Same cylinder, camera, and Cello Tide strokes as the
 * app, drawn as shaded tubes. No audio.
 */
(function () {
  const canvas = document.querySelector(".sculpture");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const HALF = 1.05;
  const EYE = [0, 0.92, 6.3];
  const FOV = Math.tan((25 * Math.PI) / 180);
  const TURN = 42;

  const INK = {
    cello: {
      low: [0.48, 0.16, 0.08],
      mid: [0.78, 0.36, 0.16],
      high: [0.95, 0.62, 0.36],
    },
    piano: {
      low: [1, 0.36, 0.16],
      mid: [1, 0.74, 0.4],
      high: [0.64, 0.84, 1],
    },
    bell: {
      low: [1, 0.78, 0.32],
      mid: [1, 0.9, 0.62],
      high: [1, 0.97, 0.84],
    },
  };

  const strokes = [
    ...holds("cello", 1.05, 0.064, "tube", [
      [0, 4, 0],
      [2, 4, 4],
      [0, 2.5, 2],
    ]),
    ...holds("piano", 1.095, 0.042, "tube", [
      [0, 1, 4],
      [1, 1, 3],
      [2, 1.25, 2],
      [3.25, 0.75, 1],
      [4, 1, 0],
      [5, 1, 4],
    ]),
    ...holds("bell", 1.14, 0.046, "beads", [
      [0, 0.8, 0],
      [3, 0.8, 4],
    ]),
  ];

  const context = canvas.getContext("2d");
  if (!context) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let yaw = 0.55;
  let last = 0;
  let running = true;

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState !== "hidden";
    if (running && !reduced) {
      last = 0;
      requestAnimationFrame(frame);
    }
  });

  if (reduced) {
    draw(yaw);
  } else {
    requestAnimationFrame(frame);
  }

  function holds(instrument, orbit, radius, kind, events) {
    const pulses = 6;
    const degrees = 7;
    const step = (Math.PI * 2) / pulses;
    return events.map(([beat, beats, degree]) => {
      const height = (degree + 0.5) / degrees;
      const start = beat * step;
      const end = Math.min(start + beats * step, Math.PI * 2 - 0.001);
      return {
        instrument,
        orbit,
        radius,
        kind,
        height,
        start,
        end,
        color: lineColor(INK[instrument], height),
      };
    });
  }

  function lineColor(ink, height) {
    const y = Math.min(Math.max(height, 0), 1);
    const from = y < 0.5 ? ink.low : ink.mid;
    const to = y < 0.5 ? ink.mid : ink.high;
    const t = y < 0.5 ? y * 2 : (y - 0.5) * 2;
    return from.map((channel, index) => Math.min(1, (channel + (to[index] - channel) * t) * 1.15));
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    if (reduced) draw(yaw);
  }

  function frame(now) {
    if (!running) return;
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    yaw += dt * ((Math.PI * 2) / TURN);
    draw(yaw);
    requestAnimationFrame(frame);
  }

  function draw(angle) {
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    const pieces = [];

    for (const stroke of strokes) {
      const span = Math.max(stroke.end - stroke.start, 0.02);
      const count =
        stroke.kind === "beads"
          ? Math.max(2, Math.round((span * stroke.orbit) / 0.12))
          : Math.max(8, Math.ceil((span / (Math.PI * 2)) * 64));
      let previous = null;
      for (let index = 0; index <= count; index += 1) {
        const t = index / count;
        const placed = place(stroke.orbit, stroke.height, stroke.start + span * t, angle);
        const view = project(placed.point, placed.facing);
        if (stroke.kind === "beads") {
          pieces.push({
            kind: "bead",
            view,
            radius: stroke.radius,
            color: stroke.color,
            depth: view.depth,
          });
        } else if (previous) {
          pieces.push({
            kind: "tube",
            a: previous,
            b: view,
            radius: stroke.radius,
            color: stroke.color,
            depth: (previous.depth + view.depth) * 0.5,
          });
        }
        previous = view;
      }
    }

    pieces.sort((a, b) => b.depth - a.depth);
    for (const piece of pieces) {
      if (piece.kind === "bead") paintBead(piece, width, height);
      else paintTube(piece, width, height);
    }
  }

  function place(orbit, height, theta, spin) {
    const a = theta + spin;
    return {
      point: [
        Math.sin(a) * orbit,
        (height - 0.5) * 2 * HALF,
        Math.cos(a) * orbit,
      ],
      facing: Math.max(0, Math.cos(a)),
    };
  }

  function project(point, facing) {
    const rel = [point[0] - EYE[0], point[1] - EYE[1], point[2] - EYE[2]];
    const forward = normalize([-EYE[0], -EYE[1], -EYE[2]]);
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);
    const x = dot(rel, right);
    const y = dot(rel, up);
    const depth = Math.max(0.2, dot(rel, forward));
    return {
      x: (x / depth) / FOV,
      y: (y / depth) / FOV,
      depth,
      facing,
    };
  }

  function paintTube(piece, width, height) {
    const lift = height * 0.1;
    const ax = (piece.a.x * 0.5 + 0.5) * width;
    const ay = (-piece.a.y * 0.5 + 0.5) * height - lift;
    const bx = (piece.b.x * 0.5 + 0.5) * width;
    const by = (-piece.b.y * 0.5 + 0.5) * height - lift;
    const scale = (width / canvas.clientWidth) * (canvas.clientHeight * 0.5);
    const widthPx = ((piece.radius * 2) / (piece.depth * FOV)) * scale;
    const light = 0.55 + 0.55 * Math.max(piece.a.facing, piece.b.facing);
    context.strokeStyle = rgba(piece.color, light);
    context.lineWidth = Math.max(1.5, widthPx);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.stroke();
  }

  function paintBead(piece, width, height) {
    const lift = height * 0.1;
    const x = (piece.view.x * 0.5 + 0.5) * width;
    const y = (-piece.view.y * 0.5 + 0.5) * height - lift;
    const scale = (width / canvas.clientWidth) * (canvas.clientHeight * 0.5);
    const radius = Math.max(1.5, (piece.radius / (piece.depth * FOV)) * scale);
    const light = 0.7 + 0.4 * piece.view.facing;
    const gradient = context.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.35,
      radius * 0.1,
      x,
      y,
      radius,
    );
    gradient.addColorStop(0, rgba([1, 1, 1], 0.95));
    gradient.addColorStop(0.45, rgba(piece.color, light));
    gradient.addColorStop(1, rgba(piece.color, light * 0.55));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function rgba(color, gain) {
    const channels = color.map((channel) => Math.round(Math.min(1, channel * gain) * 255));
    return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function normalize(v) {
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  }
})();
