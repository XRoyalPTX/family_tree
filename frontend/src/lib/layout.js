// Dimensions for Horizontal (Left-to-Right) layout — ideal for families with many children
export const CARD_WIDTH = 224;
export const CARD_HEIGHT = 64;
export const COUPLE_GAP = 14;
export const SIBLING_GAP = 18;
export const CLUSTER_GAP = 44;
export const GENERATION_GAP = 330;

// Dimensions for Vertical (Top-to-Bottom) layout
export const V_CARD_WIDTH = 216;
export const V_CARD_HEIGHT = 72;
export const V_COUPLE_GAP = 36;
export const V_CLUSTER_GAP = 52;
export const V_GENERATION_GAP = 180;

export function formatLifespan(person) {
  if (!person) return '';
  const bPrefix = person.is_birth_year_approx ? '~' : '';
  const dPrefix = person.is_death_year_approx ? '~' : '';
  const b = person.birth_year ? `${bPrefix}${person.birth_year}` : person.birth_date || '?';

  if (person.is_alive && !person.death_year && !person.death_date) {
    return person.birth_year || person.birth_date ? `${b} — н.в.` : 'Жив(а)';
  }
  const d = person.death_year ? `${dPrefix}${person.death_year}` : person.death_date || '?';
  if (b === '?' && d === '?') return 'Годы не указаны';
  return `${b} — ${d}`;
}

export function formatFullName(person) {
  if (!person) return '';
  const parts = [];
  if (person.last_name) {
    parts.push(
      person.maiden_name ? `${person.last_name} (${person.maiden_name})` : person.last_name
    );
  } else if (person.maiden_name) {
    parts.push(`(${person.maiden_name})`);
  }
  if (person.first_name) parts.push(person.first_name);
  if (person.middle_name) parts.push(person.middle_name);
  return parts.join(' ');
}

export function formatShortName(person) {
  if (!person) return '';
  const last = person.last_name || '';
  const first = person.first_name || '';
  return `${last} ${first}`.trim() || first;
}

export function getPersonRelatives(personId, persons = [], unions = [], childRelations = []) {
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const unionMap = new Map(unions.map((u) => [u.id, u]));

  const parents = [];
  const siblings = [];
  const parentUnionIds = new Set();

  for (const cr of childRelations) {
    if (cr.child_id === personId) {
      parentUnionIds.add(cr.union_id);
      const u = unionMap.get(cr.union_id);
      if (u) {
        if (u.partner1_id && personMap.has(u.partner1_id)) {
          parents.push({
            person: personMap.get(u.partner1_id),
            relationType: cr.relation_type,
            unionId: u.id,
          });
        }
        if (u.partner2_id && personMap.has(u.partner2_id)) {
          parents.push({
            person: personMap.get(u.partner2_id),
            relationType: cr.relation_type,
            unionType: u.union_type,
            unionId: u.id,
          });
        }
      }
    }
  }

  for (const cr of childRelations) {
    if (parentUnionIds.has(cr.union_id) && cr.child_id !== personId) {
      const sib = personMap.get(cr.child_id);
      if (sib && !siblings.some((s) => s.id === sib.id)) {
        siblings.push(sib);
      }
    }
  }

  const unionsWithPartners = [];
  const children = [];

  for (const u of unions) {
    if (u.partner1_id === personId || u.partner2_id === personId) {
      const partnerId = u.partner1_id === personId ? u.partner2_id : u.partner1_id;
      const partner = partnerId ? personMap.get(partnerId) : null;
      const unionChildren = childRelations
        .filter((cr) => cr.union_id === u.id)
        .map((cr) => ({
          person: personMap.get(cr.child_id),
          relationType: cr.relation_type,
          unionId: u.id,
        }))
        .filter((item) => item.person);

      unionsWithPartners.push({
        union: u,
        partner,
        children: unionChildren,
      });

      for (const c of unionChildren) {
        if (!children.some((existing) => existing.person.id === c.person.id)) {
          children.push(c);
        }
      }
    }
  }

  return {
    parents,
    siblings,
    unionsWithPartners,
    children,
  };
}

export function getLineageSet(personId, persons = [], unions = [], childRelations = []) {
  const ancestorIds = new Set();
  const descendantIds = new Set();
  const activeUnionIds = new Set();

  if (!personId) {
    return { ancestorIds, descendantIds, activeUnionIds, allHighlightedIds: new Set() };
  }

  const unionMap = new Map(unions.map((u) => [u.id, u]));

  // Traverse ancestors upward
  const upQueue = [personId];
  const visitedUp = new Set([personId]);
  while (upQueue.length > 0) {
    const curr = upQueue.shift();
    for (const cr of childRelations) {
      if (cr.child_id === curr) {
        activeUnionIds.add(cr.union_id);
        const u = unionMap.get(cr.union_id);
        if (u) {
          for (const pid of [u.partner1_id, u.partner2_id]) {
            if (pid && !visitedUp.has(pid)) {
              visitedUp.add(pid);
              ancestorIds.add(pid);
              upQueue.push(pid);
            }
          }
        }
      }
    }
  }

  // Traverse descendants downward
  const downQueue = [personId];
  const visitedDown = new Set([personId]);
  while (downQueue.length > 0) {
    const curr = downQueue.shift();
    for (const u of unions) {
      if (u.partner1_id === curr || u.partner2_id === curr) {
        const unionChildren = childRelations.filter((cr) => cr.union_id === u.id);
        if (unionChildren.length > 0 || curr === personId) {
          activeUnionIds.add(u.id);
        }
        for (const cr of unionChildren) {
          if (!visitedDown.has(cr.child_id)) {
            visitedDown.add(cr.child_id);
            descendantIds.add(cr.child_id);
            downQueue.push(cr.child_id);
          }
        }
      }
    }
  }

  const allHighlightedIds = new Set([personId, ...ancestorIds, ...descendantIds]);
  for (const u of unions) {
    if (u.partner1_id === personId && u.partner2_id) allHighlightedIds.add(u.partner2_id);
    if (u.partner2_id === personId && u.partner1_id) allHighlightedIds.add(u.partner1_id);
  }

  return { ancestorIds, descendantIds, activeUnionIds, allHighlightedIds };
}

/**
 * Rounded orthogonal path for horizontal left-to-right tree:
 * Goes from (x1, y1) horizontally to busX, vertically along busX to y2, and horizontally to (x2, y2).
 */
function buildHorizontalOrthoPath(x1, y1, x2, y2, busX) {
  const r = 8;
  if (Math.abs(y1 - y2) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const dy = y2 > y1 ? 1 : -1;
  const rad = Math.min(
    r,
    Math.abs(busX - x1) / 2,
    Math.abs(x2 - busX) / 2,
    Math.abs(y2 - y1) / 2
  );
  if (rad < 2) {
    return `M ${x1} ${y1} L ${busX} ${y1} L ${busX} ${y2} L ${x2} ${y2}`;
  }
  return [
    `M ${x1} ${y1}`,
    `L ${busX - rad} ${y1}`,
    `Q ${busX} ${y1} ${busX} ${y1 + dy * rad}`,
    `L ${busX} ${y2 - dy * rad}`,
    `Q ${busX} ${y2} ${busX + rad} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ');
}

/**
 * Rounded orthogonal path for vertical top-to-bottom tree:
 * Goes from (x1, y1) vertically to busY, horizontally along busY to x2, and vertically to (x2, y2).
 */
function buildVerticalOrthoPath(x1, y1, x2, y2, busY) {
  const r = 8;
  if (Math.abs(x1 - x2) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const dx = x2 > x1 ? 1 : -1;
  const rad = Math.min(
    r,
    Math.abs(busY - y1) / 2,
    Math.abs(y2 - busY) / 2,
    Math.abs(x2 - x1) / 2
  );
  if (rad < 2) {
    return `M ${x1} ${y1} L ${x1} ${busY} L ${x2} ${busY} L ${x2} ${y2}`;
  }
  return [
    `M ${x1} ${y1}`,
    `L ${x1} ${busY - rad}`,
    `Q ${x1} ${busY} ${x1 + dx * rad} ${busY}`,
    `L ${x2 - dx * rad} ${busY}`,
    `Q ${x2} ${busY} ${x2} ${busY + rad}`,
    `L ${x2} ${y2}`,
  ].join(' ');
}

export function computeTreeLayout(
  persons = [],
  unions = [],
  childRelations = [],
  orientation = 'horizontal'
) {
  if (!persons.length) {
    return {
      orientation,
      nodes: [],
      unionNodes: [],
      partnerEdges: [],
      childEdges: [],
      generationBands: [],
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600, width: 800, height: 600 },
    };
  }

  const isHorizontal = orientation === 'horizontal';
  const cardW = isHorizontal ? CARD_WIDTH : V_CARD_WIDTH;
  const cardH = isHorizontal ? CARD_HEIGHT : V_CARD_HEIGHT;
  const coupleGap = isHorizontal ? COUPLE_GAP : V_COUPLE_GAP;
  const siblingGap = SIBLING_GAP;
  const clusterGap = isHorizontal ? CLUSTER_GAP : V_CLUSTER_GAP;
  const genGap = isHorizontal ? GENERATION_GAP : V_GENERATION_GAP;

  // Along the secondary axis (Y for horizontal tree, X for vertical tree), each card has size `secSize`:
  const secSize = isHorizontal ? cardH : cardW;

  const personMap = new Map(persons.map((p) => [p.id, p]));
  const unionMap = new Map(unions.map((u) => [u.id, u]));

  // 1. Assign generation numbers (topological + spouse equality relaxation)
  const gen = new Map();
  for (const p of persons) {
    gen.set(p.id, 0);
  }

  const parentChildPairs = [];
  const childParentUnionMap = new Map();
  for (const cr of childRelations) {
    const u = unionMap.get(cr.union_id);
    if (!u || !personMap.has(cr.child_id)) continue;
    childParentUnionMap.set(cr.child_id, u.id);
    if (u.partner1_id && personMap.has(u.partner1_id)) {
      parentChildPairs.push([u.partner1_id, cr.child_id]);
    }
    if (u.partner2_id && personMap.has(u.partner2_id)) {
      parentChildPairs.push([u.partner2_id, cr.child_id]);
    }
  }

  const spousePairs = [];
  for (const u of unions) {
    if (
      u.partner1_id &&
      u.partner2_id &&
      personMap.has(u.partner1_id) &&
      personMap.has(u.partner2_id)
    ) {
      spousePairs.push([u.partner1_id, u.partner2_id]);
    }
  }

  const maxIter = Math.max(persons.length * 3, 24);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const [parentId, childId] of parentChildPairs) {
      const pGen = gen.get(parentId) ?? 0;
      const cGen = gen.get(childId) ?? 0;
      if (cGen < pGen + 1) {
        gen.set(childId, pGen + 1);
        changed = true;
      }
    }
    for (const [s1, s2] of spousePairs) {
      const g1 = gen.get(s1) ?? 0;
      const g2 = gen.get(s2) ?? 0;
      if (g1 !== g2) {
        const m = Math.max(g1, g2);
        gen.set(s1, m);
        gen.set(s2, m);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Pull parents down if they have no ancestors of their own pushing them higher
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const [parentId, childId] of parentChildPairs) {
      const pGen = gen.get(parentId) ?? 0;
      const cGen = gen.get(childId) ?? 0;
      const hasOwnParents = parentChildPairs.some(([, c]) => c === parentId);
      if (!hasOwnParents && pGen < cGen - 1) {
        gen.set(parentId, cGen - 1);
        changed = true;
      }
    }
    for (const [s1, s2] of spousePairs) {
      const g1 = gen.get(s1) ?? 0;
      const g2 = gen.get(s2) ?? 0;
      if (g1 !== g2) {
        const m = Math.max(g1, g2);
        gen.set(s1, m);
        gen.set(s2, m);
        changed = true;
      }
    }
    if (!changed) break;
  }

  let minGen = Infinity;
  for (const g of gen.values()) {
    if (g < minGen) minGen = g;
  }
  for (const [id, g] of gen.entries()) {
    gen.set(id, g - minGen);
  }

  // 2. Group persons by generation and form couple blocks within each generation
  const generationsMap = new Map();
  let maxGen = 0;
  for (const p of persons) {
    const g = gen.get(p.id) ?? 0;
    if (g > maxGen) maxGen = g;
    if (!generationsMap.has(g)) generationsMap.set(g, []);
    generationsMap.get(g).push(p);
  }

  // secPos stores the center coordinate along the secondary axis (cy for horizontal, cx for vertical)
  const secPos = new Map();
  const blocksByGen = new Map();

  for (let g = 0; g <= maxGen; g++) {
    const rowPersons = (generationsMap.get(g) || []).slice().sort((a, b) => {
      // Group siblings from the same parent union together first, then sort by birth year
      const ua = childParentUnionMap.get(a.id) ?? 0;
      const ub = childParentUnionMap.get(b.id) ?? 0;
      if (ua !== ub) return ua - ub;
      const ay = a.birth_year ?? 9999;
      const by = b.birth_year ?? 9999;
      if (ay !== by) return ay - by;
      return a.id - b.id;
    });

    const visited = new Set();
    const blocks = [];

    for (const p of rowPersons) {
      if (visited.has(p.id)) continue;
      const members = [p.id];
      visited.add(p.id);

      // Attach any spouses on the same generation so couples always stay side-by-side
      for (const u of unions) {
        let spouseId = null;
        if (u.partner1_id === p.id && u.partner2_id) spouseId = u.partner2_id;
        else if (u.partner2_id === p.id && u.partner1_id) spouseId = u.partner1_id;
        if (spouseId && !visited.has(spouseId) && (gen.get(spouseId) ?? 0) === g) {
          members.push(spouseId);
          visited.add(spouseId);
        }
      }

      // Find parentUnionId for sibling spacing optimization
      let parentUnionId = null;
      for (const pid of members) {
        if (childParentUnionMap.has(pid)) {
          parentUnionId = childParentUnionMap.get(pid);
          break;
        }
      }

      blocks.push({
        members,
        parentUnionId,
        span: members.length * secSize + (members.length - 1) * coupleGap,
        center: 0,
      });
    }

    blocksByGen.set(g, blocks);
  }

  function resolveGenerationBlocks(blocks) {
    if (!blocks.length) return;
    blocks.sort((a, b) => a.center - b.center);

    // Forward pass: push apart overlapping blocks (use tighter siblingGap for siblings of same union!)
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];
      const sameParents =
        prev.parentUnionId !== null && prev.parentUnionId === curr.parentUnionId;
      const gap = sameParents ? siblingGap : clusterGap;
      const minDist = prev.span / 2 + curr.span / 2 + gap;
      if (curr.center - prev.center < minDist) {
        curr.center = prev.center + minDist;
      }
    }

    // Backward pass
    for (let i = blocks.length - 2; i >= 0; i--) {
      const curr = blocks[i];
      const next = blocks[i + 1];
      const sameParents =
        curr.parentUnionId !== null && curr.parentUnionId === next.parentUnionId;
      const gap = sameParents ? siblingGap : clusterGap;
      const minDist = curr.span / 2 + next.span / 2 + gap;
      if (next.center - curr.center < minDist) {
        curr.center = next.center - minDist;
      }
    }

    for (const b of blocks) {
      const startEdge = b.center - b.span / 2;
      b.members.forEach((pid, idx) => {
        const memberCenter = startEdge + idx * (secSize + coupleGap) + secSize / 2;
        secPos.set(pid, memberCenter);
      });
    }
  }

  // Pass 1: Root-to-leaves (align children under/beside their parents)
  for (let g = 0; g <= maxGen; g++) {
    const blocks = blocksByGen.get(g) || [];
    let cursor = 0;
    for (const b of blocks) {
      const parentCoords = [];
      for (const pid of b.members) {
        for (const cr of childRelations) {
          if (cr.child_id === pid) {
            const u = unionMap.get(cr.union_id);
            if (u) {
              if (u.partner1_id && secPos.has(u.partner1_id))
                parentCoords.push(secPos.get(u.partner1_id));
              if (u.partner2_id && secPos.has(u.partner2_id))
                parentCoords.push(secPos.get(u.partner2_id));
            }
          }
        }
      }
      if (parentCoords.length > 0) {
        b.center = parentCoords.reduce((acc, v) => acc + v, 0) / parentCoords.length;
      } else {
        b.center = cursor + b.span / 2;
      }
      cursor = Math.max(cursor, b.center + b.span / 2 + clusterGap);
    }
    resolveGenerationBlocks(blocks);
  }

  // Pass 2: Leaves-to-root (center parents over their children's span)
  for (let g = maxGen - 1; g >= 0; g--) {
    const blocks = blocksByGen.get(g) || [];
    for (const b of blocks) {
      const childCoords = [];
      for (const pid of b.members) {
        for (const u of unions) {
          if (u.partner1_id === pid || u.partner2_id === pid) {
            for (const cr of childRelations) {
              if (cr.union_id === u.id && secPos.has(cr.child_id)) {
                childCoords.push(secPos.get(cr.child_id));
              }
            }
          }
        }
      }
      if (childCoords.length > 0) {
        const minC = Math.min(...childCoords);
        const maxC = Math.max(...childCoords);
        b.center = (minC + maxC) / 2;
      }
    }
    resolveGenerationBlocks(blocks);
  }

  // Pass 3: Final root-to-leaves refinement
  for (let g = 1; g <= maxGen; g++) {
    const blocks = blocksByGen.get(g) || [];
    // Group sibling blocks by parentUnionId so all children of a couple stay centered around the couple
    const byUnion = new Map();
    for (const b of blocks) {
      if (b.parentUnionId !== null) {
        if (!byUnion.has(b.parentUnionId)) byUnion.set(b.parentUnionId, []);
        byUnion.get(b.parentUnionId).push(b);
      }
    }

    for (const [uId, sibBlocks] of byUnion.entries()) {
      const u = unionMap.get(uId);
      if (!u) continue;
      const pCoords = [];
      if (u.partner1_id && secPos.has(u.partner1_id)) pCoords.push(secPos.get(u.partner1_id));
      if (u.partner2_id && secPos.has(u.partner2_id)) pCoords.push(secPos.get(u.partner2_id));
      if (!pCoords.length) continue;

      const targetCenter = pCoords.reduce((a, v) => a + v, 0) / pCoords.length;
      const totalSpan =
        sibBlocks.reduce((acc, sb) => acc + sb.span, 0) +
        (sibBlocks.length - 1) * siblingGap;
      let start = targetCenter - totalSpan / 2;
      for (const sb of sibBlocks) {
        sb.center = start + sb.span / 2;
        start += sb.span + siblingGap;
      }
    }

    resolveGenerationBlocks(blocks);
  }

  // Pass 4: Final bottom-up pass so parents re-center if children were shifted by collision resolution
  for (let g = maxGen - 1; g >= 0; g--) {
    const blocks = blocksByGen.get(g) || [];
    for (const b of blocks) {
      const childCoords = [];
      for (const pid of b.members) {
        for (const u of unions) {
          if (u.partner1_id === pid || u.partner2_id === pid) {
            for (const cr of childRelations) {
              if (cr.union_id === u.id && secPos.has(cr.child_id)) {
                childCoords.push(secPos.get(cr.child_id));
              }
            }
          }
        }
      }
      if (childCoords.length > 0) {
        const minC = Math.min(...childCoords);
        const maxC = Math.max(...childCoords);
        b.center = (minC + maxC) / 2;
      }
    }
    resolveGenerationBlocks(blocks);
  }

  // 3. Build visual nodes
  const nodes = persons.map((p) => {
    const g = gen.get(p.id) ?? 0;
    const sec = secPos.get(p.id) ?? 0;
    const prim = g * genGap;
    const cx = isHorizontal ? prim : sec;
    const cy = isHorizontal ? sec : prim;
    return {
      id: p.id,
      person: p,
      generation: g,
      cx,
      cy,
      x: cx - cardW / 2,
      y: cy - cardH / 2,
      width: cardW,
      height: cardH,
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const unionNodes = [];
  const partnerEdges = [];
  const childEdges = [];

  // Track union index per generation to slightly stagger bus lines so parallel family buses never overlap
  const genUnionCounter = new Map();

  for (const u of unions) {
    const n1 = u.partner1_id ? nodeMap.get(u.partner1_id) : null;
    const n2 = u.partner2_id ? nodeMap.get(u.partner2_id) : null;
    if (!n1 && !n2) continue;

    const uGen = (n1 || n2).generation;
    const uIdx = genUnionCounter.get(uGen) || 0;
    genUnionCounter.set(uGen, uIdx + 1);

    let ux;
    let uy;

    if (isHorizontal) {
      // Horizontal Left-to-Right: spouses are stacked vertically; union bracket sits to their right
      if (n1 && n2) {
        const topNode = n1.cy <= n2.cy ? n1 : n2;
        const botNode = n1.cy <= n2.cy ? n2 : n1;
        const rightEdge = Math.max(topNode.x + topNode.width, botNode.x + botNode.width);
        const bracketX = rightEdge + 22;
        ux = bracketX;
        uy = (topNode.cy + botNode.cy) / 2;

        const r = 7;
        const bracketPath = [
          `M ${topNode.x + topNode.width} ${topNode.cy}`,
          `L ${bracketX - r} ${topNode.cy}`,
          `Q ${bracketX} ${topNode.cy} ${bracketX} ${topNode.cy + r}`,
          `L ${bracketX} ${botNode.cy - r}`,
          `Q ${bracketX} ${botNode.cy} ${bracketX - r} ${botNode.cy}`,
          `L ${botNode.x + botNode.width} ${botNode.cy}`,
        ].join(' ');

        partnerEdges.push({
          id: `pe-${u.id}`,
          unionId: u.id,
          partner1Id: topNode.id,
          partner2Id: botNode.id,
          path: bracketPath,
          ux,
          uy,
        });
      } else {
        const single = n1 || n2;
        ux = single.x + single.width;
        uy = single.cy;
      }

      unionNodes.push({
        id: u.id,
        union: u,
        x: ux,
        y: uy,
        isCouple: Boolean(n1 && n2),
      });

      const uChildren = childRelations.filter((cr) => cr.union_id === u.id);
      for (const cr of uChildren) {
        const childNode = nodeMap.get(cr.child_id);
        if (!childNode) continue;

        const startX = ux;
        const startY = uy;
        const endX = childNode.x;
        const endY = childNode.cy;
        const stagger = ((uIdx % 3) - 1) * 10;
        const busX = startX + (endX - startX) * 0.52 + stagger;

        childEdges.push({
          id: `ce-${u.id}-${cr.child_id}`,
          unionId: u.id,
          childId: cr.child_id,
          relationType: cr.relation_type,
          startX,
          startY,
          endX,
          endY,
          path: buildHorizontalOrthoPath(startX, startY, endX, endY, busX),
        });
      }
    } else {
      // Vertical Top-to-Bottom: spouses sit side-by-side horizontally
      if (n1 && n2) {
        const leftNode = n1.cx <= n2.cx ? n1 : n2;
        const rightNode = n1.cx <= n2.cx ? n2 : n1;
        ux = (leftNode.cx + rightNode.cx) / 2;
        uy = (leftNode.cy + rightNode.cy) / 2;
        partnerEdges.push({
          id: `pe-${u.id}`,
          unionId: u.id,
          partner1Id: leftNode.id,
          partner2Id: rightNode.id,
          path: `M ${leftNode.cx + cardW / 2} ${leftNode.cy} L ${rightNode.cx - cardW / 2} ${rightNode.cy}`,
          ux,
          uy,
        });
      } else {
        const single = n1 || n2;
        ux = single.cx;
        uy = single.y + single.height;
      }

      unionNodes.push({
        id: u.id,
        union: u,
        x: ux,
        y: uy,
        isCouple: Boolean(n1 && n2),
      });

      const uChildren = childRelations.filter((cr) => cr.union_id === u.id);
      for (const cr of uChildren) {
        const childNode = nodeMap.get(cr.child_id);
        if (!childNode) continue;

        const startX = ux;
        const startY = uy;
        const endX = childNode.cx;
        const endY = childNode.y;
        const stagger = ((uIdx % 3) - 1) * 8;
        const busY = startY + (endY - startY) * 0.52 + stagger;

        childEdges.push({
          id: `ce-${u.id}-${cr.child_id}`,
          unionId: u.id,
          childId: cr.child_id,
          relationType: cr.relation_type,
          startX,
          startY,
          endX,
          endY,
          path: buildVerticalOrthoPath(startX, startY, endX, endY, busY),
        });
      }
    }
  }

  // 4. Compute bounds and generation headers
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  }

  const generationBands = [];
  for (let g = 0; g <= maxGen; g++) {
    const rowNodes = nodes.filter((n) => n.generation === g);
    const years = rowNodes
      .map((n) => n.person.birth_year)
      .filter((y) => typeof y === 'number');
    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;
    generationBands.push({
      generation: g,
      label: `Поколение ${g + 1}`,
      yearRange: minYear
        ? minYear === maxYear
          ? `${minYear} г.`
          : `${minYear}–${maxYear} гг.`
        : '',
      x: isHorizontal ? g * genGap - cardW / 2 : minX,
      y: isHorizontal ? minY - 46 : g * genGap - cardH / 2 - 30,
      count: rowNodes.length,
    });
  }

  const pad = 140;
  return {
    orientation,
    nodes,
    unionNodes,
    partnerEdges,
    childEdges,
    generationBands,
    bounds: {
      minX: minX - pad,
      maxX: maxX + pad,
      minY: minY - pad,
      maxY: maxY + pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    },
  };
}
