export interface ShipVisual {
  readonly hullColor: number;
  readonly accentColor: number;
  readonly silhouette: readonly number[];
}

export function aircraftShipSvg(visual: ShipVisual): string {
  const points: string[] = [];
  for (let index = 0; index < visual.silhouette.length; index += 2) {
    points.push(visual.silhouette[index] + ',' + visual.silhouette[index + 1]);
  }
  const hull = '#' + visual.hullColor.toString(16).padStart(6, '0');
  const accent = '#' + visual.accentColor.toString(16).padStart(6, '0');
  return '<svg viewBox="-25 -25 50 50" xmlns="http://www.w3.org/2000/svg"><polygon points="' + points.join(' ') + '" fill="' + hull + '" stroke="' + accent + '" stroke-width="1.5" stroke-linejoin="round"/></svg>';
}
