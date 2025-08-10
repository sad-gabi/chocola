import fs from 'fs';
import path from 'path';

export function chocolaPlugin() {
  return {
    name: 'vite-plugin-chocola',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.chcl')) return;

      // Extraer HTML
      const htmlRegex = /html:\s*([\s\S]*)\}\)/m;
      let htmlMatch = code.match(htmlRegex);
      if (!htmlMatch) return;

      let htmlContent = htmlMatch[1];

      // Reemplazar <Component>...</Component>
      htmlContent = htmlContent.replace(
        /<([A-Z][a-zA-Z0-9]*)\s*([^>]*)\/?>/g,
        (_, name, props) => {
          const propsObj = parseProps(props);
          return `\${${name}(${JSON.stringify(propsObj)})}`;
        }
      );

      // Convertir HTML en string template
      const newCode = code.replace(htmlRegex, `html: \`${htmlContent}\` })`);

      return newCode;
    }
  };
}

function parseProps(str) {
  const props = {};
  str.replace(/(\w+)="([^"]*)"/g, (_, k, v) => props[k] = v);
  return props;
}
