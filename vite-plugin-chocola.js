import fs from 'fs';
import path from 'path';
import { parseChocola } from './core/parser.js';

export function chocolaPlugin() {
  return {
    name: 'vite-plugin-chocola',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.chcl')) return;
      return parseChocola(code, id);
    }
  };
}
