import { describe, expect, it } from 'vitest';
import { generatePairwise, assertPairwiseComplete } from './support/pairwise.js';

describe('générateur pairwise', () => {
  const factors = {
    titre: ['vide', 'valide', 'trop-long'],
    date: ['absente', 'valide', 'invalide'],
    action: ['ajout', 'modification', 'cochage'],
  };

  it('couvre chaque paire de valeurs de façon déterministe', () => {
    const first = generatePairwise(factors);
    expect(first).toEqual(generatePairwise(factors));
    expect(() => assertPairwiseComplete(first, factors)).not.toThrow();
  });

  it('refuse un jeu de cas incomplet', () => {
    expect(() => assertPairwiseComplete([{ titre: 'vide', date: 'absente', action: 'ajout' }], factors))
      .toThrow(/incomplet/i);
  });

  it('refuse un facteur vide ou une configuration incomplète', () => {
    expect(() => generatePairwise({ titre: ['ok'], date: [] })).toThrow();
    expect(() => generatePairwise({ titre: ['ok'] })).toThrow();
  });
  it('couvre correctement davantage de facteurs pour les oracles métier', () => {
    const extended = {
      oracle: ['reflexif', 'homothétie', 'métamorphique', 'mutant'],
      forme: ['uneTerminée', 'majoritéTerminée', 'toutesTerminées'],
      multiplicateur: [2, 3],
      ordre: ['normal', 'inversé'],
      déplacement: ['oui', 'non'],
    };
    expect(() => assertPairwiseComplete(generatePairwise(extended), extended)).not.toThrow();
  });
});
