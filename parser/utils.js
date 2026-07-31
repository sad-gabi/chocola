import { restoreTemplateChars } from "../utils.js";

const compiledCache = new Map();

export function compileExpr(expr, useCtx) {
  expr = restoreTemplateChars(expr);
  const key = useCtx ? `ctx:${expr}` : `raw:${expr}`;
  let fn = compiledCache.get(key);
  if (!fn) {
    fn = useCtx
      ? new Function("ctx", `with(ctx) { return (${expr}); }`)
      : new Function(`"use strict"; return (${expr})`);
    compiledCache.set(key, fn);
  }
  return fn;
}
