/**
 * FlowForge Rule Engine
 * Evaluates conditions: ==, !=, <, >, <=, >=, &&, ||
 * String functions: contains(), startsWith(), endsWith()
 * DEFAULT fallback keyword
 * Loop detection via configurable MAX_LOOP_ITERATIONS
 */
const MAX = parseInt(process.env.MAX_LOOP_ITERATIONS) || 10;

function evaluate(condition, data) {
  if (!condition || condition.trim().toUpperCase() === 'DEFAULT') return true;
  try {
    let expr = condition;
    // String functions
    expr = expr.replace(/contains\((\w+),\s*['"]([^'"]+)['"]\)/g,
      (_, f, v) => `"${String(data[f]||'')}".toLowerCase().includes("${v.toLowerCase()}")`);
    expr = expr.replace(/startsWith\((\w+),\s*['"]([^'"]+)['"]\)/g,
      (_, f, v) => `"${String(data[f]||'')}".toLowerCase().startsWith("${v.toLowerCase()}")`);
    expr = expr.replace(/endsWith\((\w+),\s*['"]([^'"]+)['"]\)/g,
      (_, f, v) => `"${String(data[f]||'')}".toLowerCase().endsWith("${v.toLowerCase()}")`);
    // Field substitution
    expr = expr.replace(/\b([a-zA-Z_]\w*)\b(?!\s*\()/g, m => {
      if (['true','false','null','undefined'].includes(m)) return m;
      if (Object.prototype.hasOwnProperty.call(data, m)) {
        const v = data[m];
        return typeof v === 'string' ? `"${v}"` : String(v);
      }
      return m;
    });
    // eslint-disable-next-line no-new-func
    return Boolean(new Function('return ' + expr)());
  } catch (e) {
    throw new Error(`Rule eval error: ${e.message} | "${condition}"`);
  }
}

function findMatch(rules, data) {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluations = [];
  let matched = null;
  for (const rule of sorted) {
    let result = false, error = null;
    try { result = evaluate(rule.condition, data); }
    catch (e) { error = e.message; }
    evaluations.push({
      condition: rule.condition,
      result,
      is_default: rule.is_default || rule.condition.trim().toUpperCase() === 'DEFAULT',
      error
    });
    if (result && !matched) matched = rule;
  }
  return { matched, evaluations };
}

module.exports = { evaluate, findMatch, MAX };
