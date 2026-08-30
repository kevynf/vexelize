(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const canvas = $("#pixelCanvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const gridCanvas = $("#gridCanvas");
  const gridCtx = gridCanvas.getContext("2d");
  const compareCanvas = $("#compareCanvas");
  const compareCtx = compareCanvas.getContext("2d");
  const MAX_GRID_SIZE = 256;
  const MAX_PALETTE_SIZE = 256;
  let svgPreviewUrl = null;
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.75 } });

  const I18N = {
    zh: {
      title: "Vexelize - 像素画规整与 SVG 转换", home: "Vexelize 首页", projectName: "项目名称", untitled: "未命名像素画",
      saved: "已保存到本地", saving: "正在保存…", clearCache: "清除本地缓存", cacheCleared: "本地缓存已清除", clearCacheConfirm: "确定清除本地保存的像素画并新建空白画布？", language: "语言", themeToLight: "切换浅色模式", themeToDark: "切换深色模式",
      import: "导入图片", export: "导出 SVG", tools: "绘图工具", pencil: "画笔", eraser: "橡皮擦", fill: "填充", picker: "吸色",
      colorTool: "选择当前颜色；右下角方格表示透明色", currentColor: "当前颜色", swapColors: "切换前景与透明色",
      undo: "撤销", redo: "重做", canvas: "画布", canvasWidth: "画布宽度", canvasHeight: "画布高度", apply: "应用",
      zoomOut: "缩小", zoomIn: "放大", fit: "适应", compare: "对比", compareTitle: "原图与规整结果对比", editor: "像素画编辑画布",
      original: "原图", normalized: "规整后", colors: " 色", svgNodes: " 个 SVG 节点", tabRefine: "规整", tabPalette: "调色板",
      sourceImage: "源图像", dropImage: "拖入图片或点击选择", maxFile: "PNG / JPG / WebP / GIF · 最大 10 MB", sampling: "像素采样", live: "实时",
      detectGrid: "自动识别最佳格点", importToAnalyze: "导入图片后自动分析", analyze: "分析", retest: "重测", analyzing: "分析中", recognized: "已识别",
      targetWidth: "目标宽度", colorCount: "颜色数量", colorUnit: "色", alphaThreshold: "透明阈值", dither: "误差扩散抖动", ditherDesc: "分散量化误差，渐变更平滑", rules: "规整规则", removeIsolated: "移除孤立像素",
      removeIsolatedDesc: "合并单点噪声至邻近色", smoothEdges: "平滑锯齿", smoothEdgesDesc: "修正不连续的像素阶梯",
      mergeColors: "合并相近颜色", mergeColorsDesc: "收敛视觉近似的色值", colorTolerance: "颜色容差", applyRefine: "应用规整",
      currentPalette: "当前调色板", sortLightness: "按明度排序", paletteHelp: "点击色块选择颜色，双击可替换画布中的该颜色。", paletteEmpty: "画布中还没有颜色",
      vectorOutput: "矢量输出", pixelSize: "单像素尺寸", mergeBlocks: "合并连续色块", mergeBlocksDesc: "显著减少 SVG 节点",
      includeBackground: "包含背景", includeBackgroundDesc: "以指定颜色铺满画布", backgroundColor: "背景色", preview: "预览", copyCode: "复制代码", downloadSvg: "下载 SVG",
      svgPreview: "SVG 输出预览", nodesCount: "{count} 个节点", svgDownloaded: "SVG 已下载", copySuccess: "SVG 代码已复制", clipboardDenied: "浏览器未允许访问剪贴板",
      importFirst: "请先导入一张图片", recommendedGrid: "推荐 {columns} × {rows} · 置信度 {confidence}%", manualHint: "识别效果一般，可手动调整目标宽度后重新分析", bestGrid: "最佳格点：{columns} × {rows}",
      validImage: "请选择有效的图片文件", imageTooLarge: "图片不能超过 10 MB", imageLoaded: "图片已载入，正在识别最佳格点", refineApplied: "规整规则已应用", rename: "双击重命名"
    },
    en: {
      title: "Vexelize - Pixel Art Normalizer & SVG Export", home: "Vexelize home", projectName: "Project name", untitled: "Untitled pixel art",
      saved: "Saved locally", saving: "Saving...", clearCache: "Clear saved data", cacheCleared: "Saved data cleared", clearCacheConfirm: "Clear the locally saved artwork and start a blank canvas?", language: "Language", themeToLight: "Switch to light mode", themeToDark: "Switch to dark mode",
      import: "Import image", export: "Export SVG", tools: "Drawing tools", pencil: "Pencil", eraser: "Eraser", fill: "Fill", picker: "Eyedropper",
      colorTool: "Choose current color; the lower-right square represents transparency", currentColor: "Current color", swapColors: "Switch between foreground and transparency",
      undo: "Undo", redo: "Redo", canvas: "Canvas", canvasWidth: "Canvas width", canvasHeight: "Canvas height", apply: "Apply",
      zoomOut: "Zoom out", zoomIn: "Zoom in", fit: "Fit", compare: "Compare", compareTitle: "Compare source image and normalized result", editor: "Pixel art editor",
      original: "Original", normalized: "Normalized", colors: " colors", svgNodes: " SVG nodes", tabRefine: "Refine", tabPalette: "Palette",
      sourceImage: "Source image", dropImage: "Drop an image or click to choose", maxFile: "PNG / JPG / WebP / GIF · Up to 10 MB", sampling: "Pixel sampling", live: "Live",
      detectGrid: "Detect the best pixel grid", importToAnalyze: "Import an image to analyze it", analyze: "Analyze", retest: "Retest", analyzing: "Analyzing", recognized: "Detected",
      targetWidth: "Target width", colorCount: "Color count", colorUnit: "colors", alphaThreshold: "Alpha threshold", dither: "Error diffusion", ditherDesc: "Smoother gradients via error diffusion", rules: "Refinement rules", removeIsolated: "Remove isolated pixels",
      removeIsolatedDesc: "Merge one-pixel noise into nearby colors", smoothEdges: "Smooth jagged edges", smoothEdgesDesc: "Repair discontinuous pixel steps",
      mergeColors: "Merge similar colors", mergeColorsDesc: "Consolidate visually similar values", colorTolerance: "Color tolerance", applyRefine: "Apply refinement",
      currentPalette: "Current palette", sortLightness: "Sort by lightness", paletteHelp: "Click a swatch to select it. Double-click to replace that color on the canvas.", paletteEmpty: "No colors on the canvas yet",
      vectorOutput: "Vector output", pixelSize: "Pixel size", mergeBlocks: "Merge continuous blocks", mergeBlocksDesc: "Significantly reduce SVG nodes",
      includeBackground: "Include background", includeBackgroundDesc: "Fill the canvas with the selected color", backgroundColor: "Background color", preview: "Preview", copyCode: "Copy code", downloadSvg: "Download SVG",
      svgPreview: "SVG output preview", nodesCount: "{count} nodes", svgDownloaded: "SVG downloaded", copySuccess: "SVG code copied", clipboardDenied: "Browser clipboard access was denied",
      importFirst: "Import an image first", recommendedGrid: "Suggested {columns} × {rows} · {confidence}% confidence", manualHint: "Result looks off? Adjust the target width and re-run", bestGrid: "Best grid: {columns} × {rows}",
      validImage: "Choose a valid image file", imageTooLarge: "Image must be 10 MB or smaller", imageLoaded: "Image loaded. Detecting the best pixel grid", refineApplied: "Refinement rules applied", rename: "Double-click to rename"
    }
  };
  let language = document.documentElement.lang.toLowerCase().startsWith("zh") ? "zh" : "en";

  function t(key, values = {}) {
    return (I18N[language][key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function setElementText(element, value) {
    if (!element) return;
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (textNode) textNode.nodeValue = ` ${value}`;
    else element.textContent = value;
  }

  function setText(selector, key) {
    setElementText($(selector), t(key));
  }

  function setFieldLabel(inputId, key) {
    const label = $(inputId)?.closest("label");
    setElementText(label?.children[0], t(key));
  }

  function setToggleCopy(inputId, labelKey, descriptionKey) {
    const label = $(inputId)?.closest("label");
    if (!label) return;
    label.querySelector("b").textContent = t(labelKey);
    label.querySelector("small").textContent = t(descriptionKey);
  }

  function getThemeAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0969da";
  }

  function applyTheme(theme, persist = true) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    $("#themeToggle").title = dark ? t("themeToLight") : t("themeToDark");
    $("#themeToggle").setAttribute("aria-label", dark ? t("themeToLight") : t("themeToDark"));
    if (state.colorFollowsTheme) setColor(getThemeAccent(), true);
    if (persist) localStorage.setItem("vexelize-theme", theme);
    requestAnimationFrame(renderGrid);
  }

  const state = {
    width: 24,
    height: 24,
    pixels: [],
    tool: "pencil",
    color: getThemeAccent(),
    colorFollowsTheme: true,
    zoom: 1,
    drawing: false,
    history: [],
    future: [],
    sourceImage: null,
    sourceCrop: null,
    comparing: false,
    compareSplit: .5,
    gridVisible: true,
    detecting: false,
    gridDetection: null
  };

  function updateDetectionStatus() {
    const button = $("#detectGridBtn");
    const tag = $("#samplingTag");
    if (!button || !tag) return;
    const result = state.gridDetection;
    button.disabled = state.detecting;
    button.classList.toggle("analyzing", state.detecting);
    button.querySelector("em").textContent = state.detecting ? t("analyzing") : result ? t("retest") : t("analyze");
    tag.textContent = state.detecting ? t("analyzing") : result ? t("recognized") : t("live");
    $("#gridHint").textContent = result ? t("recommendedGrid", { columns: result.columns, rows: result.rows, confidence: result.confidence }) : t("importToAnalyze");
  }

  function applyLanguage(nextLanguage, persist = true) {
    if (!I18N[nextLanguage]) return;
    const projectName = $("#projectName");
    const isUntitled = projectName && Object.values(I18N).some((dictionary) => dictionary.untitled === projectName.value);
    language = nextLanguage;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = t("title");
    $("#languageSelect").value = language;
    $("#languageSelect").setAttribute("aria-label", t("language"));
    if (persist) localStorage.setItem("vexelize-language", language);
    if (isUntitled) projectName.value = t("untitled");

    $(".brand").setAttribute("aria-label", t("home"));
    $(".toolrail").setAttribute("aria-label", t("tools"));
    $("#projectName").setAttribute("aria-label", t("projectName"));
    $("#projectName").title = t("rename");
    $("#saveState").textContent = t("saved");
    $("#colorPicker").setAttribute("aria-label", t("currentColor"));
    $(".color-tool").title = t("colorTool");

    [["pencil", "pencil", "B"], ["eraser", "eraser", "E"], ["fill", "fill", "G"], ["picker", "picker", "I"]].forEach(([tool, key, shortcut]) => {
      const button = $(`[data-tool="${tool}"]`);
      button.title = `${t(key)} (${shortcut})`;
      button.setAttribute("aria-label", t(key));
    });
    [["#undoBtn", "undo", "Ctrl+Z"], ["#redoBtn", "redo", "Ctrl+Shift+Z"], ["#zoomOut", "zoomOut"], ["#zoomIn", "zoomIn"]].forEach(([selector, key, shortcut]) => {
      const button = $(selector);
      button.title = shortcut ? `${t(key)} (${shortcut})` : t(key);
      button.setAttribute("aria-label", t(key));
    });
    $("#swapColors").title = t("swapColors");
    $("#swapColors").setAttribute("aria-label", t("swapColors"));
    $("#gridWidth").setAttribute("aria-label", t("canvasWidth"));
    $("#gridHeight").setAttribute("aria-label", t("canvasHeight"));
    $("#pixelCanvas").setAttribute("aria-label", t("editor"));
    $("#compareBtn").title = t("compareTitle");

    setText("#importBtn", "import"); setText("#exportBtn", "export"); setText(".size-control > label", "canvas"); setText("#resizeBtn", "apply");
    setText("#fitBtn", "fit"); setText("#compareBtn", "compare"); setText(".original-label", "original"); setText(".result-label", "normalized");
    setText('[data-tab="refine"]', "tabRefine"); setText('[data-tab="palette"]', "tabPalette");
    setText(".source-section h2", "sourceImage"); setText("#dropzone strong", "dropImage"); setText("#dropzone small", "maxFile");
    const refineSections = $$("#panel-refine > .inspector-section");
    setElementText(refineSections[1]?.querySelector("h2"), t("sampling"));
    setElementText(refineSections[2]?.querySelector("h2"), t("rules"));
    setElementText($("#detectGridBtn").querySelector("b"), t("detectGrid"));
    setFieldLabel("#sampleWidth", "targetWidth"); setFieldLabel("#maxColors", "colorCount"); setFieldLabel("#alphaThreshold", "alphaThreshold");
    $("#maxColors").nextElementSibling.textContent = t("colorUnit");
    setToggleCopy("#removeIsolated", "removeIsolated", "removeIsolatedDesc"); setToggleCopy("#smoothEdges", "smoothEdges", "smoothEdgesDesc");
    setToggleCopy("#mergeColors", "mergeColors", "mergeColorsDesc"); setFieldLabel("#colorTolerance", "colorTolerance"); setText("#refineBtn", "applyRefine");
    setToggleCopy("#dither", "dither", "ditherDesc");
    setText("#panel-palette h2", "currentPalette"); setText("#sortPalette", "sortLightness"); setText("#panel-palette p", "paletteHelp");
    const svgHeadings = $$("#panel-svg .section-heading h2");
    setElementText(svgHeadings[0], t("vectorOutput")); setElementText(svgHeadings[1], t("preview"));
    setFieldLabel("#svgScale", "pixelSize"); setToggleCopy("#mergeRects", "mergeBlocks", "mergeBlocksDesc"); setToggleCopy("#includeBg", "includeBackground", "includeBackgroundDesc");
    setFieldLabel("#bgColor", "backgroundColor"); setText("#copySvg", "copyCode"); setText("#panelExportBtn", "downloadSvg");
    $("#colorCountLabel").textContent = t("colors"); $("#nodeCountLabel").textContent = t("svgNodes");
    updateDetectionStatus();
    applyTheme(document.documentElement.dataset.theme || "light", false);
    renderAll();
  }

  function makeBlankCanvas() {
    exitCompare();
    state.sourceImage = null;
    state.sourceCrop = null;
    state.detecting = false;
    state.gridDetection = null;
    state.width = 24;
    state.height = 24;
    state.pixels = Array(24 * 24).fill(null);
    syncDimensions();
    resetHistory();
    renderAll();
  }

  function syncDimensions() {
    $("#gridWidth").value = state.width;
    $("#gridHeight").value = state.height;
    $("#sampleWidth").value = state.width;
    $("#pixelInfo").textContent = `${state.width} × ${state.height} px`;
  }

  function snapshot() {
    return { name: $("#projectName").value, width: state.width, height: state.height, pixels: [...state.pixels] };
  }

  function pushHistory() {
    state.history.push(snapshot());
    if (state.history.length > 60) state.history.shift();
    state.future = [];
    updateHistoryButtons();
    markChanged();
  }

  function resetHistory() {
    state.history = [];
    state.future = [];
    updateHistoryButtons();
  }

  function restore(data, restoreName = false) {
    if (restoreName && typeof data.name === "string" && data.name.trim()) $("#projectName").value = data.name;
    state.width = data.width;
    state.height = data.height;
    state.pixels = [...data.pixels];
    syncDimensions();
    renderAll();
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    restore(state.history.pop());
    updateHistoryButtons();
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    restore(state.future.pop());
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $("#undoBtn").disabled = !state.history.length;
    $("#redoBtn").disabled = !state.future.length;
  }

  function renderCanvas() {
    const scale = Math.max(1, Math.floor(720 / Math.max(state.width, state.height)));
    const stack = $("#canvasStack");
    stack.style.aspectRatio = `${state.width} / ${state.height}`;
    stack.classList.toggle("portrait", state.height > state.width);
    canvas.width = state.width * scale;
    canvas.height = state.height * scale;
    canvas.style.backgroundSize = `${200 / state.width}% ${200 / state.height}%`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    state.pixels.forEach((color, index) => {
      if (!color) return;
      const x = index % state.width;
      const y = Math.floor(index / state.width);
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });

    requestAnimationFrame(() => {
      renderGrid();
      renderComparison();
    });
  }

  function renderComparison() {
    if (!state.comparing || !state.sourceImage) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const outputWidth = Math.max(1, Math.round(rect.width * dpr));
    const outputHeight = Math.max(1, Math.round(rect.height * dpr));
    if (compareCanvas.width !== outputWidth || compareCanvas.height !== outputHeight) {
      compareCanvas.width = outputWidth;
      compareCanvas.height = outputHeight;
    }
    compareCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    compareCtx.clearRect(0, 0, rect.width, rect.height);
    compareCtx.imageSmoothingEnabled = true;
    const crop = state.sourceCrop || {
      x: 0,
      y: 0,
      width: state.sourceImage.naturalWidth || state.sourceImage.width,
      height: state.sourceImage.naturalHeight || state.sourceImage.height
    };
    compareCtx.drawImage(state.sourceImage, crop.x, crop.y, crop.width, crop.height, 0, 0, rect.width, rect.height);
    updateCompareSplit(state.compareSplit);
  }

  function updateCompareSplit(value) {
    state.compareSplit = Math.max(.05, Math.min(.95, value));
    const percentage = state.compareSplit * 100;
    compareCanvas.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    $("#compareDivider").style.left = `${percentage}%`;
  }

  function enterCompare() {
    if (!state.sourceImage) return toast(t("importFirst"));
    state.comparing = true;
    $("#canvasStack").classList.add("comparing");
    $("#compareBtn").classList.add("active");
    $("#compareBtn").setAttribute("aria-pressed", "true");
    renderComparison();
  }

  function exitCompare() {
    state.comparing = false;
    $("#canvasStack")?.classList.remove("comparing");
    $("#compareBtn")?.classList.remove("active");
    $("#compareBtn")?.setAttribute("aria-pressed", "false");
  }

  function toggleCompare() {
    state.comparing ? exitCompare() : enterCompare();
  }

  function renderGrid() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const outputWidth = Math.max(1, Math.round(rect.width * dpr));
    const outputHeight = Math.max(1, Math.round(rect.height * dpr));
    if (gridCanvas.width !== outputWidth || gridCanvas.height !== outputHeight) {
      gridCanvas.width = outputWidth;
      gridCanvas.height = outputHeight;
    }
    gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gridCtx.clearRect(0, 0, rect.width, rect.height);

    const cellWidth = rect.width / state.width;
    const cellHeight = rect.height / state.height;
    if (!state.gridVisible || Math.min(cellWidth, cellHeight) < 7) return;

    const styles = getComputedStyle(document.documentElement);
    const drawLines = (step, color) => {
      gridCtx.beginPath();
      for (let x = 0; x <= state.width; x += step) {
        const position = Math.min(rect.width - .5, Math.max(.5, Math.round(x * cellWidth) + .5));
        gridCtx.moveTo(position, 0);
        gridCtx.lineTo(position, rect.height);
      }
      for (let y = 0; y <= state.height; y += step) {
        const position = Math.min(rect.height - .5, Math.max(.5, Math.round(y * cellHeight) + .5));
        gridCtx.moveTo(0, position);
        gridCtx.lineTo(rect.width, position);
      }
      gridCtx.lineWidth = 1;
      gridCtx.strokeStyle = color;
      gridCtx.stroke();
    };

    drawLines(1, styles.getPropertyValue("--grid-line").trim());
    if (Math.min(cellWidth, cellHeight) >= 12) drawLines(8, styles.getPropertyValue("--grid-major").trim());
  }

  function renderAll() {
    renderCanvas();
    const colors = getPalette();
    $("#colorCount").textContent = colors.length;
    $("#pixelInfo").textContent = `${state.width} × ${state.height} px`;
    if ($("#panel-palette").classList.contains("active")) renderPalette(false, colors);
    if ($("#panel-svg").classList.contains("active")) renderSvg();
    else updateSvgNodeCount();
  }

  function getPalette() {
    const counts = new Map();
    state.pixels.forEach((c) => c && counts.set(c.toLowerCase(), (counts.get(c.toLowerCase()) || 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1]);
  }

  function renderPalette(sortByLightness = false, palette = null) {
    palette = palette || getPalette();
    if (sortByLightness) palette = palette.sort((a, b) => luminance(a[0]) - luminance(b[0]));
    const total = state.pixels.filter(Boolean).length || 1;
    $("#paletteList").innerHTML = palette.map(([color, count]) => `
      <div class="palette-item${color === state.color.toLowerCase() ? " active" : ""}" data-color="${color}" tabindex="0">
        <span class="palette-swatch" style="background:${color}"></span>
        <span class="palette-value">${color}</span>
        <span class="palette-usage">${Math.round(count / total * 100)}%</span>
      </div>`).join("") || `<p class="palette-empty">${t("paletteEmpty")}</p>`;
  }

  const { hexToRgb, rgbToHex, rgbToOklab, oklabToRgb, medianCut } = window.VexelizeAlgo;

  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex);
    return .2126 * r + .7152 * g + .0722 * b;
  }

  function colorDistance(a, b) {
    const aa = hexToRgb(a);
    const bb = hexToRgb(b);
    return Math.hypot(aa[0] - bb[0], aa[1] - bb[1], aa[2] - bb[2]);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(state.width - 1, Math.floor((event.clientX - rect.left) / rect.width * state.width))),
      y: Math.max(0, Math.min(state.height - 1, Math.floor((event.clientY - rect.top) / rect.height * state.height)))
    };
  }

  function applyTool(x, y) {
    const index = y * state.width + x;
    if (state.tool === "pencil") state.pixels[index] = state.color;
    if (state.tool === "eraser") state.pixels[index] = null;
    if (state.tool === "picker") {
      if (state.pixels[index]) setColor(state.pixels[index]);
      setTool("pencil");
    }
    if (state.tool === "fill") floodFill(x, y, state.color);
    renderAll();
  }

  function floodFill(x, y, replacement) {
    const target = state.pixels[y * state.width + x];
    if (target === replacement) return;
    const queue = [[x, y]];
    while (queue.length) {
      const [cx, cy] = queue.pop();
      const i = cy * state.width + cx;
      if (state.pixels[i] !== target) continue;
      state.pixels[i] = replacement;
      if (cx > 0) queue.push([cx - 1, cy]);
      if (cx < state.width - 1) queue.push([cx + 1, cy]);
      if (cy > 0) queue.push([cx, cy - 1]);
      if (cy < state.height - 1) queue.push([cx, cy + 1]);
    }
  }

  function setTool(tool) {
    state.tool = tool;
    $$(".tool[data-tool]").forEach((el) => el.classList.toggle("active", el.dataset.tool === tool));
    canvas.style.cursor = tool === "eraser" ? "cell" : tool === "picker" ? "copy" : "crosshair";
  }

  function setColor(color, followsTheme = false) {
    state.color = color.toLowerCase();
    state.colorFollowsTheme = followsTheme;
    $("#colorPicker").value = state.color;
    $("#colorSwatch").style.background = state.color;
    if ($("#panel-palette").classList.contains("active")) renderPalette();
  }

  function resizeGrid(newWidth, newHeight) {
    newWidth = Math.max(4, Math.min(MAX_GRID_SIZE, Number(newWidth)));
    newHeight = Math.max(4, Math.min(MAX_GRID_SIZE, Number(newHeight)));
    pushHistory();
    const next = Array(newWidth * newHeight).fill(null);
    for (let y = 0; y < Math.min(state.height, newHeight); y++) {
      for (let x = 0; x < Math.min(state.width, newWidth); x++) next[y * newWidth + x] = state.pixels[y * state.width + x];
    }
    state.width = newWidth;
    state.height = newHeight;
    state.pixels = next;
    syncDimensions();
    renderAll();
  }

  function generateSvg() {
    const scale = Math.max(1, Number($("#svgScale").value) || 16);
    const merge = $("#mergeRects").checked;
    const byColor = new Map();
    let nodes = 0;
    for (let y = 0; y < state.height; y++) {
      let x = 0;
      while (x < state.width) {
        const color = state.pixels[y * state.width + x];
        if (!color) { x++; continue; }
        let run = 1;
        if (merge) while (x + run < state.width && state.pixels[y * state.width + x + run] === color) run++;
        if (!byColor.has(color)) byColor.set(color, []);
        byColor.get(color).push(`<path d="M${x * scale} ${y * scale}h${run * scale}v${scale}H${x * scale}z"/>`);
        nodes++;
        x += run;
      }
    }
    const width = state.width * scale;
    const height = state.height * scale;
    const bg = $("#includeBg").checked ? `\n  <path fill="${$("#bgColor").value}" d="M0 0h${width}v${height}H0z"/>` : "";
    const groups = [...byColor].map(([color, paths]) => `\n  <g fill="${color}">\n    ${paths.join("\n    ")}\n  </g>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${bg}${groups}\n</svg>`;
    return { svg, nodes: nodes + ($("#includeBg").checked ? 1 : 0), width, height };
  }

  function renderSvg() {
    const data = generateSvg();
    if (svgPreviewUrl) URL.revokeObjectURL(svgPreviewUrl);
    svgPreviewUrl = URL.createObjectURL(new Blob([data.svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.alt = t("svgPreview");
    image.src = svgPreviewUrl;
    $("#svgPreview").replaceChildren(image);
    $("#nodeCount").textContent = data.nodes;
    $("#exportNodes").textContent = t("nodesCount", { count: data.nodes });
    $("#exportDimensions").textContent = `${data.width} × ${data.height} px`;
    $("#svgSize").textContent = `${(new Blob([data.svg]).size / 1024).toFixed(1)} KB`;
  }

  function updateSvgNodeCount() {
    let nodes = $("#includeBg").checked ? 1 : 0;
    const merge = $("#mergeRects").checked;
    for (let y = 0; y < state.height; y++) {
      let x = 0;
      while (x < state.width) {
        const color = state.pixels[y * state.width + x];
        if (!color) { x++; continue; }
        let run = 1;
        if (merge) while (x + run < state.width && state.pixels[y * state.width + x + run] === color) run++;
        nodes++;
        x += run;
      }
    }
    $("#nodeCount").textContent = nodes;
    $("#exportNodes").textContent = t("nodesCount", { count: nodes });
  }

  function downloadSvg() {
    const { svg } = generateSvg();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = $("#projectName").value.trim().replace(/[\\/:*?\"<>|]/g, "-") || "vexelize-art";
    a.href = url;
    a.download = `${name}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("svgDownloaded"));
  }

  function quantizeImage(image, detection = null) {
    const targetWidth = Math.max(4, Math.min(MAX_GRID_SIZE, Number($("#sampleWidth").value) || 24));
    const targetHeight = Math.max(4, Math.min(MAX_GRID_SIZE, detection?.rows || Math.round(image.height / image.width * targetWidth)));
    const maxColors = Math.max(2, Math.min(MAX_PALETTE_SIZE, Number($("#maxColors").value) || 8));
    const alphaThreshold = Number($("#alphaThreshold").value);
    const sampleFactor = Math.max(2, Math.min(6, Math.floor(384 / Math.max(targetWidth, targetHeight))));
    const sample = document.createElement("canvas");
    sample.width = targetWidth * sampleFactor;
    sample.height = targetHeight * sampleFactor;
    const sctx = sample.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth || image.width;
    let sourceHeight = image.naturalHeight || image.height;
    let cellWidth = sourceWidth / targetWidth;
    let cellHeight = sourceHeight / targetHeight;
    if (detection?.pitchX && detection?.analysisWidth) {
      cellWidth = detection.pitchX / detection.analysisWidth * sourceWidth;
      cellHeight = detection.pitchY / detection.analysisHeight * sourceHeight;
      sourceX = (detection.refinedOffsetX ?? detection.offsetX ?? 0) / detection.analysisWidth * sourceWidth;
      sourceY = (detection.refinedOffsetY ?? detection.offsetY ?? 0) / detection.analysisHeight * sourceHeight;
      sourceWidth = targetWidth * cellWidth;
      sourceHeight = targetHeight * cellHeight;
    }
    state.sourceCrop = { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight };
    if (sourceX === 0 && sourceY === 0 && cellWidth === sourceWidth / targetWidth && cellHeight === sourceHeight / targetHeight) {
      sctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, sample.width, sample.height);
    } else {
      for (let gy = 0; gy < targetHeight; gy++) {
        for (let gx = 0; gx < targetWidth; gx++) {
          sctx.drawImage(image, sourceX + gx * cellWidth, sourceY + gy * cellHeight, cellWidth, cellHeight, gx * sampleFactor, gy * sampleFactor, sampleFactor, sampleFactor);
        }
      }
    }
    const sourceData = sctx.getImageData(0, 0, sample.width, sample.height).data;
    const representatives = [];
    const opaque = [];
    const median = (values) => {
      values.sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    };

    for (let gy = 0; gy < targetHeight; gy++) {
      for (let gx = 0; gx < targetWidth; gx++) {
        const channels = [[], [], []];
        let visible = 0;
        for (let sy = 0; sy < sampleFactor; sy++) {
          for (let sx = 0; sx < sampleFactor; sx++) {
            const index = ((gy * sampleFactor + sy) * sample.width + gx * sampleFactor + sx) * 4;
            if (sourceData[index + 3] <= alphaThreshold) continue;
            visible++;
            channels[0].push(sourceData[index]);
            channels[1].push(sourceData[index + 1]);
            channels[2].push(sourceData[index + 2]);
          }
        }
        if (visible < sampleFactor * sampleFactor * .25) representatives.push(null);
        else {
          const color = channels.map(median);
          representatives.push(color);
          opaque.push(rgbToOklab(...color));
        }
      }
    }

    const palette = medianCut(opaque, maxColors);
    const paletteHex = palette.map((p) => rgbToHex(...oklabToRgb(...p)));
    const plainCache = new Map();
    const ditherCache = new Map();
    const nearestIndexFromRgb = (rgb) => {
      const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      let index = plainCache.get(key);
      if (index === undefined) {
        const lab = rgbToOklab(...rgb);
        let bestD = Infinity;
        index = 0;
        palette.forEach((p, i) => {
          const d = (lab[0] - p[0]) ** 2 + (lab[1] - p[1]) ** 2 + (lab[2] - p[2]) ** 2;
          if (d < bestD) { bestD = d; index = i; }
        });
        plainCache.set(key, index);
      }
      return index;
    };
    const nearestIndexFromLab = (lab) => {
      const key = ((Math.round(lab[0] * 512) + 512) * 4096 + Math.round(lab[1] * 512) + 2048) * 4096 + Math.round(lab[2] * 512) + 2048;
      let index = ditherCache.get(key);
      if (index === undefined) {
        let bestD = Infinity;
        index = 0;
        palette.forEach((p, i) => {
          const d = (lab[0] - p[0]) ** 2 + (lab[1] - p[1]) ** 2 + (lab[2] - p[2]) ** 2;
          if (d < bestD) { bestD = d; index = i; }
        });
        ditherCache.set(key, index);
      }
      return index;
    };
    pushHistory();
    state.width = targetWidth;
    state.height = targetHeight;
    state.pixels = new Array(representatives.length).fill(null);
    if ($("#dither").checked && palette.length > 1) {
      const error = new Float64Array(representatives.length * 3);
      for (let y = 0; y < targetHeight; y++) {
        const reverse = y & 1;
        const forward = reverse ? -1 : 1;
        for (let step = 0; step < targetWidth; step++) {
          const x = reverse ? targetWidth - 1 - step : step;
          const cell = y * targetWidth + x;
          const rgb = representatives[cell];
          if (!rgb) continue;
          const base = cell * 3;
          const lab = rgbToOklab(...rgb);
          const dl = lab[0] + error[base];
          const da = lab[1] + error[base + 1];
          const db = lab[2] + error[base + 2];
          const index = nearestIndexFromLab([dl, da, db]);
          state.pixels[cell] = paletteHex[index];
          const chosen = palette[index];
          const el = dl - chosen[0];
          const ea = da - chosen[1];
          const eb = db - chosen[2];
          const spread = (nx, ny, weight) => {
            if (nx < 0 || nx >= targetWidth || ny >= targetHeight) return;
            const neighbor = (ny * targetWidth + nx) * 3;
            error[neighbor] += el * weight;
            error[neighbor + 1] += ea * weight;
            error[neighbor + 2] += eb * weight;
          };
          spread(x + forward, y, 7 / 16);
          spread(x - forward, y + 1, 3 / 16);
          spread(x, y + 1, 5 / 16);
          spread(x + forward, y + 1, 1 / 16);
        }
      }
    } else {
      for (let cell = 0; cell < representatives.length; cell++) {
        const rgb = representatives[cell];
        state.pixels[cell] = rgb && paletteHex[nearestIndexFromRgb(rgb)];
      }
    }
    syncDimensions();
    renderAll();
  }

  // Thin DOM wrappers around VexelizeAlgo: prepare pixel buffers, delegate the math.
  function extractNativeScanlines(image) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const sampleScale = Math.min(1, 4096 / Math.max(sourceWidth, sourceHeight));
    const sampleWidth = Math.max(4, Math.round(sourceWidth * sampleScale));
    const sampleHeight = Math.max(4, Math.round(sourceHeight * sampleScale));
    const grab = (axis) => {
      const horizontal = axis === "x";
      const length = horizontal ? sampleWidth : sampleHeight;
      const crossLength = horizontal ? sourceHeight : sourceWidth;
      const canvas = document.createElement("canvas");
      canvas.width = horizontal ? length : 32;
      canvas.height = horizontal ? 32 : length;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      for (let scan = 0; scan < 32; scan++) {
        const sourcePosition = Math.min(crossLength - 1, Math.floor((scan + .5) * crossLength / 32));
        if (horizontal) context.drawImage(image, 0, sourcePosition, sourceWidth, 1, 0, scan, length, 1);
        else context.drawImage(image, sourcePosition, 0, 1, sourceHeight, scan, 0, 1, length);
      }
      const raw = context.getImageData(0, 0, canvas.width, canvas.height).data;
      // Normalize both axes to (position * 32 + scan) * 4 so the algorithm is layout-agnostic.
      const data = new Uint8ClampedArray(length * 32 * 4);
      for (let scan = 0; scan < 32; scan++) for (let position = 0; position < length; position++) {
        const from = horizontal ? (scan * length + position) * 4 : (position * 32 + scan) * 4;
        const to = (position * 32 + scan) * 4;
        data[to] = raw[from]; data[to + 1] = raw[from + 1]; data[to + 2] = raw[from + 2]; data[to + 3] = raw[from + 3];
      }
      return data;
    };
    return { scale: sampleScale, width: sampleWidth, height: sampleHeight, xData: grab("x"), yData: grab("y") };
  }

  function detectBestGrid(image) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const ratio = Math.min(1, 256 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(4, Math.round(sourceWidth * ratio));
    const height = Math.max(4, Math.round(sourceHeight * ratio));
    const analysis = document.createElement("canvas");
    analysis.width = width;
    analysis.height = height;
    const actx = analysis.getContext("2d", { willReadFrequently: true });
    actx.imageSmoothingEnabled = true;
    actx.drawImage(image, 0, 0, width, height);
    return VexelizeAlgo.detectBestGrid(
      { width, height, ratio, data: actx.getImageData(0, 0, width, height).data },
      extractNativeScanlines(image)
    );
  }
  function autoDetectGrid(showToast = true) {
    if (!state.sourceImage) {
      toast(t("importFirst"));
      return;
    }
    state.detecting = true;
    updateDetectionStatus();
    requestAnimationFrame(() => setTimeout(() => {
      const result = detectBestGrid(state.sourceImage);
      $("#sampleWidth").value = result.columns;
      state.detecting = false;
      state.gridDetection = result;
      updateDetectionStatus();
      quantizeImage(state.sourceImage, result);
      if (result.confidence < 75) toast(t("manualHint"));
      else if (showToast) toast(t("bestGrid", { columns: result.columns, rows: result.rows }));
    }, 20));
  }


  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return toast(t("validImage"));
    if (file.size > 10 * 1024 * 1024) return toast(t("imageTooLarge"));
    const image = new Image();
    image.onload = () => {
      state.sourceImage = image;
      state.gridDetection = null;
      autoDetectGrid(false);
      URL.revokeObjectURL(image.src);
      toast(t("imageLoaded"));
    };
    image.src = URL.createObjectURL(file);
  }

  function refine() {
    pushHistory();
    let next = [...state.pixels];
    if ($("#mergeColors").checked) {
      const tolerance = Number($("#colorTolerance").value);
      const palette = getPalette();
      const replacements = new Map();
      for (let i = palette.length - 1; i >= 0; i--) {
        const [color] = palette[i];
        const candidate = palette.slice(0, i).find(([other]) => colorDistance(color, other) <= tolerance);
        if (candidate) replacements.set(color, candidate[0]);
      }
      next = next.map((c) => c ? (replacements.get(c.toLowerCase()) || c) : null);
    }
    if ($("#removeIsolated").checked || $("#smoothEdges").checked) {
      const source = [...next];
      const at = (x, y) => x < 0 || y < 0 || x >= state.width || y >= state.height ? undefined : source[y * state.width + x];
      for (let y = 0; y < state.height; y++) for (let x = 0; x < state.width; x++) {
        const i = y * state.width + x;
        const neighbors = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
        const counts = new Map();
        neighbors.filter(Boolean).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
        const dominant = [...counts].sort((a, b) => b[1] - a[1])[0];
        if ($("#removeIsolated").checked && source[i] && !neighbors.includes(source[i]) && dominant) next[i] = dominant[0];
        if ($("#smoothEdges").checked && dominant && dominant[1] >= 3 && source[i] !== dominant[0]) next[i] = dominant[0];
      }
    }
    state.pixels = next;
    renderAll();
    toast(t("refineApplied"));
  }

  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  let saveTimer;
  function markChanged() {
    $("#saveState").textContent = t("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem("vexelize-project", JSON.stringify(snapshot())); } catch (_) { /* storage is optional */ }
    $("#saveState").textContent = t("saved");
    const clearCacheBtn = $("#clearCacheBtn");
    clearCacheBtn.title = t("clearCache");
    clearCacheBtn.setAttribute("aria-label", t("clearCache"));
    }, 350);
  }

  const projectName = $("#projectName");
  let nameBeforeEdit = projectName.value;

  function startRenaming() {
    if (!projectName.readOnly) return;
    nameBeforeEdit = projectName.value;
    projectName.readOnly = false;
    projectName.title = "";
    projectName.focus();
    projectName.select();
  }

  function finishRenaming(commit = true) {
    if (projectName.readOnly) return;
    const nextName = projectName.value.trim();
    projectName.value = commit && nextName ? nextName : nameBeforeEdit;
    projectName.readOnly = true;
    projectName.title = t("rename");
    if (commit && projectName.value !== nameBeforeEdit) markChanged();
  }

  projectName.addEventListener("dblclick", startRenaming);
  projectName.addEventListener("blur", () => finishRenaming(true));
  projectName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      projectName.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      finishRenaming(false);
      projectName.blur();
    }
  });

  $$(".tool[data-tool]").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
  $("#colorSwatch").addEventListener("click", () => $("#colorPicker").click());
  $("#colorPicker").addEventListener("input", (event) => setColor(event.target.value));
  $("#swapColors").addEventListener("click", () => setTool(state.tool === "eraser" ? "pencil" : "eraser"));
  $("#compareBtn").addEventListener("click", toggleCompare);
  $("#themeToggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  $("#languageSelect").addEventListener("change", (event) => applyLanguage(event.target.value));

  canvas.addEventListener("pointerdown", (event) => {
    if (state.comparing) return;
    event.preventDefault();
    state.drawing = true;
    canvas.setPointerCapture(event.pointerId);
    pushHistory();
    const p = canvasPoint(event);
    applyTool(p.x, p.y);
  });
  canvas.addEventListener("pointermove", (event) => {
    const p = canvasPoint(event);
    $("#cursorInfo").innerHTML = `X ${p.x}&nbsp;&nbsp;Y ${p.y}`;
    if (state.drawing && ["pencil", "eraser"].includes(state.tool)) applyTool(p.x, p.y);
  });
  canvas.addEventListener("pointerup", () => { state.drawing = false; markChanged(); });
  canvas.addEventListener("pointercancel", () => { state.drawing = false; });

  let draggingCompare = false;
  const compareDivider = $("#compareDivider");
  const moveCompareDivider = (event) => {
    const rect = $("#canvasStack").getBoundingClientRect();
    updateCompareSplit((event.clientX - rect.left) / rect.width);
  };
  compareDivider.addEventListener("pointerdown", (event) => {
    draggingCompare = true;
    compareDivider.setPointerCapture(event.pointerId);
    moveCompareDivider(event);
  });
  compareDivider.addEventListener("pointermove", (event) => draggingCompare && moveCompareDivider(event));
  compareDivider.addEventListener("pointerup", () => { draggingCompare = false; });
  compareDivider.addEventListener("pointercancel", () => { draggingCompare = false; });

  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);
  $("#resizeBtn").addEventListener("click", () => resizeGrid($("#gridWidth").value, $("#gridHeight").value));
  $("#zoomIn").addEventListener("click", () => setZoom(state.zoom + .1));
  $("#zoomOut").addEventListener("click", () => setZoom(state.zoom - .1));
  $("#fitBtn").addEventListener("click", () => setZoom(1));
  function setZoom(value) {
    state.zoom = Math.max(.5, Math.min(2, value));
    $("#canvasWrap").style.transform = `scale(${state.zoom})`;
    $("#zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
    requestAnimationFrame(() => { renderGrid(); renderComparison(); });
  }

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".tab").forEach((el) => el.classList.toggle("active", el === tab));
    $$(".panel").forEach((el) => el.classList.toggle("active", el.id === `panel-${tab.dataset.tab}`));
    if (tab.dataset.tab === "palette") renderPalette();
    if (tab.dataset.tab === "svg") renderSvg();
  }));

  const fileInput = $("#imageInput");
  [$("#importBtn"), $("#dropzone")].forEach((el) => el.addEventListener("click", () => fileInput.click()));
  fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
  const dropzone = $("#dropzone");
  dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("dragging"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
  dropzone.addEventListener("drop", (event) => { event.preventDefault(); dropzone.classList.remove("dragging"); loadFile(event.dataTransfer.files[0]); });

  $("#detectGridBtn").addEventListener("click", () => autoDetectGrid());
  $("#clearCacheBtn").addEventListener("click", () => {
    if (!confirm(t("clearCacheConfirm"))) return;
    try { localStorage.removeItem("vexelize-project"); } catch (_) { /* storage is optional */ }
    makeBlankCanvas();
    toast(t("cacheCleared"));
  });
  $("#refineBtn").addEventListener("click", refine);
  $("#alphaThreshold").addEventListener("input", (e) => $("#alphaValue").textContent = e.target.value);
  $("#colorTolerance").addEventListener("input", (e) => $("#toleranceValue").textContent = e.target.value);
  [$("#sampleWidth"), $("#maxColors"), $("#alphaThreshold"), $("#dither")].forEach((el) => el.addEventListener("change", () => state.sourceImage && quantizeImage(state.sourceImage)));
  $("#sortPalette").addEventListener("click", () => renderPalette(true));
  $("#paletteList").addEventListener("click", (event) => {
    const item = event.target.closest(".palette-item");
    if (item) setColor(item.dataset.color);
  });
  $("#paletteList").addEventListener("dblclick", (event) => {
    const item = event.target.closest(".palette-item");
    if (!item) return;
    const oldColor = item.dataset.color;
    const input = document.createElement("input");
    input.type = "color";
    input.value = oldColor;
    input.addEventListener("input", () => {
      state.pixels = state.pixels.map((c) => c && c.toLowerCase() === oldColor ? input.value : c);
      setColor(input.value);
      renderAll();
    });
    input.click();
  });

  [$("#svgScale"), $("#mergeRects"), $("#includeBg"), $("#bgColor")].forEach((el) => el.addEventListener("input", () => {
    $("#bgField").classList.toggle("disabled", !$("#includeBg").checked);
    if ($("#panel-svg").classList.contains("active")) renderSvg();
    else updateSvgNodeCount();
  }));
  [$("#exportBtn"), $("#panelExportBtn")].forEach((el) => el.addEventListener("click", downloadSvg));
  $("#copySvg").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(generateSvg().svg); toast(t("copySuccess")); }
    catch (_) { toast(t("clipboardDenied")); }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input")) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    if (key === "b") setTool("pencil");
    if (key === "e") setTool("eraser");
    if (key === "g") setTool("fill");
    if (key === "i") setTool("picker");
    if (key === "c") toggleCompare();
    if (event.key === "Escape" && state.comparing) exitCompare();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { renderGrid(); renderComparison(); }, 80);
  });

  try {
    const saved = JSON.parse(localStorage.getItem("vexelize-project"));
    if (saved && saved.width && saved.height && Array.isArray(saved.pixels)) restore(saved, true);
    else makeBlankCanvas();
  } catch (_) { makeBlankCanvas(); }
  applyLanguage(language, false);
})();
