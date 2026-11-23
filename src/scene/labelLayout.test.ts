import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CAMERA_FOV, presetPose } from './cameraPoses';
import { STOPS, STOP_ORDER } from '../data/route';
import type { SceneCamera } from './contracts';
import { layoutLabels, stemOrigin, type LabelCandidate, type LabelInsets } from './labelLayout';

const INSETS: LabelInsets = { top: 112, right: 10, bottom: 104, left: 10 };

function overlaps(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function crowdedCandidates(): LabelCandidate[] {
  return Array.from({ length: 44 }, (_, index) => ({
    id: `label-${index}`,
    priority: index,
    x: 40 + ((index * 67) % 320),
    y: 150 + ((index * 53) % 300),
    width: 46 + (index % 4) * 18,
    height: 18 + (index % 3) * 4,
    gap: 8,
  }));
}

describe('layoutLabels', () => {
  it('never overlaps visible labels and keeps them inside the HUD insets', () => {
    const placements = layoutLabels(crowdedCandidates(), 390, 520, INSETS);
    const visible = placements.filter((placement) => placement.visible);

    expect(visible.length).toBeGreaterThan(4);

    for (const placement of visible) {
      expect(placement.x).toBeGreaterThanOrEqual(INSETS.left);
      expect(placement.y).toBeGreaterThanOrEqual(INSETS.top);
      expect(placement.x + placement.width).toBeLessThanOrEqual(390 - INSETS.right);
      expect(placement.y + placement.height).toBeLessThanOrEqual(520 - INSETS.bottom);
    }

    for (let left = 0; left < visible.length; left += 1) {
      for (let right = left + 1; right < visible.length; right += 1) {
        expect(overlaps(visible[left], visible[right])).toBe(false);
      }
    }
  });

  it('gives the bus badge space ahead of stop pills in the same spot', () => {
    const placements = layoutLabels(
      [
        { id: 'stop:ram', priority: 900, x: 200, y: 280, width: 72, height: 26, gap: 10 },
        { id: 'bus', priority: 1000, x: 200, y: 280, width: 82, height: 27, gap: 54, required: true },
        { id: 'stop:akenson', priority: 600, x: 208, y: 292, width: 64, height: 26, gap: 10 },
      ],
      390,
      520,
      INSETS,
    );

    const bus = placements.find((placement) => placement.id === 'bus');
    const ram = placements.find((placement) => placement.id === 'stop:ram');
    expect(bus?.visible).toBe(true);
    expect(ram?.visible).toBe(true);
    expect(bus && ram && overlaps(bus, ram)).toBe(false);
  });

  it('hides a low-priority label that would collide with a reserved obstacle', () => {
    const placements = layoutLabels(
      [{ id: 'place', priority: 10, x: 200, y: 300, width: 120, height: 24, gap: 6 }],
      390,
      520,
      INSETS,
      [{ id: 'obstacle', x: 10, y: 112, width: 370, height: 304, visible: true }],
    );

    expect(placements[0].visible).toBe(false);
  });

  it('anchors the leader stem on the label edge nearest the 3D point', () => {
    const origin = stemOrigin({ x: 100, y: 100, width: 60, height: 26 }, 130, 160);
    expect(origin).toEqual({ x: 130, y: 126 });
  });
});


const VIEWPORTS: Array<[number, number]> = [
  [375, 460],
  [390, 460],
  [430, 520],
  [1440, 780],
];

function project(
  mode: Exclude<SceneCamera, 'follow'>,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
): { x: number; y: number } {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 2, 20000);
  const pose = presetPose(mode, camera, width / height);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const point = new THREE.Vector3(x, y, z).project(camera);
  return { x: (point.x * 0.5 + 0.5) * width, y: (-point.y * 0.5 + 0.5) * height };
}

describe('scene label layout under the real camera presets', () => {
  it.each(VIEWPORTS.flatMap(([width, height]) => (['campus', 'route'] as const).map((mode) => [width, height, mode] as const)))(
    'resolves every stop, bus and building label at %ix%i (%s)',
    (width, height, mode) => {
      const compact = width <= 430;
      const insets: LabelInsets = compact
        ? { top: 112, right: 10, bottom: 104, left: 10 }
        : { top: 96, right: 14, bottom: 86, left: 14 };
      const candidates: LabelCandidate[] = [];

      for (const id of STOP_ORDER) {
        const stop = STOPS[id];
        const anchor = project(mode, width, height, stop.x, 26, stop.z);
        candidates.push({
          id: `stop:${id}`,
          priority: id === 'ramseyer' ? 900 : 500,
          x: anchor.x,
          y: anchor.y,
          width: id === 'ramseyer' ? 68 : compact ? 52 : 74,
          height: compact ? 24 : 26,
          gap: 9,
        });
      }

      const busStop = STOPS.ramseyer;
      const busAnchor = project(mode, width, height, busStop.x, 4, busStop.z);
      candidates.push({
        id: 'bus',
        priority: 1000,
        x: busAnchor.x,
        y: busAnchor.y,
        width: compact ? 74 : 86,
        height: compact ? 24 : 28,
        gap: 54,
        required: true,
      });

      candidates.push({
        id: 'place:billy-graham-commons',
        priority: 300,
        x: busAnchor.x - 40,
        y: busAnchor.y + 12,
        width: compact ? 96 : 150,
        height: compact ? 16 : 18,
        gap: 4,
      });

      const placements = layoutLabels(candidates, width, height, insets);
      const visible = placements.filter((placement) => placement.visible);

      expect(placements.find((placement) => placement.id === 'bus')?.visible).toBe(true);
      expect(placements.find((placement) => placement.id === 'stop:ramseyer')?.visible).toBe(true);

      for (const placement of visible) {
        expect(placement.x).toBeGreaterThanOrEqual(insets.left);
        expect(placement.y).toBeGreaterThanOrEqual(insets.top);
        expect(placement.x + placement.width).toBeLessThanOrEqual(width - insets.right);
        expect(placement.y + placement.height).toBeLessThanOrEqual(height - insets.bottom);
      }
      for (let left = 0; left < visible.length; left += 1) {
        for (let right = left + 1; right < visible.length; right += 1) {
          expect(overlaps(visible[left], visible[right])).toBe(false);
        }
      }
    },
  );
});
