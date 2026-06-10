// Two-piece compass for the widget. We render the dial face and the V-needle
// as SEPARATE SVGs, stacked in an OverlapWidget. The needle is rotated by the
// widget library's native `rotation` style (Android View.setRotation) instead
// of an SVG `transform`, because AndroidSVG was silently dropping our chained
// transform sequence on some devices.
//
// Both SVGs share viewBox 0 0 200 200 so they line up pixel-perfectly when
// stacked at the same size.

// Geometric V-needle path — same source as components/compass/ViceNeedle.tsx.
// Natural path orientation: horns up, apex at bottom (in 1272vb). We pre-flip
// with a single `rotate(180 636 636)` so the SVG ships needle-apex-up.
const NEEDLE_PATH =
  'M633.961 1108.92C636.035 1097.28 641.593 1078.8 644.821 1067.07L664.079 996.781L719.276 794.561L734.896 736.135C744.797 699.547 755.819 661.949 756.878 623.812C757.981 584.275 755.189 544.46 767.576 506.219C777.62 474.597 796.592 445.585 824.156 426.49C857.882 402.623 899.752 393.348 940.363 400.748C983.061 408.789 1021.9 432.677 1046.45 468.906C1068.64 501.672 1077.15 541.848 1070.17 580.834C1064.27 611.825 1051.12 639.721 1025.91 659.76C1013.98 669.247 995.609 679.282 979.485 677.536C977.634 677.335 977.08 676.953 976.263 675.699C976.955 673.681 993.086 662.785 997.236 659.061C1007.3 649.933 1015.35 638.783 1020.84 626.333C1029.58 606.078 1030.71 583.036 1022.18 563.071C994.681 498.74 921.341 513.924 895.029 570.636C883.571 595.324 883.895 614.279 878.586 639.262C874.094 659.599 867.988 679.543 860.331 698.905C844.362 739.986 826.978 781.838 810.424 822.722L757.713 955.247L681.369 1148.65C665.406 1189.4 649.712 1231.62 633.032 1272L484.063 887.263L434.458 760.937C425.047 736.972 414.991 712.045 406.385 687.815C400.074 670.273 395.025 652.301 391.276 634.036C387.874 616.72 386.094 598.211 380.159 581.61C371.575 558.073 356.433 538.274 333.59 527.441C299.421 511.237 265.076 526.562 249.623 560.315C233.791 594.893 246.11 634.687 273.211 659.754C276.784 663.06 293.032 672.93 294.112 675.826C293.254 677.04 292.538 677.749 290.856 677.709C240.993 676.523 207.694 624.128 200.492 580.821C192.203 546.24 201.287 504.686 220.164 475.203C294.708 358.771 477.374 380.682 507.293 521.992C513.979 553.573 513.351 582.331 513.351 614.441C513.609 630.97 516.204 658.138 519.873 674.16C530.188 719.192 542.375 764.754 554.278 809.433L602.132 988.512C612.926 1028.69 624.104 1068.45 633.961 1108.92Z';

const HUB_PATH =
  'M636 560.818C677.026 560.818 710.284 594.023 710.284 634.984C710.284 675.945 677.026 709.15 636 709.15C594.974 709.15 561.715 675.945 561.715 634.984C561.715 594.023 594.974 560.818 636 560.818ZM636 595.361C614.082 595.361 596.314 613.101 596.313 634.984C596.313 656.867 614.082 674.607 636 674.607C657.918 674.607 675.687 656.867 675.687 634.984C675.686 613.101 657.918 595.361 636 595.361Z';

const VIEWBOX = 200;
const CX = 100;
const CY = 100;
const TICK_OUTER = 92;
const LABEL_RADIUS = 66;

const COLORS = {
  ringDim: '#241f1b',
  tickGold: '#d9b370',
  tickMuted: '#3a342e',
  labelMuted: '#a89c87',
  needle: '#FFB900',
};

// Dial face — ring + ticks ONLY (no labels). Rotates as one rigid SVG with
// the dial layer so the cardinal ticks stay aligned to geographic N/E/S/W.
export function dialFaceSvg(): string {
  let ticks = '';
  for (let i = 0; i < 24; i++) {
    const angle = i * 15;
    const isCardinal = i % 6 === 0;
    const isMid = !isCardinal && i % 3 === 0;
    const length = isCardinal ? 12 : isMid ? 7 : 4;
    const stroke = isCardinal ? COLORS.tickGold : COLORS.tickMuted;
    const sw = isCardinal ? 1.8 : 1;
    ticks += `<line x1="${CX}" y1="${CY - TICK_OUTER}" x2="${CX}" y2="${CY - TICK_OUTER + length}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" transform="rotate(${angle} ${CX} ${CY})"/>`;
  }

  const ring = `<circle cx="${CX}" cy="${CY}" r="${TICK_OUTER}" fill="none" stroke="${COLORS.ringDim}" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">${ring}${ticks}</svg>`;
}

// Cardinal labels — positioned around the dial so each letter sits at its
// world-aligned spot, but rendered WITHOUT rotation so each glyph stays
// upright regardless of how the phone is held. `phoneHeading` is the same
// reading used to rotate the dial face; we apply (-heading) to each label's
// angular position, then draw the letter at that point with no transform.
export function dialLabelsSvg(phoneHeading: number | null): string {
  const heading = phoneHeading ?? 0;
  const labels = [
    { t: 'N', bearing: 0 },
    { t: 'E', bearing: 90 },
    { t: 'S', bearing: 180 },
    { t: 'W', bearing: 270 },
  ];

  const elements = labels
    .map((l) => {
      const angleRad = ((l.bearing - heading) * Math.PI) / 180;
      const x = CX + LABEL_RADIUS * Math.sin(angleRad);
      const y = CY - LABEL_RADIUS * Math.cos(angleRad);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="700" font-family="sans-serif" fill="${COLORS.labelMuted}">${l.t}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">${elements}</svg>`;
}

// V-needle SVG — apex points UP (north) in the SVG's natural orientation.
// Rotation is applied externally via the lib's `rotation` style prop, which
// maps to Android's View.setRotation (rotates around the view's center).
//
// Layout: nested <svg> with its own 1272vb viewBox + preserveAspectRatio
// lets us drop the needle's intrinsic coordinate system into our 200vb
// canvas without chained outer transforms. Centered at (100,100) within a
// 140×140 region so it fits cleanly inside the 92r ring.
export function needleSvg(): string {
  const inset = 30; // 200 - 140 = 60, /2 = 30 → centers a 140×140 box
  const size = VIEWBOX - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}"><svg x="${inset}" y="${inset}" width="${size}" height="${size}" viewBox="0 0 1272 1272" preserveAspectRatio="xMidYMid meet"><g transform="rotate(180 636 636)"><path d="${NEEDLE_PATH}" fill="${COLORS.needle}"/><path d="${HUB_PATH}" fill="${COLORS.needle}"/></g></svg></svg>`;
}
