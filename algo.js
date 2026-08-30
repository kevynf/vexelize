// Pure grid-detection and color algorithms, shared by app.js and the Node test suite.
// No DOM access here: image data is passed in as { width, height, data } RGBA buffers.
(() => {
  "use strict";

  const MAX_GRID_SIZE = 256;
  const SCAN_COUNT = 32;

  // Tunable scoring constants. Defaults are the hand-tuned values; tests/tune.mjs
  // searches these against the benchmark and may promote better values back here.
  const defaultParams = {
    latticeWeight: .008,        // final-score bonus for native/phase lattice evidence
    nativeBonus: .15,           // flat bonus for native-resolution scanline agreement
    squarePenaltyAnalysis: .3,  // penalty for non-square cells, analysis candidates
    squarePenaltyNative: .4,    // penalty for non-square cells, native candidates
    complexityCoef: .025,       // finer grids cost slightly more
    cellAspectCoef: .012,       // penalty strength for non-square analysis cells
    alignedGate: .78,           // min phase-alignment evidence for native pitch candidates
    wAlign: .8,                 // rankAxis: alignment evidence weight
    wConc: .25,                 // rankAxis: line-concentration weight
    wCorr: .12,                 // rankAxis: autocorrelation weight
    smallCellPenalty: 0.01,     // score penalty per log2 of cell size over 48 source px
  };
  const params = { ...defaultParams };
  // When true, rankGridCandidates annotates candidates with f_* features for
  // the reranker pipeline (tests/generate-training.mjs enables it).
  let annotateFeatures = false;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
  }

  function srgbToLinear(value) {
    value /= 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }

  function rgbToOklab(r, g, b) {
    r = srgbToLinear(r);
    g = srgbToLinear(g);
    b = srgbToLinear(b);
    const l = .4122214708 * r + .5363325363 * g + .0514459929 * b;
    const m = .2119034982 * r + .6806995451 * g + .1073969566 * b;
    const s = .0883024619 * r + .2817188376 * g + .6299787005 * b;
    const ll = Math.cbrt(l);
    const mm = Math.cbrt(m);
    const ss = Math.cbrt(s);
    return [
      .2104542553 * ll + .793617785 * mm - .0040720468 * ss,
      1.9779984951 * ll - 2.428592205 * mm + .4505937099 * ss,
      .0259040371 * ll + .7827717662 * mm - .808675766 * ss
    ];
  }

  function oklabToRgb(L, a, b) {
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
    const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
    const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
    const toSrgb = (v) => (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055) * 255;
    return [
      toSrgb(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s),
      toSrgb(-.0041960863 * l - .7034186147 * m + 1.707614701 * s)
    ];
  }

  function medianCut(colors, count) {
    if (!colors.length) return [[0, 0, 0]];
    const measure = (bucket) => {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      bucket.forEach((value) => {
        for (let c = 0; c < 3; c++) {
          if (value[c] < min[c]) min[c] = value[c];
          if (value[c] > max[c]) max[c] = value[c];
        }
      });
      let channel = 0;
      for (let c = 1; c < 3; c++) {
        if (max[c] - min[c] > max[channel] - min[channel]) channel = c;
      }
      return { channel, range: max[channel] - min[channel] };
    };
    let entries = [{ bucket: colors, meta: measure(colors) }];
    while (entries.length < count) {
      let splitIndex = -1;
      let bestRange = -1;
      let channel = 0;
      entries.forEach((entry, i) => {
        if (entry.bucket.length < 2) return;
        if (entry.meta.range > bestRange) { bestRange = entry.meta.range; splitIndex = i; channel = entry.meta.channel; }
      });
      if (splitIndex < 0) break;
      const bucket = entries.splice(splitIndex, 1)[0].bucket.sort((a, b) => a[channel] - b[channel]);
      const middle = Math.ceil(bucket.length / 2);
      const left = bucket.slice(0, middle);
      const right = bucket.slice(middle);
      entries.push({ bucket: left, meta: measure(left) }, { bucket: right, meta: measure(right) });
    }
    return entries.map(({ bucket }) => [0, 1, 2].map((c) => bucket.reduce((sum, value) => sum + value[c], 0) / bucket.length));
  }

  // Otsu's threshold over log-scaled edge strengths: adapts to how edge-y the
  // image is, instead of assuming a fixed top fraction is signal. Anti-aliased
  // images blur true edges towards the noise floor, where a fixed percentile
  // either swallows the edges or promotes the noise.
  function otsuThreshold(values) {
    if (!values.length) return 0;
    const bins = 256;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const l = Math.log1p(Math.max(0, values[i]));
      if (l < min) min = l;
      if (l > max) max = l;
    }
    if (max - min < 1e-9) return Math.max(0, values[0]);
    const hist = new Float64Array(bins);
    for (let i = 0; i < values.length; i++) {
      const l = Math.log1p(Math.max(0, values[i]));
      hist[Math.min(bins - 1, Math.floor((l - min) / (max - min) * bins))]++;
    }
    let sumAll = 0;
    for (let i = 0; i < bins; i++) sumAll += i * hist[i];
    let sumB = 0;
    let weightB = 0;
    let bestBin = bins - 1;
    let bestVariance = -1;
    for (let i = 0; i < bins; i++) {
      weightB += hist[i];
      if (!weightB) continue;
      const weightF = values.length - weightB;
      if (!weightF) break;
      sumB += i * hist[i];
      const between = weightB * weightF * ((sumB / weightB - (sumAll - sumB) / weightF) ** 2);
      if (between > bestVariance) { bestVariance = between; bestBin = i; }
    }
    return Math.expm1(min + (bestBin + 1) / bins * (max - min));
  }

  // Ranks periodic edge candidates from pre-sampled scanlines. Each buffer holds
  // scanCount scanlines along one axis, laid out as (position * scanCount + scan) * 4.
  function rankNativeScanlines(data, length) {
    const transitions = [];
    for (let scan = 0; scan < SCAN_COUNT; scan++) {
      for (let position = 1; position < length; position++) {
        const previous = ((position - 1) * SCAN_COUNT + scan) * 4;
        const current = (position * SCAN_COUNT + scan) * 4;
        const strength = Math.max(
          Math.abs(data[current] - data[previous]),
          Math.abs(data[current + 1] - data[previous + 1]),
          Math.abs(data[current + 2] - data[previous + 2]),
          Math.abs(data[current + 3] - data[previous + 3])
        );
        transitions.push([position, strength]);
      }
    }

    const strengths = transitions.map((item) => item[1]);
    const threshold = Math.max(2, otsuThreshold(strengths));
    const projection = new Float64Array(length);
    transitions.forEach(([position, strength]) => {
      if (strength > threshold) projection[position] += strength - threshold;
    });
    const total = projection.reduce((sum, value) => sum + value, 0);
    if (total < 1e-6) return [];

    const minPitch = Math.max(2, Math.floor(length / MAX_GRID_SIZE));
    const maxPitch = Math.min(512, Math.floor(length / 4));
    const ranked = [];
    for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
      const phases = new Float64Array(pitch);
      for (let position = 1; position < length; position++) {
        if (projection[position]) phases[position % pitch] += projection[position];
      }
      let offset = 0;
      for (let phase = 1; phase < pitch; phase++) {
        if (phases[phase] > phases[offset]) offset = phase;
      }
      const aligned = phases[offset] / total;
      const randomBaseline = 1 / pitch;
      const evidence = Math.max(0, (aligned - randomBaseline) / Math.max(.01, 1 - randomBaseline));
      const score = evidence + Math.min(.1, Math.log2(pitch) * .015);
      if (aligned >= params.alignedGate) ranked.push({ pitch, offset, aligned, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const candidate of ranked) {
      if (selected.every((item) => Math.abs(item.pitch - candidate.pitch) > 1)) selected.push(candidate);
      if (selected.length === 6) break;
    }
    return selected;
  }

  // analysis: { width, height, data } — RGBA pixels of the downscaled analysis canvas.
  // nativeHints: null or { scale, width, height, xData, yData } — full-resolution
  // scanlines extracted by the caller (browser wrapper or test harness).
  function rankGridCandidates(analysis, nativeHints) {
    const width = analysis.width;
    const height = analysis.height;
    const ratio = analysis.ratio || 1;
    const pixels = analysis.data;
    const stride = width + 1;
    const integral = Array.from({ length: 8 }, () => new Float64Array((width + 1) * (height + 1)));
    const lab = Array.from({ length: 4 }, () => new Float32Array(width * height));

    for (let y = 1; y <= height; y++) {
      const rowSums = new Float64Array(8);
      for (let x = 1; x <= width; x++) {
        const source = ((y - 1) * width + x - 1) * 4;
        const alpha = pixels[source + 3] / 255;
        const values = [pixels[source] * alpha, pixels[source + 1] * alpha, pixels[source + 2] * alpha, pixels[source + 3]];
        const color = rgbToOklab(pixels[source], pixels[source + 1], pixels[source + 2]);
        const pixelIndex = (y - 1) * width + x - 1;
        lab[0][pixelIndex] = color[0] * alpha;
        lab[1][pixelIndex] = color[1] * alpha;
        lab[2][pixelIndex] = color[2] * alpha;
        lab[3][pixelIndex] = alpha;
        const target = y * stride + x;
        for (let c = 0; c < 4; c++) {
          rowSums[c] += values[c];
          rowSums[c + 4] += values[c] * values[c];
          integral[c][target] = integral[c][target - stride] + rowSums[c];
          integral[c + 4][target] = integral[c + 4][target - stride] + rowSums[c + 4];
        }
      }
    }

    const areaSum = (table, x0, y0, x1, y1) => table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0];
    const verticalEdges = [];
    const horizontalEdges = [];
    const verticalProjection = new Float64Array(width);
    const horizontalProjection = new Float64Array(height);
    const perceptualDistance = (a, b) => Math.hypot(
      (lab[0][a] - lab[0][b]) * 1.25,
      lab[1][a] - lab[1][b],
      lab[2][a] - lab[2][b],
      (lab[3][a] - lab[3][b]) * .55
    );

    for (let y = 0; y < height; y++) for (let x = 1; x < width; x++) {
      const index = y * width + x;
      verticalEdges.push([x, perceptualDistance(index, index - 1)]);
    }
    for (let y = 1; y < height; y++) for (let x = 0; x < width; x++) {
      const index = y * width + x;
      horizontalEdges.push([y, perceptualDistance(index, index - width)]);
    }

    const projectStrongEdges = (edges, projection) => {
      const strengths = edges.map((item) => item[1]);
      const threshold = otsuThreshold(strengths);
      edges.forEach(([position, strength]) => {
        if (strength > threshold) projection[position] += strength - threshold;
      });
    };
    projectStrongEdges(verticalEdges, verticalProjection);
    projectStrongEdges(horizontalEdges, horizontalProjection);

    const rankAxis = (projection, length) => {
      const total = projection.reduce((sum, value) => sum + value, 0);
      if (total < 1e-6) return [{ pitch: Math.max(2, length / 24), offset: 0, score: 0 }];
      const ranked = [];
      const maxPitch = Math.min(64, Math.max(3, Math.floor(length / 4)));
      for (let pitch = 1; pitch <= maxPitch; pitch++) {
        let correlation = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 1; i < length - pitch; i++) {
          correlation += projection[i] * projection[i + pitch];
          normA += projection[i] ** 2;
          normB += projection[i + pitch] ** 2;
        }
        correlation /= Math.sqrt(normA * normB) || 1;
        let bestPhase = { offset: 0, score: -Infinity };
        const sigma = Math.max(.65, pitch * .12);
        const half = pitch >> 1;
        const weights = new Float64Array(half + 1);
        for (let distance = 0; distance <= half; distance++) weights[distance] = Math.exp(-.5 * (distance / sigma) ** 2);
        let alignmentBaseline = 0;
        for (let remainder = 0; remainder < pitch; remainder++) {
          alignmentBaseline += weights[Math.min(remainder, pitch - remainder)];
        }
        alignmentBaseline /= pitch;
        for (let offset = 0; offset < pitch; offset++) {
          let aligned = 0;
          for (let position = 1; position < length; position++) {
            const weight = projection[position];
            if (!weight) continue;
            let distance = (position - offset) % pitch;
            if (distance < 0) distance += pitch;
            if (distance > half) distance = pitch - distance;
            aligned += weight * weights[distance];
          }
          let lineEnergy = 0;
          let lineCount = 0;
          for (let position = offset; position < length; position += pitch) {
            lineEnergy += projection[position] + (projection[position - 1] || 0) * .5 + (projection[position + 1] || 0) * .5;
            lineCount++;
          }
          const lift = (lineEnergy / Math.max(1, lineCount)) / (total / Math.max(1, length));
          const alignmentEvidence = Math.max(0, aligned / total - alignmentBaseline);
          const concentration = Math.max(0, Math.min(1, (lift - 1) / 3));
          const microPitchPenalty = pitch <= 2 ? (3 - pitch) * .04 : 0;
          const score = alignmentEvidence * params.wAlign + concentration * params.wConc + correlation * params.wCorr - microPitchPenalty;
          if (score > bestPhase.score) bestPhase = { offset, score };
        }
        ranked.push({ pitch, ...bestPhase });
      }
      ranked.sort((a, b) => b.score - a.score);
      const selected = [];
      for (const candidate of ranked) {
        if (selected.every((item) => Math.abs(item.pitch - candidate.pitch) > 1)) selected.push(candidate);
        if (selected.length === 10) break;
      }
      selected.forEach((item, idx) => { item.rank = idx / selected.length; });
      return selected;
    };

    const xRanks = rankAxis(verticalProjection, width);
    const yRanks = rankAxis(horizontalProjection, height);
    const sourceRatio = height / width;
    const preservesSourceRatio = (columns, rows) => {
      const ratioError = Math.abs(Math.log((rows / columns) / sourceRatio));
      const roundingTolerance = Math.max(.06, .5 / columns + .5 / rows);
      return ratioError <= roundingTolerance;
    };
    const candidateMap = new Map();
    xRanks.forEach((xCandidate) => yRanks.forEach((yCandidate) => {
      const columns = Math.max(4, Math.min(MAX_GRID_SIZE, Math.round(width / xCandidate.pitch)));
      const rows = Math.max(4, Math.min(MAX_GRID_SIZE, Math.round(height / yCandidate.pitch)));
      if (!preservesSourceRatio(columns, rows)) return;
      const squarePenalty = Math.abs(Math.log(xCandidate.pitch / yCandidate.pitch));
      const latticeScore = (xCandidate.score + yCandidate.score) / 2 - squarePenalty * params.squarePenaltyAnalysis;
      const key = `${columns}x${rows}`;
      const current = candidateMap.get(key);
      if (!current || latticeScore > current.latticeScore) candidateMap.set(key, {
        columns, rows, latticeScore,
        pitchX: xCandidate.pitch, pitchY: yCandidate.pitch,
        offsetX: xCandidate.offset, offsetY: yCandidate.offset,
        rankX: xCandidate.rank ?? 1, rankY: yCandidate.rank ?? 1,
        hasNative: false
      });
    }));

    const nativeCandidates = nativeHints ? {
      scale: nativeHints.scale,
      width: nativeHints.width,
      height: nativeHints.height,
      x: rankNativeScanlines(nativeHints.xData, nativeHints.width),
      y: rankNativeScanlines(nativeHints.yData, nativeHints.height)
    } : { scale: 1, width: 0, height: 0, x: [], y: [] };
    nativeCandidates.x.forEach((item, idx) => { item.nativeRank = idx / Math.max(1, nativeCandidates.x.length); });
    nativeCandidates.y.forEach((item, idx) => { item.nativeRank = idx / Math.max(1, nativeCandidates.y.length); });

    nativeCandidates.x.forEach((xCandidate) => nativeCandidates.y.forEach((yCandidate) => {
      const columns = Math.max(4, Math.min(MAX_GRID_SIZE, Math.round(nativeCandidates.width / xCandidate.pitch)));
      const rows = Math.max(4, Math.min(MAX_GRID_SIZE, Math.round(nativeCandidates.height / yCandidate.pitch)));
      if (!preservesSourceRatio(columns, rows)) return;
      const pitchX = xCandidate.pitch / nativeCandidates.scale * ratio;
      const pitchY = yCandidate.pitch / nativeCandidates.scale * ratio;
      const squarePenalty = Math.abs(Math.log(pitchX / pitchY));
      const latticeScore = (xCandidate.score + yCandidate.score) / 2 + params.nativeBonus - squarePenalty * params.squarePenaltyNative;
      const key = `${columns}x${rows}`;
      const current = candidateMap.get(key);
      if (!current || latticeScore > current.latticeScore) candidateMap.set(key, {
        columns, rows, latticeScore,
        pitchX, pitchY,
        offsetX: xCandidate.offset / nativeCandidates.scale * ratio,
        offsetY: yCandidate.offset / nativeCandidates.scale * ratio,
        rankX: xCandidate.rank ?? 1, rankY: yCandidate.rank ?? 1,
        nativeRankX: xCandidate.nativeRank ?? 1, nativeRankY: yCandidate.nativeRank ?? 1,
        hasNative: true
      });
    }));

    // NOTE: the dense fallback sweep (every column count 8..64) plus
    // retraining was verified unstable on real AI images twice: training with
    // even-only truths breaks odd grids, training with odd truths breaks even
    // grids (golden 43%↔14%, AI stability 65↔15/139) — the harmonic ambiguity
    // between ladders flips with the training distribution. The stable
    // configuration is the standard even list with row-count ±1 tolerance;
    // odd-size coverage needs a principled tie-break (future work).
    [8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256].forEach((columns) => {
      const center = Math.round(columns * sourceRatio);
      for (const rowsDelta of [-1, 0, 1]) {
        const rows = Math.max(4, Math.min(MAX_GRID_SIZE, center + rowsDelta));
        const key = `${columns}x${rows}`;
        if (!candidateMap.has(key)) candidateMap.set(key, { columns, rows, latticeScore: 0 });
      }
    });

    const candidates = [];
    // Uniform scoring for every candidate: used both here and after phase
    // refinement so refined lattices keep ALL penalty terms (a previous bug
    // let refined top-3 candidates drop the small-cell plausibility penalty).
    const scoreWith = (candidate, error) => {
      const complexity = params.complexityCoef * candidate.columns * candidate.rows / (width * height);
      const cellAspect = (width / candidate.columns) / (height / candidate.rows);
      const cellAspectPenalty = Math.abs(Math.log(cellAspect)) * params.cellAspectCoef;
      const sourceCell = Math.max(width / candidate.columns, height / candidate.rows) / ratio;
      const smallCellPenalty = params.smallCellPenalty * Math.max(0, Math.log2(sourceCell / 48));
      return error + complexity + cellAspectPenalty + smallCellPenalty - (candidate.latticeScore || 0) * params.latticeWeight;
    };
    for (const candidate of candidateMap.values()) {
      const { columns, rows } = candidate;
      let variance = 0;
      let samples = 0;
      for (let gy = 0; gy < rows; gy++) {
        // Clamp for candidates finer than the canvas (small images evaluated
        // against large fallback lattices): out-of-bounds integral reads used
        // to poison error and confidence with NaN.
        const y0 = Math.max(0, Math.min(height, Math.round(gy * height / rows)));
        const y1 = Math.max(y0, Math.min(height, Math.round((gy + 1) * height / rows)));
        if (y1 <= y0) continue;
        for (let gx = 0; gx < columns; gx++) {
          const x0 = Math.max(0, Math.min(width, Math.round(gx * width / columns)));
          const x1 = Math.max(x0, Math.min(width, Math.round((gx + 1) * width / columns)));
          if (x1 <= x0) continue;
          const count = (x1 - x0) * (y1 - y0);
          for (let c = 0; c < 4; c++) {
            const sum = areaSum(integral[c], x0, y0, x1, y1);
            const sumSq = areaSum(integral[c + 4], x0, y0, x1, y1);
            variance += Math.max(0, sumSq - sum * sum / count);
          }
          samples += count * 4;
        }
      }
      const normalizedError = variance / Math.max(1, samples * 255 * 255);
      // Plausibility prior lives in scoreWith: pixel art cells bigger than
      // ~48 source pixels are rare — a 1024px image "being" a 9x9 grid means
      // 113px pixels. Soft in log-space so strong evidence can override it.
      candidates.push({
        ...candidate,
        error: normalizedError,
        score: scoreWith(candidate, normalizedError)
      });
    }

    const scorePhase = (columns, rows, pitchX, pitchY, phaseX, phaseY) => {
      const stride = Math.max(1, Math.floor(Math.sqrt(columns * rows / 4096)));
      let variance = 0;
      let samples = 0;
      for (let gy = 0; gy < rows; gy += stride) {
        const y0 = Math.max(0, Math.min(height, Math.round(phaseY + gy * pitchY)));
        const y1 = Math.max(y0, Math.min(height, Math.round(phaseY + (gy + 1) * pitchY)));
        if (y1 <= y0) continue;
        for (let gx = 0; gx < columns; gx += stride) {
          const x0 = Math.max(0, Math.min(width, Math.round(phaseX + gx * pitchX)));
          const x1 = Math.max(x0, Math.min(width, Math.round(phaseX + (gx + 1) * pitchX)));
          if (x1 <= x0) continue;
          const count = (x1 - x0) * (y1 - y0);
          for (let c = 0; c < 4; c++) {
            const sum = areaSum(integral[c], x0, y0, x1, y1);
            const sumSq = areaSum(integral[c + 4], x0, y0, x1, y1);
            variance += Math.max(0, sumSq - sum * sum / count);
          }
          samples += count * 4;
        }
      }
      return variance / Math.max(1, samples * 255 * 255);
    };

    const refineAlignment = (candidate) => {
      if (!candidate.pitchX || !candidate.pitchY) return;
      const { columns, rows, pitchX, pitchY } = candidate;
      const mod = (value, pitch) => ((value % pitch) + pitch) % pitch;
      const startX = mod(candidate.offsetX ?? 0, pitchX);
      const startY = mod(candidate.offsetY ?? 0, pitchY);
      let bestX = startX;
      let bestY = startY;
      let bestScore = scorePhase(columns, rows, pitchX, pitchY, startX, startY);
      const baselineScore = bestScore;
      const sweep = (cx, cy, rangeX, rangeY, steps) => {
        for (let iy = -steps; iy <= steps; iy++) {
          for (let ix = -steps; ix <= steps; ix++) {
            const score = scorePhase(columns, rows, pitchX, pitchY, mod(cx + ix / steps * rangeX, pitchX), mod(cy + iy / steps * rangeY, pitchY));
            if (score < bestScore) { bestScore = score; bestX = mod(cx + ix / steps * rangeX, pitchX); bestY = mod(cy + iy / steps * rangeY, pitchY); }
          }
        }
      };
      sweep(bestX, bestY, pitchX / 4, pitchY / 4, 4);
      sweep(bestX, bestY, pitchX / 16, pitchY / 16, 2);
      if (bestScore < baselineScore * .98) {
        candidate.refinedOffsetX = bestX;
        candidate.refinedOffsetY = bestY;
        candidate.error = bestScore;
        candidate.score = scoreWith(candidate, bestScore);
      }
    };
    // Refinement is expensive, so spend it on the most promising lattices:
    // sort by current score first (the map yields candidates in arbitrary order).
    candidates.sort((a, b) => a.score - b.score);
    candidates.filter((candidate) => candidate.pitchX && candidate.pitchY).slice(0, 3).forEach(refineAlignment);

    // Structural attempts at high-resolution re-scoring were tried and rejected
    // by the benchmark, both rooted in the same fact: blur erases the high
    // frequencies that separate a fine grid from its coarse multiples, so (a)
    // cell-variance re-scoring on a larger canvas picks coarser lattices, and
    // (b) edge-phase re-scoring there drowns — AI-style images carry texture
    // ridges at every offset, so coarse lattices luck into alignment too.
    // (bilinear -6pp, AI stability 71/139 -> 44/139 when last measured.)
    // A real grid is a sharp phase minimum: shifting by a pixel makes cell
    // variance jump. Spurious lattices on texture-heavy images stay flat, so
    // sensitivity evidence counters the separation term that texture inflates.
    const phaseSensitivity = (candidate) => {
      if (!candidate.pitchX || !candidate.pitchY) return 1;
      const offX = candidate.refinedOffsetX ?? candidate.offsetX ?? 0;
      const offY = candidate.refinedOffsetY ?? candidate.offsetY ?? 0;
      const base = scorePhase(candidate.columns, candidate.rows, candidate.pitchX, candidate.pitchY, offX, offY);
      let worst = base;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
        worst = Math.max(worst, scorePhase(candidate.columns, candidate.rows, candidate.pitchX, candidate.pitchY, offX + dx, offY + dy));
      }
      return worst / Math.max(1e-9, base);
    };

    candidates.sort((a, b) => a.score - b.score);
    // ---- Feature annotation (reranker inputs). These fields never touch the
    // hand-tuned score; detectBestGrid consumes them only when a trained
    // reranker is loaded.
    const strongCount = (projection) => {
      let n = 0;
      for (let i = 0; i < projection.length; i++) if (projection[i] > 0) n++;
      return n;
    };
    const autocorrelationRatio = (projection) => {
      let a0 = 0, a1 = 0, a2 = 0;
      for (let i = 2; i < projection.length; i++) {
        a0 += projection[i] * projection[i];
        a1 += projection[i] * projection[i - 1];
        a2 += projection[i] * projection[i - 2];
      }
      return a2 / Math.max(1e-9, a1); // high ratio => wide ridges => blurry
    };
    const highFrequency = (projection) => {
      let noise = 0, total = 0;
      for (let i = 1; i < projection.length - 1; i++) {
        const smooth = (projection[i - 1] + projection[i + 1]) / 2;
        noise += Math.abs(projection[i] - smooth);
        total += projection[i];
      }
      return noise / Math.max(1e-9, total);
    };
    const nativeAlignedMax = Math.max(0, ...nativeCandidates.x.map((item) => item.aligned), ...nativeCandidates.y.map((item) => item.aligned));
    // Sharp evidence of the current best feeds the confidence formula (cheap,
    // single candidate). The full f_* annotation below is only needed for the
    // reranker training/inference pipeline and stays off in production.
    if (candidates.length) {
      candidates[0].f_sharpEvidence = Math.max(0, Math.min(1, (phaseSensitivity(candidates[0]) - 1) / 2));
    }
    if (annotateFeatures) {
      candidates.forEach((candidate) => {
        const pitchX = candidate.pitchX || width / candidate.columns;
        const pitchY = candidate.pitchY || height / candidate.rows;
        candidate.f_integralityX = Math.abs(pitchX - Math.round(pitchX)) / pitchX;
        candidate.f_integralityY = Math.abs(pitchY - Math.round(pitchY)) / pitchY;
        candidate.f_rankX = candidate.rankX ?? 1;
        candidate.f_rankY = candidate.rankY ?? 1;
        candidate.f_nativeRankX = candidate.nativeRankX ?? 1;
        candidate.f_nativeRankY = candidate.nativeRankY ?? 1;
        candidate.f_hasNative = candidate.hasNative ? 1 : 0;
        candidate.f_sharpEvidence = Math.max(0, Math.min(1, (phaseSensitivity(candidate) - 1) / 2));
        candidate.f_error = Number.isFinite(candidate.error) ? candidate.error : 1;
        candidate.f_complexity = params.complexityCoef * candidate.columns * candidate.rows / (width * height);
        candidate.f_cellAspect = Math.abs(Math.log((width / candidate.columns) / (height / candidate.rows)));
        candidate.f_fillsX = Math.min(1, (candidate.columns * pitchX) / width);
        candidate.f_fillsY = Math.min(1, (candidate.rows * pitchY) / height);
      });
    }
    const imageFeatures = {
      edgeDensity: (strongCount(verticalProjection) / width + strongCount(horizontalProjection) / height) / 2,
      blur: Math.min(3, (autocorrelationRatio(verticalProjection) + autocorrelationRatio(horizontalProjection)) / 2),
      noise: (highFrequency(verticalProjection) + highFrequency(horizontalProjection)) / 2,
      nativeAligned: nativeAlignedMax
    };
    return { candidates, width, height, ratio, sourceRatio, imageFeatures };
  }

  function detectBestGrid(analysis, nativeHints, mid = null) {
    const { candidates, width, height, sourceRatio, imageFeatures } = rankGridCandidates(analysis, nativeHints);
    // The learned reranker (weights in tests/reranker-weights.json, trainer in
    // tests/train-reranker.mjs, labels in tests/ai-labels.json) was disabled
    // after evaluation: it added ~6pp on synthetic suites but scored lower than
    // this hand-tuned ranking on human-labeled real AI images (54% vs 43% on
    // tests/ai-labels.json). The gated rerank branch itself was removed from
  // this file; restoring it means re-adding a P/margin-gated rerank before
  // the hand-tuned fallback in detectBestGrid.
    const best = candidates[0] || { columns: 24, rows: Math.max(4, Math.round(24 * sourceRatio)), score: 0 };
    const alternatives = candidates.filter((item) => Math.abs(item.columns - best.columns) >= 3 || Math.abs(item.rows - best.rows) >= 3);
    const runnerUp = alternatives[0] || candidates[1] || best;
    const separation = Math.max(0, runnerUp.score - best.score) / Math.max(.005, Math.abs(best.score) + Math.abs(runnerUp.score));
    const sharpEvidence = best.f_sharpEvidence ?? 0;
    const confidence = Math.max(55, Math.min(96, Math.round(55 + 50 * separation + 55 * sharpEvidence)));
    return { ...best, confidence, analysisWidth: width, analysisHeight: height };
  }

  // ---- Learned reranker support -------------------------------------------
  // rankGridCandidates annotates every candidate with f_* feature fields plus
  // image-level features. This builder turns them into the fixed-order vector
  // the trained reranker (see tests/train-reranker.mjs) expects. Generation
  // and inference MUST share this exact implementation.
  const RERANKER_FEATURES = [
    'error', 'complexity', 'cellAspect', 'integralityX', 'integralityY',
    'rankX', 'rankY', 'nativeRankX', 'nativeRankY', 'hasNative',
    'sharpEvidence', 'fillsX', 'fillsY',
    'imageEdgeDensity', 'imageBlur', 'imageNoise', 'imageNativeAligned',
    'columns', 'rows'
  ];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  function candidateFeatureVector(candidate, imageFeatures) {
    return [
      clamp01((candidate.f_error ?? 0) * 50),
      clamp01((candidate.f_complexity ?? 0) * 50),
      clamp01((candidate.f_cellAspect ?? 0) * 3),
      clamp01((candidate.f_integralityX ?? 1) * 2),
      clamp01((candidate.f_integralityY ?? 1) * 2),
      candidate.f_rankX ?? 1,
      candidate.f_rankY ?? 1,
      candidate.f_nativeRankX ?? 1,
      candidate.f_nativeRankY ?? 1,
      candidate.f_hasNative ?? 0,
      candidate.f_sharpEvidence ?? 0,
      candidate.f_fillsX ?? 1,
      candidate.f_fillsY ?? 1,
      imageFeatures?.edgeDensity ?? 0,
      imageFeatures?.blur ?? 0,
      imageFeatures?.noise ?? 0,
      imageFeatures?.nativeAligned ?? 0,
      (candidate.columns ?? 24) / 256,
      (candidate.rows ?? 24) / 256
    ];
  }

  // The learned candidate reranker (19→32→16→1 MLP scoring P(candidate is the
  // true grid)) was disabled after evaluation: it added ~6pp on synthetic
  // suites but scored lower than the hand-tuned ranking on human-labeled real
  // AI images. Trainer, labels and the last weights live in tests/
  // (train-reranker.mjs, ai-labels.json, reranker-weights.json); re-adding it
  // means restoring the gated rerank branch in detectBestGrid plus
  // candidateFeatureVector/RERANKER_FEATURES below.

  globalThis.VexelizeAlgo = {
    MAX_GRID_SIZE,
    params,
    defaultParams,
    RERANKER_FEATURES,
    candidateFeatureVector,
    get annotateFeatures() { return annotateFeatures; },
    set annotateFeatures(value) { annotateFeatures = value; },
    rankGridCandidates,
    hexToRgb,
    rgbToHex,
    srgbToLinear,
    rgbToOklab,
    oklabToRgb,
    medianCut,
    rankNativeScanlines,
    detectBestGrid
  };
})();
