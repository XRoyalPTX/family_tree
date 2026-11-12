// Dimensions for Horizontal (Left-to-Right) layout — ideal for families with many children
export const CARD_WIDTH = 224;
export const CARD_HEIGHT = 64;
export const COUPLE_GAP = 14;
export const SIBLING_GAP = 18;
export const CLUSTER_GAP = 48;
export const GENERATION_GAP = 330;

// Dimensions for Vertical (Top-to-Bottom) layout
export const V_CARD_WIDTH = 216;
export const V_CARD_HEIGHT = 72;
export const V_COUPLE_GAP = 36;
export const V_SIBLING_GAP = 22;
export const V_CLUSTER_GAP = 54;
export const V_GENERATION_GAP = 180;

// Distinct, vibrant color palette for each family branch
export const BRANCH_COLORS = [
  '#2563eb', // Royal Blue
  '#059669', // Emerald Green
  '#d97706', // Warm Amber
  '#7c3aed', // Purple Violet
  '#db2777', // Rose Pink
  '#0891b2', // Deep Cyan
  '#ea580c', // Fiery Coral
  '#4f46e5', // Indigo
];

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
 * (x1, y1) -> horizontal to busX -> vertical to y2 -> horizontal to (x2, y2)
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
 * (x1, y1) -> vertical to busY -> horizontal to x2 -> vertical to (x2, y2)
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
  const siblingGap = isHorizontal ? SIBLING_GAP : V_SIBLING_GAP;
  const clusterGap = isHorizontal ? CLUSTER_GAP : V_CLUSTER_GAP;
  const genGap = isHorizontal ? GENERATION_GAP : V_GENERATION_GAP;
  const secSize = isHorizontal ? cardH : cardW;

  const personMap = new Map(persons.map((p) => [p.id, p]));
  const unionMap = new Map(unions.map((u) => [u.id, u]));

  // Build relationships lookups
  const unionChildren = new Map();
  const childParentUnionMap = new Map();
  for (const cr of childRelations) {
    if (!unionMap.has(cr.union_id) || !personMap.has(cr.child_id)) continue;
    childParentUnionMap.set(cr.child_id, cr.union_id);
    if (!unionChildren.has(cr.union_id)) unionChildren.set(cr.union_id, []);
    unionChildren.get(cr.union_id).push(cr.child_id);
  }

  const spouses = [];
  for (const u of unions) {
    if (
      u.partner1_id &&
      u.partner2_id &&
      personMap.has(u.partner1_id) &&
      personMap.has(u.partner2_id)
    ) {
      spouses.push([u.partner1_id, u.partner2_id]);
    }
  }

  // 1. Assign generation numbers: Bidirectional relaxation with Sibling Axiom
  // A fundamental genealogy rule: full siblings belong to the EXACT same generation!
  // And parents must be strictly generation < children!
  const gen = new Map();
  for (const p of persons) {
    gen.set(p.id, 0);
  }

  const maxIter = Math.max(persons.length * 4, 60);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // A. All siblings of the same union must share the exact same generation
    for (const [uid, chList] of unionChildren.entries()) {
      if (!chList.length) continue;
      let maxCh = 0;
      for (const cid of chList) {
        const g = gen.get(cid) ?? 0;
        if (g > maxCh) maxCh = g;
      }
      for (const cid of chList) {
        if ((gen.get(cid) ?? 0) < maxCh) {
          gen.set(cid, maxCh);
          changed = true;
        }
      }
    }

    // B. Spouses in the same union must share the exact same generation
    for (const [s1, s2] of spouses) {
      const g1 = gen.get(s1) ?? 0;
      const g2 = gen.get(s2) ?? 0;
      if (g1 !== g2) {
        const m = Math.max(g1, g2);
        gen.set(s1, m);
        gen.set(s2, m);
        changed = true;
      }
    }

    // C. Child must be at least max(parents) + 1
    for (const [uid, chList] of unionChildren.entries()) {
      const u = unionMap.get(uid);
      if (!u) continue;
      const pGens = [];
      if (u.partner1_id && personMap.has(u.partner1_id)) pGens.push(gen.get(u.partner1_id) ?? 0);
      if (u.partner2_id && personMap.has(u.partner2_id)) pGens.push(gen.get(u.partner2_id) ?? 0);
      if (pGens.length) {
        const minC = Math.max(...pGens) + 1;
        for (const cid of chList) {
          if ((gen.get(cid) ?? 0) < minC) {
            gen.set(cid, minC);
            changed = true;
          }
        }
      }
    }

    // D. Parents must be at least max(children) - 1
    for (const [uid, chList] of unionChildren.entries()) {
      if (!chList.length) continue;
      let chGen = 0;
      for (const cid of chList) {
        const g = gen.get(cid) ?? 0;
        if (g > chGen) chGen = g;
      }
      const u = unionMap.get(uid);
      if (!u) continue;
      for (const pid of [u.partner1_id, u.partner2_id]) {
        if (pid && personMap.has(pid)) {
          const pg = gen.get(pid) ?? 0;
          if (pg < chGen - 1) {
            gen.set(pid, chGen - 1);
            changed = true;
          }
        }
      }
    }

    if (!changed) break;
  }

  // Normalize min generation to 0
  let minGen = Infinity;
  for (const g of gen.values()) {
    if (g < minGen) minGen = g;
  }
  for (const [id, g] of gen.entries()) {
    gen.set(id, g - minGen);
  }

  // 2. Group persons by generation
  const generationsMap = new Map();
  let maxGen = 0;
  for (const p of persons) {
    const g = gen.get(p.id) ?? 0;
    if (g > maxGen) maxGen = g;
    if (!generationsMap.has(g)) generationsMap.set(g, []);
    generationsMap.get(g).push(p);
  }

  // Map storing secondary axis center coordinate (cy for horizontal, cx for vertical)
  const secPos = new Map();
  const parentUnionPos = new Map();

  // Helper to get sort key for age
  function getPersonBirthYear(pid) {
    const p = personMap.get(pid);
    return p && typeof p.birth_year === 'number' ? p.birth_year : 9999;
  }

  // Helper to calculate span for an array of items along secondary axis
  function calcItemsSpan(items) {
    if (!items.length) return 0;
    return items.reduce((acc, it) => acc + it.span, 0) + (items.length - 1) * siblingGap;
  }

  // Build raw item representations per generation
  const genData = [];

  for (let g = 0; g <= maxGen; g++) {
    const rowPersons = generationsMap.get(g) || [];
    const visited = new Set();
    const items = [];

    // Form couple and single items
    for (const p of rowPersons) {
      if (visited.has(p.id)) continue;
      visited.add(p.id);

      let spouse = null;
      let coupleUnion = null;
      for (const u of unions) {
        let candidateSpouseId = null;
        if (u.partner1_id === p.id && u.partner2_id) candidateSpouseId = u.partner2_id;
        else if (u.partner2_id === p.id && u.partner1_id) candidateSpouseId = u.partner1_id;

        if (
          candidateSpouseId &&
          !visited.has(candidateSpouseId) &&
          (gen.get(candidateSpouseId) ?? 0) === g
        ) {
          spouse = personMap.get(candidateSpouseId);
          coupleUnion = u;
          visited.add(candidateSpouseId);
          break;
        }
      }

      if (spouse) {
        let members = [p.id, spouse.id];
        const pParentUnion = childParentUnionMap.get(p.id) || null;
        const sParentUnion = childParentUnionMap.get(spouse.id) || null;
        const isBridge = Boolean(pParentUnion && sParentUnion && pParentUnion !== sParentUnion);
        if (!pParentUnion && sParentUnion) {
          members = [spouse.id, p.id];
        }
        items.push({
          type: 'couple',
          members,
          union: coupleUnion,
          primaryId: members[0],
          parentUnionId: pParentUnion || sParentUnion || null,
          p1ParentUnion: pParentUnion,
          p2ParentUnion: sParentUnion,
          isBridge,
          span: 2 * secSize + coupleGap,
          center: 0,
        });
      } else {
        items.push({
          type: 'single',
          members: [p.id],
          union: null,
          primaryId: p.id,
          parentUnionId: childParentUnionMap.get(p.id) || null,
          isBridge: false,
          span: secSize,
          center: 0,
        });
      }
    }

    genData.push({ g, items });
  }

  // 3. Multi-Pass Positioning: Preserving Parent-Child Order & Resolving Collisions
  function assignPositionsToUnit(unit, startEdge) {
    let cur = startEdge;
    for (const it of unit.items) {
      it.center = cur + it.span / 2;
      cur += it.span + siblingGap;
      if (it.type === 'couple') {
        const p1Pos = it.center - it.span / 2 + secSize / 2;
        const p2Pos = it.center + it.span / 2 - secSize / 2;
        secPos.set(it.members[0], p1Pos);
        secPos.set(it.members[1], p2Pos);
      } else {
        secPos.set(it.members[0], it.center);
      }
    }
    unit.center = (startEdge + cur - siblingGap) / 2;
    return cur - siblingGap;
  }

  function updateUnionPositionsForGen(g) {
    for (const u of unions) {
      const p1 = u.partner1_id ? secPos.get(u.partner1_id) : null;
      const p2 = u.partner2_id ? secPos.get(u.partner2_id) : null;
      if (p1 !== null && p1 !== undefined && p2 !== null && p2 !== undefined) {
        parentUnionPos.set(u.id, (p1 + p2) / 2);
      } else if (p1 !== null && p1 !== undefined) {
        parentUnionPos.set(u.id, p1);
      } else if (p2 !== null && p2 !== undefined) {
        parentUnionPos.set(u.id, p2);
      }
    }
  }

  // Dynamically assemble generation units:
  // - Keeps non-bridge children strictly contiguous and ordered chronologically
  // - Handles bridge couples (e.g. Petr & Zinaida) by placing them at the exact seam
  //   between the two united families, keeping both partners adjacent to their siblings
  function assembleGenerationUnits(g) {
    const { items } = genData[g];
    const normalItems = items.filter((it) => !it.isBridge);
    const bridgeItems = items.filter((it) => it.isBridge);

    const familyUnitsMap = new Map();
    const rootUnits = [];

    for (const it of normalItems) {
      if (it.parentUnionId !== null && it.parentUnionId !== undefined) {
        if (!familyUnitsMap.has(it.parentUnionId)) {
          familyUnitsMap.set(it.parentUnionId, {
            parentUnionId: it.parentUnionId,
            items: [],
            desiredPos: 0,
            span: 0,
            center: 0,
          });
        }
        familyUnitsMap.get(it.parentUnionId).items.push(it);
      } else {
        rootUnits.push({
          parentUnionId: null,
          items: [it],
          desiredPos: 0,
          span: it.span,
          center: 0,
        });
      }
    }

    // Sort items within each family unit chronologically by birth year (oldest first)
    for (const unit of familyUnitsMap.values()) {
      unit.items.sort((a, b) => {
        const ya = getPersonBirthYear(a.primaryId);
        const yb = getPersonBirthYear(b.primaryId);
        if (ya !== yb) return ya - yb;
        const pA = personMap.get(a.primaryId);
        const pB = personMap.get(b.primaryId);
        if (pA?.birth_date && pB?.birth_date && pA.birth_date !== pB.birth_date) {
          return pA.birth_date.localeCompare(pB.birth_date);
        }
        return a.primaryId - b.primaryId;
      });
      unit.span = calcItemsSpan(unit.items);
    }

    // Sort root units chronologically among themselves
    rootUnits.sort((a, b) => {
      const ya = getPersonBirthYear(a.items[0]?.primaryId);
      const yb = getPersonBirthYear(b.items[0]?.primaryId);
      if (ya !== yb) return ya - yb;
      return (a.items[0]?.primaryId || 0) - (b.items[0]?.primaryId || 0);
    });

    // Compute initial desired positions for units
    for (const unit of familyUnitsMap.values()) {
      if (parentUnionPos.has(unit.parentUnionId)) {
        unit.desiredPos = parentUnionPos.get(unit.parentUnionId);
      } else {
        unit.desiredPos = 0;
      }
    }

    // Attach bridge couples to the boundary between the two families
    for (const bIt of bridgeItems) {
      const uA = bIt.p1ParentUnion;
      const uB = bIt.p2ParentUnion;
      let unitA = familyUnitsMap.get(uA);
      let unitB = familyUnitsMap.get(uB);

      if (!unitA) {
        unitA = {
          parentUnionId: uA,
          items: [],
          desiredPos: parentUnionPos.get(uA) || 0,
          span: 0,
          center: 0,
        };
        familyUnitsMap.set(uA, unitA);
      }
      if (!unitB) {
        unitB = {
          parentUnionId: uB,
          items: [],
          desiredPos: parentUnionPos.get(uB) || 0,
          span: 0,
          center: 0,
        };
        familyUnitsMap.set(uB, unitB);
      }

      const posA = unitA.desiredPos;
      const posB = unitB.desiredPos;

      if (posA <= posB) {
        // unitA precedes unitB. Bridge couple attaches to the end of unitA.
        // Partner belonging to uA is first (facing unitA siblings), partner belonging to uB is second (facing unitB siblings).
        const childA = childParentUnionMap.get(bIt.members[0]) === uA ? bIt.members[0] : bIt.members[1];
        const childB = childParentUnionMap.get(bIt.members[0]) === uB ? bIt.members[0] : bIt.members[1];
        bIt.members = [childA, childB];
        bIt.primaryId = childA;
        unitA.items.push(bIt);
        unitA.span = calcItemsSpan(unitA.items);
      } else {
        // unitB precedes unitA. Bridge couple attaches to the end of unitB.
        // Partner belonging to uB is first (facing unitB siblings), partner belonging to uA is second (facing unitA siblings).
        const childB = childParentUnionMap.get(bIt.members[0]) === uB ? bIt.members[0] : bIt.members[1];
        const childA = childParentUnionMap.get(bIt.members[0]) === uA ? bIt.members[0] : bIt.members[1];
        bIt.members = [childB, childA];
        bIt.primaryId = childB;
        unitB.items.push(bIt);
        unitB.span = calcItemsSpan(unitB.items);
      }
    }

    // Bridge pairing: keep the two united families strictly adjacent in sorting
    for (const bIt of bridgeItems) {
      const uA = bIt.p1ParentUnion;
      const uB = bIt.p2ParentUnion;
      const unitA = familyUnitsMap.get(uA);
      const unitB = familyUnitsMap.get(uB);
      if (unitA && unitB) {
        const avg = (unitA.desiredPos + unitB.desiredPos) / 2;
        if (unitA.desiredPos <= unitB.desiredPos) {
          unitA.desiredPos = avg - 0.01;
          unitB.desiredPos = avg + 0.01;
        } else {
          unitB.desiredPos = avg - 0.01;
          unitA.desiredPos = avg + 0.01;
        }
      }
    }

    const familyUnits = [...familyUnitsMap.values()];

    // Roots: assign sequential compact desired positions if no parent
    let rootOffset = 0;
    for (const ru of rootUnits) {
      ru.desiredPos = rootOffset;
      rootOffset += ru.span + clusterGap;
    }

    return [...familyUnits, ...rootUnits];
  }

  // Pass 1: Root to leaves (align children near parents)
  for (let g = 0; g <= maxGen; g++) {
    const units = assembleGenerationUnits(g);
    units.sort((a, b) => a.desiredPos - b.desiredPos);

    let cursor = 0;
    for (const unit of units) {
      const hasParent = unit.parentUnionId !== null && parentUnionPos.has(unit.parentUnionId);
      const startEdge = Math.max(cursor, hasParent ? unit.desiredPos - unit.span / 2 : cursor);
      const endEdge = assignPositionsToUnit(unit, startEdge);
      cursor = endEdge + clusterGap;
    }

    updateUnionPositionsForGen(g);
  }

  // Pass 2: Leaves to root (center parents over children)
  for (let g = maxGen - 1; g >= 0; g--) {
    const units = assembleGenerationUnits(g);

    for (const unit of units) {
      const childCenters = [];
      for (const it of unit.items) {
        const uId = it.union?.id;
        if (uId && unionChildren.has(uId)) {
          const chList = unionChildren.get(uId);
          const chPositions = chList.map((cid) => secPos.get(cid)).filter((pos) => pos !== undefined);
          if (chPositions.length) {
            const minC = Math.min(...chPositions);
            const maxC = Math.max(...chPositions);
            childCenters.push((minC + maxC) / 2);
          }
        }
      }
      if (childCenters.length) {
        unit.desiredPos = childCenters.reduce((a, b) => a + b, 0) / childCenters.length;
      } else {
        unit.desiredPos = unit.center;
      }
    }

    units.sort((a, b) => a.desiredPos - b.desiredPos);

    let cursor = 0;
    for (const unit of units) {
      const startEdge = Math.max(cursor, unit.desiredPos - unit.span / 2);
      const endEdge = assignPositionsToUnit(unit, startEdge);
      cursor = endEdge + clusterGap;
    }

    updateUnionPositionsForGen(g);
  }

  // Pass 3: Final top-down settling to align children beneath re-centered parents
  for (let g = 1; g <= maxGen; g++) {
    const units = assembleGenerationUnits(g);

    for (const unit of units) {
      if (unit.parentUnionId !== null && parentUnionPos.has(unit.parentUnionId)) {
        unit.desiredPos = parentUnionPos.get(unit.parentUnionId);
      } else {
        unit.desiredPos = unit.center;
      }
    }

    units.sort((a, b) => a.desiredPos - b.desiredPos);

    let cursor = 0;
    for (const unit of units) {
      const startEdge = Math.max(cursor, unit.desiredPos - unit.span / 2);
      const endEdge = assignPositionsToUnit(unit, startEdge);
      cursor = endEdge + clusterGap;
    }

    updateUnionPositionsForGen(g);
  }

  // 4. Build visual nodes
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

  const genUnionCounter = new Map();

  for (let uIdx = 0; uIdx < unions.length; uIdx++) {
    const u = unions[uIdx];
    const n1 = u.partner1_id ? nodeMap.get(u.partner1_id) : null;
    const n2 = u.partner2_id ? nodeMap.get(u.partner2_id) : null;
    if (!n1 && !n2) continue;

    const uGen = (n1 || n2).generation;
    const uCount = genUnionCounter.get(uGen) || 0;
    genUnionCounter.set(uGen, uCount + 1);

    // Assign family branch color
    const branchColor = BRANCH_COLORS[uIdx % BRANCH_COLORS.length];

    let ux;
    let uy;

    if (isHorizontal) {
      if (n1 && n2) {
        const topNode = n1.cy <= n2.cy ? n1 : n2;
        const botNode = n1.cy <= n2.cy ? n2 : n1;
        const rightEdge = Math.max(topNode.x + topNode.width, botNode.x + botNode.width);
        const bracketX = rightEdge + 20;
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
          color: branchColor,
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
        color: branchColor,
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
        // Stagger busX slightly per family to guarantee separation
        const stagger = (uCount % 3) * 16;
        const busX = startX + 32 + stagger;

        childEdges.push({
          id: `ce-${u.id}-${cr.child_id}`,
          unionId: u.id,
          childId: cr.child_id,
          relationType: cr.relation_type,
          color: branchColor,
          startX,
          startY,
          endX,
          endY,
          path: buildHorizontalOrthoPath(startX, startY, endX, endY, busX),
        });
      }
    } else {
      // Vertical Top-to-Bottom mode
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
          color: branchColor,
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
        color: branchColor,
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
        const stagger = (uCount % 3) * 14;
        const busY = startY + 28 + stagger;

        childEdges.push({
          id: `ce-${u.id}-${cr.child_id}`,
          unionId: u.id,
          childId: cr.child_id,
          relationType: cr.relation_type,
          color: branchColor,
          startX,
          startY,
          endX,
          endY,
          path: buildVerticalOrthoPath(startX, startY, endX, endY, busY),
        });
      }
    }
  }

  // 5. Compute bounds and generation headers
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
