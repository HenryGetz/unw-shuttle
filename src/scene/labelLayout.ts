export interface LabelInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LabelCandidate {
  id: string;
  /** Higher wins the contested space. */
  priority: number;
  /** Anchor in CSS pixels, centre of the projected 3D point. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Preferred clearance between the anchor and the label edge. */
  gap?: number;
  /** Required labels are always shown, in the least-bad free slot. */
  required?: boolean;
}

export interface LabelPlacement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

const PAD = 4;
const MAX_EXTRA = 132;

function overlaps(
  x: number,
  y: number,
  width: number,
  height: number,
  placed: LabelPlacement[],
): boolean {
  for (const other of placed) {
    if (!other.visible) continue;
    if (
      x < other.x + other.width + PAD &&
      x + width + PAD > other.x &&
      y < other.y + other.height + PAD &&
      y + height + PAD > other.y
    ) {
      return true;
    }
  }
  return false;
}

function inside(x: number, y: number, width: number, height: number, widthPx: number, heightPx: number, insets: LabelInsets): boolean {
  return (
    x >= insets.left &&
    y >= insets.top &&
    x + width <= widthPx - insets.right &&
    y + height <= heightPx - insets.bottom
  );
}

interface Attempt {
  x: number;
  y: number;
  cost: number;
}

function buildAttempts(candidate: LabelCandidate): Attempt[] {
  const { x: ax, y: ay, width, height } = candidate;
  const gap = candidate.gap ?? 8;
  const attempts: Attempt[] = [];

  // Vertical repulsion first: labels grow upwards from their anchor, then try
  // sideways and downward slots as the street gets crowded.
  for (let extra = 0; extra <= MAX_EXTRA; extra += 10) {
    attempts.push({ x: ax - width / 2, y: ay - gap - height - extra, cost: extra });
    attempts.push({
      x: ax + gap + extra,
      y: ay - height / 2,
      cost: 3 + extra,
    });
    attempts.push({
      x: ax - gap - width - extra,
      y: ay - height / 2,
      cost: 4 + extra,
    });
    attempts.push({
      x: ax + gap + extra,
      y: ay - gap - height - extra,
      cost: 6 + extra * 1.1,
    });
    attempts.push({
      x: ax - gap - width - extra,
      y: ay - gap - height - extra,
      cost: 7 + extra * 1.1,
    });
    attempts.push({ x: ax - width / 2, y: ay + gap + extra, cost: 8 + extra });
    attempts.push({
      x: ax + gap + extra,
      y: ay + gap + extra,
      cost: 10 + extra * 1.2,
    });
    attempts.push({
      x: ax - gap - width - extra,
      y: ay + gap + extra,
      cost: 11 + extra * 1.2,
    });
  }

  return attempts.sort((left, right) => left.cost - right.cost);
}

function fallback(
  candidate: LabelCandidate,
  accepted: LabelPlacement[],
  widthPx: number,
  heightPx: number,
  insets: LabelInsets,
): LabelPlacement {
  const maxX = widthPx - insets.right - candidate.width;
  const maxY = heightPx - insets.bottom - candidate.height;
  const preferredX = candidate.x - candidate.width / 2;
  const preferredY = candidate.y - (candidate.gap ?? 8) - candidate.height;
  const x = Math.min(maxX, Math.max(insets.left, preferredX));
  let bestY = Math.min(maxY, Math.max(insets.top, preferredY));
  let bestOverlap = Infinity;

  for (let y = insets.top; y <= maxY; y += 6) {
    let penalty = Math.abs(y - preferredY) * 0.05;
    for (const other of accepted) {
      if (!other.visible) continue;
      if (
        x < other.x + other.width + PAD &&
        x + candidate.width + PAD > other.x &&
        y < other.y + other.height + PAD &&
        y + candidate.height + PAD > other.y
      ) {
        penalty += 600;
      }
    }
    if (penalty < bestOverlap) {
      bestOverlap = penalty;
      bestY = y;
    }
  }

  return {
    id: candidate.id,
    x,
    y: bestY,
    width: candidate.width,
    height: candidate.height,
    visible: true,
  };
}

/**
 * Screen-space label solver. Candidates are placed highest-priority first;
 * every accepted rectangle is guaranteed not to overlap another accepted
 * rectangle and sits inside the HUD insets. Labels that cannot fit are hidden
 * rather than stacked on top of each other.
 */
export function layoutLabels(
  candidates: LabelCandidate[],
  widthPx: number,
  heightPx: number,
  insets: LabelInsets,
  obstacles: LabelPlacement[] = [],
): LabelPlacement[] {
  const ordered = [...candidates].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  );
  const accepted: LabelPlacement[] = obstacles.filter((obstacle) => obstacle.visible);
  const byId = new Map<string, LabelPlacement>();

  for (const candidate of ordered) {
    if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) continue;
    if (candidate.width <= 0 || candidate.height <= 0) continue;

    let placed: LabelPlacement | null = null;
    for (const attempt of buildAttempts(candidate)) {
      const attempts = inside(
        attempt.x,
        attempt.y,
        candidate.width,
        candidate.height,
        widthPx,
        heightPx,
        insets,
      );
      if (!attempts) continue;
      if (overlaps(attempt.x, attempt.y, candidate.width, candidate.height, accepted)) continue;
      placed = {
        id: candidate.id,
        x: attempt.x,
        y: attempt.y,
        width: candidate.width,
        height: candidate.height,
        visible: true,
      };
      break;
    }

    if (!placed) {
      if (candidate.required) {
        placed = fallback(candidate, accepted, widthPx, heightPx, insets);
      } else {
        placed = {
          id: candidate.id,
          x: candidate.x,
          y: candidate.y,
          width: candidate.width,
          height: candidate.height,
          visible: false,
        };
      }
    }

    accepted.push(placed);
    byId.set(placed.id, placed);
  }

  return candidates.map(
    (candidate) =>
      byId.get(candidate.id) ?? {
        id: candidate.id,
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height,
        visible: false,
      },
  );
}

/** Point on the label edge closest to the anchor, for the leader stem. */
export function stemOrigin(
  placement: Pick<LabelPlacement, 'x' | 'y' | 'width' | 'height'>,
  anchorX: number,
  anchorY: number,
): { x: number; y: number } {
  const centerX = placement.x + placement.width / 2;
  const centerY = placement.y + placement.height / 2;

  if (anchorY < placement.y) return { x: centerX, y: placement.y };
  if (anchorY > placement.y + placement.height) {
    return { x: centerX, y: placement.y + placement.height };
  }
  if (anchorX < placement.x) return { x: placement.x, y: centerY };
  return { x: placement.x + placement.width, y: centerY };
}
