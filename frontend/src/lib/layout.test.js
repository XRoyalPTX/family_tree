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
});
