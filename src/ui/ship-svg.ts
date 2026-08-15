export interface ShipVisual {
  readonly hullColor: number;
  readonly accentColor: number;
  readonly silhouette: readonly number[];
  readonly imageUrl?: string;
}

export function silhouetteCentroid(silhouette: readonly number[]): {
  readonly x: number;
  readonly y: number;
} {
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < silhouette.length; index += 2) {
    sumX += silhouette[index] ?? 0;
    sumY += silhouette[index + 1] ?? 0;
  }
  const count = Math.max(1, silhouette.length / 2);
  return { x: sumX / count, y: sumY / count };
}

/** Inner polygon points scaled toward the silhouette centroid (cockpit/canopy). */
export function scaledSilhouette(
  silhouette: readonly number[],
  factor: number,
): readonly number[] {
  const centroid = silhouetteCentroid(silhouette);
  const scaled: number[] = [];
  for (let index = 0; index < silhouette.length; index += 2) {
    const x = silhouette[index] ?? 0;
    const y = silhouette[index + 1] ?? 0;
    scaled.push(
      centroid.x + (x - centroid.x) * factor,
      centroid.y + (y - centroid.y) * factor,
    );
  }
  return scaled;
}

/** Renders the aircraft visual as HTML: an <img> when an image is provided,
 *  otherwise the procedural SVG. */
export function aircraftVisualHtml(visual: ShipVisual): string {
  if (visual.imageUrl !== undefined) {
    return '<img src="' + visual.imageUrl + '" alt="" class="aircraft-visual"/>';
  }
  return aircraftShipSvg(visual);
}

export function aircraftShipSvg(visual: ShipVisual): string {
  const points: string[] = [];
  for (let index = 0; index < visual.silhouette.length; index += 2) {
    points.push(visual.silhouette[index] + ',' + visual.silhouette[index + 1]);
  }
  const hull = '#' + visual.hullColor.toString(16).padStart(6, '0');
  const accent = '#' + visual.accentColor.toString(16).padStart(6, '0');
  const cockpit = scaledSilhouette(visual.silhouette, 0.42);
  const cockpitPoints: string[] = [];
  for (let index = 0; index < cockpit.length; index += 2) {
    cockpitPoints.push(
      (cockpit[index] ?? 0).toFixed(1) + ',' + (cockpit[index + 1] ?? 0).toFixed(1),
    );
  }
  // Engine glow sits just behind the rearmost silhouette point (nose points up).
  let maxY = -Infinity;
  let tailX = 0;
  for (let index = 1; index < visual.silhouette.length; index += 2) {
    const y = visual.silhouette[index] ?? 0;
    if (y > maxY) {
      maxY = y;
      tailX = visual.silhouette[index - 1] ?? 0;
    }
  }
  return '<svg viewBox="-25 -25 50 50" xmlns="http://www.w3.org/2000/svg">' +
    '<polygon points="' + points.join(' ') + '" fill="' + hull +
    '" stroke="' + accent + '" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<polygon points="' + cockpitPoints.join(' ') + '" fill="' + accent + '" opacity="0.55"/>' +
    '<ellipse cx="' + tailX.toFixed(1) + '" cy="' + (maxY + 3).toFixed(1) +
    '" rx="4" ry="2" fill="' + accent + '" opacity="0.7"/>' +
    '</svg>';
}
