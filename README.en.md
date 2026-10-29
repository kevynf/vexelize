<div align="center">
  <img src="favicon.svg" width="72" alt="VEXELiZE icon" />
  <h1>VEXELiZE</h1>
  <p><a href="README.md">中文</a> | <a href="README.en.md">English</a></p>
</div>

Turn pixel-style images that are not quite pixel art into clean, orderly artwork.

Vexelize finds the most likely pixel grid in an image, removes antialiasing, noise, and drift, then exports a scalable SVG. It is designed for AI-generated pixel-style images, enlarged pixel assets, and small icons with soft or uneven edges.

> **[Open Vexelize online](https://app.kevy.net/vexelize/)**
> No account, installation, or coding knowledge required.

Open the app, import an image, review the result, and download SVG. Processing happens entirely in your browser: images are never uploaded, and the downloaded project also works offline.

## Have You Run Into These Problems?

An image may look like pixel art, but break down when enlarged:

- Grid cells have inconsistent sizes or slightly shifted edges.
- AI generation adds antialiasing, gradients, and small color noise.
- An enlarged asset does not reveal the size of its original logical pixels.
- Standard vector tracing creates many irregular paths that are hard to edit.

Vexelize finds the most likely pixel grid, resamples color, and removes noise. You can compare against the source and make manual adjustments before exporting a structured SVG made from regular color blocks. The result scales without losing edge clarity and stays convenient to edit in design tools.

SVG is not necessarily smaller than the source image. Its size depends on grid size, color count, and pattern complexity. Merging continuous blocks reduces path nodes and keeps the structure simpler.

## Get Started In Three Steps

### 1. Import an image

Open the online app, use **Import image** in the top-right corner, or drop an image into the import area. PNG, JPG, WebP, and GIF files up to `10 MB` are supported.

### 2. Review and normalize

Grid detection runs automatically after import. You can:

- Use **Compare** and drag the divider to inspect source and result.
- Adjust target width and color count, then choose **Retest**.
- Enable isolated-pixel removal, edge smoothing, or similar-color merging.
- Fine-tune with pencil, eraser, fill, eyedropper, and the palette.

### 3. Export SVG

Open the **SVG** tab, set pixel size, background, and continuous-block merging, then choose **Download SVG**.

## Use It Offline

Vexelize needs no installation or build step:

1. Select **Code** on the GitHub repository page.
2. Choose **Download ZIP** and extract it.
3. Open `index.html` in a browser.

Importing, editing, and downloading SVG will work directly. Some browsers restrict clipboard access from local files; in that case, use download or run this in the project directory:

```powershell
npx serve .
```

This starts a local static server only and does not upload images.

## Features

### Grid Detection And Normalization

- Detects the true logical pixel size in enlarged pixel art.
- Finds approximate grids in AI-generated images while preserving source aspect ratio.
- Reduces antialiasing, color noise, and cell texture.
- Removes isolated pixels, smooths edges, and merges similar colors.
- Supports canvases from `4 × 4` to `256 × 256`, with up to `256` colors.

### Editing And Comparison

- Pencil, eraser, flood fill, and eyedropper tools.
- Undo and redo.
- Draggable source/result comparison divider.
- Palette selection, lightness sorting, and global color replacement.
- Double-click the project name to rename it; projects are saved locally in the browser.

### SVG Output

- Live SVG preview and node count.
- Custom pixel size and background color.
- Merge continuous same-color blocks to simplify SVG structure.
- Copy SVG code or download a file.

### Experience

- Light and dark themes, following the system or switched manually.
- Responsive desktop and mobile layout.
- Icons, fonts, and processing logic are bundled locally with no network dependency.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `B` | Pencil |
| `E` | Eraser |
| `G` | Fill |
| `I` | Eyedropper |
| `C` | Toggle source comparison |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

When renaming a project, press `Enter` to confirm or `Esc` to cancel.

## How Grid Detection Works

You do not need to understand the algorithm to use Vexelize. It first looks for repeating color boundaries in the source image to estimate pixel size. For less orderly images, it verifies the result with perceptual color edges, periodic phase, and within-cell variation.

This combination distinguishes the true pixel size from its multiples or divisors, while avoiding implausibly stretched grids for square images. Very high-resolution, extremely blurred, photographic, or boundary-poor images can still require a manual target width adjustment.

## Create Your Own Online Version

This repository's online version is available at <https://app.kevy.net/vexelize/>.

If you fork this repository, the following steps create your own online version:

1. Click **Fork** in the top-right corner of this repository.
2. In the fork, open **Settings → Pages**.
3. Set the source to **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder, then save.

GitHub Pages publishes the static app from the repository root and updates it after later pushes to `main`. Once publishing finishes, visit:

```text
https://<your GitHub username>.github.io/vexelize/
```

The first deployment can take a few minutes.

## Project Structure

- `index.html`: application entry point and UI structure.
- `styles.css`: theme, layout, and responsive styles.
- `app.js`: editing, normalization, and SVG export logic, plus the UI wiring for the algorithms.
- `algo.js`: pure grid-detection and color-quantization algorithms, UI-independent and testable in isolation.
- `vendor/lucide/`: Lucide icon script and license.
- `vendor/fonts/jersey-10/`: Jersey 10 font and OFL license.

## Get Involved

Bug reports and feature ideas are welcome through **Issues**. Improvements are welcome through **Pull Requests**. If Vexelize helps you, a **Star** is appreciated.

## License

Vexelize source code is available under the [MIT License](LICENSE). Lucide Icons use the ISC License, and Jersey 10 uses the SIL Open Font License 1.1. Full third-party license text is included in the relevant `vendor/` directories.
