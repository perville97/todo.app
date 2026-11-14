const MIN_FACTORS = 2;

function validateFactors(factors) {
  if (!factors || typeof factors !== 'object' || Array.isArray(factors)) {
    throw new TypeError('Les facteurs pairwise doivent être un objet.');
  }
  const entries = Object.entries(factors);
  if (entries.length < MIN_FACTORS) throw new TypeError('Au moins deux facteurs sont requis.');
  for (const [name, values] of entries) {
    if (!name || !Array.isArray(values) || values.length === 0) {
      throw new TypeError(`Facteur invalide ou vide : ${name || '(sans nom)'}`);
    }
    if (new Set(values).size !== values.length) throw new TypeError(`Valeurs dupliquées : ${name}`);
  }
  return entries;
}

const pairKey = (leftName, leftValue, rightName, rightValue) =>
  JSON.stringify([leftName, leftValue, rightName, rightValue]);

export function generatePairwise(factors) {
  const entries = validateFactors(factors);
  const names = entries.map(([name]) => name);
  const rows = [];
  const firstPair = entries.slice(0, 2);
  for (const left of firstPair[0][1]) {
    for (const right of firstPair[1][1]) rows.push({ [firstPair[0][0]]: left, [firstPair[1][0]]: right });
  }
  for (const [name, values] of entries.slice(2)) {
    const uncovered = new Set();
    for (const row of rows) {
      for (const value of values) {
        for (const priorName of names.slice(0, names.indexOf(name))) {
          uncovered.add(pairKey(priorName, row[priorName], name, value));
        }
      }
    }
    const expanded = rows.map((row) => {
      let selected = values[0];
      let score = -1;
      for (const candidate of values) {
        const candidateScore = names.slice(0, names.indexOf(name))
          .filter((priorName) => uncovered.has(pairKey(priorName, row[priorName], name, candidate))).length;
        if (candidateScore > score) { selected = candidate; score = candidateScore; }
      }
      for (const priorName of names.slice(0, names.indexOf(name))) {
        uncovered.delete(pairKey(priorName, row[priorName], name, selected));
      }
      return { ...row, [name]: selected };
    });
    while (uncovered.size) {
      const target = JSON.parse(uncovered.values().next().value);
      const row = Object.fromEntries(names.slice(0, names.indexOf(name)).map((priorName) => [priorName, undefined]));
      row[target[0]] = target[1];
      row[name] = target[3];
      for (const priorName of names.slice(0, names.indexOf(name))) {
        if (row[priorName] === undefined) {
          row[priorName] = entries.find(([factorName]) => factorName === priorName)[1]
            .find((candidate) => uncovered.has(pairKey(priorName, candidate, name, target[3])));
        }
        uncovered.delete(pairKey(priorName, row[priorName], name, target[3]));
      }
      expanded.push(row);
    }
    rows.splice(0, rows.length, ...expanded);
  }
  return rows;
}

export function assertPairwiseComplete(rows, factors) {
  const entries = validateFactors(factors);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Jeu pairwise incomplet : aucun cas.');
  const expected = new Set();
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const [leftName, leftValues] = entries[i];
      const [rightName, rightValues] = entries[j];
      for (const left of leftValues) for (const right of rightValues) expected.add(pairKey(leftName, left, rightName, right));
    }
  }
  const found = new Set();
  for (const row of rows) {
    for (const [name, values] of entries) {
      if (!Object.hasOwn(row, name) || !values.includes(row[name])) throw new Error(`Jeu pairwise incomplet : cas invalide (${name}).`);
    }
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const [leftName] = entries[i]; const [rightName] = entries[j];
        found.add(pairKey(leftName, row[leftName], rightName, row[rightName]));
      }
    }
  }
  if (found.size !== expected.size || [...expected].some((pair) => !found.has(pair))) {
    throw new Error('Jeu pairwise incomplet : des paires de valeurs manquent.');
  }
  return true;
}
