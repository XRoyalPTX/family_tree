import { describe, it, expect } from 'vitest';
import {
  formatLifespan,
  formatFullName,
  getPersonRelatives,
  getLineageSet,
  computeTreeLayout,
} from './layout.js';

describe('Family Tree Layout & Kinship Engine', () => {
  const samplePersons = [
    { id: 1, first_name: 'Николай', last_name: 'Морозов', gender: 'male', birth_year: 1920, death_year: 1995, is_alive: false },
    { id: 2, first_name: 'Анна', last_name: 'Морозова', maiden_name: 'Волкова', gender: 'female', birth_year: 1923, death_year: 2001, is_alive: false },
    { id: 3, first_name: 'Андрей', last_name: 'Морозов', gender: 'male', birth_year: 1950, is_alive: true },
    { id: 4, first_name: 'Ольга', last_name: 'Морозова', gender: 'female', birth_year: 1954, is_alive: true },
  ];

  const sampleUnions = [
    { id: 10, partner1_id: 1, partner2_id: 2, union_type: 'married', marriage_year: 1945 },
  ];

  const sampleChildRelations = [
    { id: 100, union_id: 10, child_id: 3, relation_type: 'biological' },
    { id: 101, union_id: 10, child_id: 4, relation_type: 'biological' },
  ];

  it('formats lifespan and full name accurately', () => {
    expect(formatLifespan(samplePersons[0])).toBe('1920 — 1995');
    expect(formatLifespan(samplePersons[2])).toBe('1950 — н.в.');
    expect(formatFullName(samplePersons[1])).toBe('Морозова (Волкова) Анна');
  });

  it('computes relatives for a child and parent', () => {
    const childRels = getPersonRelatives(3, samplePersons, sampleUnions, sampleChildRelations);
    expect(childRels.parents).toHaveLength(2);
    expect(childRels.siblings).toHaveLength(1);
    expect(childRels.siblings[0].id).toBe(4);

    const parentRels = getPersonRelatives(1, samplePersons, sampleUnions, sampleChildRelations);
    expect(parentRels.children).toHaveLength(2);
    expect(parentRels.unionsWithPartners[0].partner.id).toBe(2);
  });

  it('computes non-overlapping layout coordinates and generations in horizontal and vertical modes', () => {
    const hLayout = computeTreeLayout(samplePersons, sampleUnions, sampleChildRelations, 'horizontal');
    expect(hLayout.nodes).toHaveLength(4);
    expect(hLayout.unionNodes).toHaveLength(1);
    expect(hLayout.childEdges).toHaveLength(2);

    const hn1 = hLayout.nodes.find((n) => n.id === 1);
    const hn2 = hLayout.nodes.find((n) => n.id === 2);
    const hn3 = hLayout.nodes.find((n) => n.id === 3);
    const hn4 = hLayout.nodes.find((n) => n.id === 4);

    // Parents share generation 0 (left column), children share generation 1 (right column)
    expect(hn1.generation).toBe(0);
    expect(hn2.generation).toBe(0);
    expect(hn3.generation).toBe(1);
    expect(hn4.generation).toBe(1);
    expect(hn3.cx).toBeGreaterThan(hn1.cx);

    // Ensure cards in the same generation column do not overlap vertically
    expect(Math.abs(hn1.cy - hn2.cy)).toBeGreaterThanOrEqual(hn1.height);
    expect(Math.abs(hn3.cy - hn4.cy)).toBeGreaterThanOrEqual(hn3.height);

    // Also verify vertical mode
    const vLayout = computeTreeLayout(samplePersons, sampleUnions, sampleChildRelations, 'vertical');
    const vn1 = vLayout.nodes.find((n) => n.id === 1);
    const vn2 = vLayout.nodes.find((n) => n.id === 2);
    expect(Math.abs(vn1.cx - vn2.cx)).toBeGreaterThanOrEqual(vn1.width);
  });

  it('computes lineage set for highlighting ancestors and descendants', () => {
    const lineage = getLineageSet(3, samplePersons, sampleUnions, sampleChildRelations);
    expect(lineage.ancestorIds.has(1)).toBe(true);
    expect(lineage.ancestorIds.has(2)).toBe(true);
    expect(lineage.activeUnionIds.has(10)).toBe(true);
  });

  it('keeps sibling groups contiguous, sorted by age, and assigns generations correctly when ancestor is added', () => {
    // Exact user scenario:
    // Generation 1: Munkoyev (49)
    // Generation 2: Gennadiy (22) & Mariya (23) (paternal grandparents), Bulat (34) & Mydygma (35) (maternal grandparents)
    // Generation 3: Petr (16) & Zinaida (21), Vladimir (33) & Natalya (40), Dorzho (36), Elena (37)
    // Generation 4: Kids of Petr & Zinaida: Vladislav (2004), Nomina (2004), Aryana (2010), Aynur (2013), Inna (2015)
    //               Kids of Vladimir: Erdeni (2008), Erdem (no year), Ayur (no year)
    const testPersons = [
      { id: 49, first_name: 'Петр', last_name: 'Мункоев', gender: 'male' },
      { id: 22, first_name: 'Геннадий', last_name: 'Архинчеев', gender: 'male', birth_year: 1952 },
      { id: 23, first_name: 'Мария', last_name: 'Архинчеева', gender: 'female', birth_year: 1951 },
      { id: 34, first_name: 'Булат', last_name: 'Цыдыпов', gender: 'male', birth_year: 1946 },
      { id: 35, first_name: 'Мыдыгма', last_name: 'Цыдыпова', gender: 'female', birth_year: 1947 },
      { id: 16, first_name: 'Петр', last_name: 'Архинчеев', gender: 'male', birth_year: 1977 },
      { id: 21, first_name: 'Зинаида', last_name: 'Архинчеева', gender: 'female', birth_year: 1981 },
      { id: 33, first_name: 'Владимир', last_name: 'Архинчеев', gender: 'male', birth_year: 1983 },
      { id: 40, first_name: 'Наталья', last_name: 'Архинчеева', gender: 'female' },
      { id: 36, first_name: 'Доржо', last_name: 'Цыдыпов', gender: 'male' },
      // Children of Vladimir (Union 11)
      { id: 41, first_name: 'Эрдэни', last_name: 'Архинчеев', gender: 'male', birth_year: 2008 },
      { id: 42, first_name: 'Эрдэм', last_name: 'Архинчеев', gender: 'male' },
      { id: 43, first_name: 'Аюр', last_name: 'Архинчеев', gender: 'male' },
      // Children of Petr (Union 6)
      { id: 15, first_name: 'Владислав', last_name: 'Архинчеев', gender: 'male', birth_year: 2004 },
      { id: 20, first_name: 'Номина', last_name: 'Цыдыпова', gender: 'female', birth_year: 2004 },
      { id: 17, first_name: 'Арьяна', last_name: 'Архинчеева', gender: 'female', birth_year: 2010 },
      { id: 18, first_name: 'Айнур', last_name: 'Архинчеев', gender: 'male', birth_year: 2013 },
      { id: 19, first_name: 'Инна', last_name: 'Архинчеева', gender: 'female', birth_year: 2015 },
    ];

    const testUnions = [
      { id: 13, partner1_id: 49, partner2_id: null }, // Munkoyev
      { id: 7, partner1_id: 22, partner2_id: 23 }, // Gennadiy & Mariya
      { id: 10, partner1_id: 34, partner2_id: 35 }, // Bulat & Mydygma
      { id: 6, partner1_id: 16, partner2_id: 21 }, // Petr & Zinaida
      { id: 11, partner1_id: 33, partner2_id: 40 }, // Vladimir & Natalya
    ];

    const testChildRelations = [
      { id: 1, union_id: 13, child_id: 22 }, // Gennadiy child of Munkoyev
      { id: 2, union_id: 7, child_id: 16 },  // Petr child of Gennadiy
      { id: 3, union_id: 7, child_id: 33 },  // Vladimir child of Gennadiy
      { id: 4, union_id: 10, child_id: 21 }, // Zinaida child of Bulat & Mydygma
      { id: 5, union_id: 10, child_id: 36 }, // Dorzho child of Bulat & Mydygma
      // Petr's kids
      { id: 6, union_id: 6, child_id: 15 },
      { id: 7, union_id: 6, child_id: 20 },
      { id: 8, union_id: 6, child_id: 17 },
      { id: 9, union_id: 6, child_id: 18 },
      { id: 10, union_id: 6, child_id: 19 },
      // Vladimir's kids
      { id: 11, union_id: 11, child_id: 41 },
      { id: 12, union_id: 11, child_id: 42 },
      { id: 13, union_id: 11, child_id: 43 },
    ];

    const layout = computeTreeLayout(testPersons, testUnions, testChildRelations, 'horizontal');
    const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));

    // 1. Generation checks:
    // Munkoyev is Gen 0
    expect(nodeMap.get(49).generation).toBe(0);
    // Gennadiy & Mariya, Bulat & Mydygma must be Gen 1
    expect(nodeMap.get(22).generation).toBe(1);
    expect(nodeMap.get(23).generation).toBe(1);
    expect(nodeMap.get(34).generation).toBe(1);
    expect(nodeMap.get(35).generation).toBe(1);
    // Their children must be Gen 2 (strictly greater than parents!)
    expect(nodeMap.get(16).generation).toBe(2);
    expect(nodeMap.get(21).generation).toBe(2);
    expect(nodeMap.get(33).generation).toBe(2);
    expect(nodeMap.get(36).generation).toBe(2);
    // Grandchildren must be Gen 3
    expect(nodeMap.get(15).generation).toBe(3);
    expect(nodeMap.get(41).generation).toBe(3);

    // 2. Sibling Contiguity check in Gen 4:
    // Petr's children ids: 15, 20, 17, 18, 19
    // Vladimir's children ids: 41, 42, 43
    // All of Petr's children MUST have Y values either ALL smaller or ALL larger than Vladimir's children!
    const petrKidsY = [15, 20, 17, 18, 19].map((id) => nodeMap.get(id).cy);
    const vladKidsY = [41, 42, 43].map((id) => nodeMap.get(id).cy);

    const minPetrY = Math.min(...petrKidsY);
    const maxPetrY = Math.max(...petrKidsY);
    const minVladY = Math.min(...vladKidsY);
    const maxVladY = Math.max(...vladKidsY);

    // They must be disjoint intervals (no interleaving!)
    const noInterleaving = maxPetrY < minVladY || maxVladY < minPetrY;
    expect(noInterleaving).toBe(true);

    // 3. Chronological order within Petr's children:
    // Vladislav (2004) <= Nomina (2004) < Aryana (2010) < Aynur (2013) < Inna (2015)
    expect(nodeMap.get(15).cy).toBeLessThanOrEqual(nodeMap.get(20).cy);
    expect(nodeMap.get(20).cy).toBeLessThan(nodeMap.get(17).cy);
    expect(nodeMap.get(17).cy).toBeLessThan(nodeMap.get(18).cy);
    expect(nodeMap.get(18).cy).toBeLessThan(nodeMap.get(19).cy);

    // 4. Bridge couple adjacency:
    // Zinaida (21) and Dorzho (36) are siblings and must be visually adjacent!
    // The distance between them must be less than 150px (not thousands of pixels!)
    const zinaidaCy = nodeMap.get(21).cy;
    const dorzhoCy = nodeMap.get(36).cy;
    expect(Math.abs(zinaidaCy - dorzhoCy)).toBeLessThanOrEqual(150);

    // Petr (16) and his brother Vladimir (33) are also adjacent
    const petrCy = nodeMap.get(16).cy;
    const vladimirCy = nodeMap.get(33).cy;
    expect(Math.abs(petrCy - vladimirCy)).toBeLessThanOrEqual(250);
  });
});
