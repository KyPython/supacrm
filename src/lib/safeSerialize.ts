export function safeSerialize(obj: any): any {
  const seen = new WeakSet<any>();
  function replacer(value: any): any {
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") return value;
    if (t === "function") return `[Function ${value.name || 'fn'}]`;
    // React element objects usually have $$typeof symbol or type/props
    if (typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      // Detect React element
      if (value.$$typeof || value._owner || value.props) return '[ReactElement]';
      if (Array.isArray(value)) return value.map(replacer);
      const out: any = {};
      for (const k of Object.keys(value)) {
        try {
          out[k] = replacer(value[k]);
        } catch (e) {
          out[k] = '[Unserializable]';
        }
      }
      return out;
    }
    return String(value);
  }
  return replacer(obj);
}
