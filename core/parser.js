import fs from 'fs';
import path from 'path';

export function parseChocola(code, id) {
  const htmlRegex = /html:\s*([\s\S]*)\}\)/m;
  let htmlMatch = code.match(htmlRegex);
  if (!htmlMatch) return code;

  let htmlContent = htmlMatch[1];

  // REPLACE COMPONENTS <Component ...>...</Component>
  htmlContent = htmlContent.replace(
    /<([A-Z][a-zA-Z0-9]*)\s*([^>]*)>([\s\S]*?)<\/\1>/g,
    (_, name, props, children) => {
      const propsObj = parseProps(props);
      if (children.trim()) propsObj.children = children.trim();
      return `\${${name}(${JSON.stringify(propsObj)})}`;
    }
  );

  // REPLACE SELF-CLOSING COMPONENTS <Component ... />
  htmlContent = htmlContent.replace(
    /<([A-Z][a-zA-Z0-9]*)\s*([^>]*)\/>/g,
    (_, name, props) => {
      const propsObj = parseProps(props);
      return `\${${name}(${JSON.stringify(propsObj)})}`;
    }
  );

  // CONVERT HTML INTO STRING TEMPLATE
  const newCode = code.replace(htmlRegex, `html: \`${htmlContent}\` })`);
  return newCode;
}

function parseProps(str) {
  const props = {};
  str.replace(/(\w+)="([^"]*)"/g, (_, key, value) => props[key] = value);
  return props;
}
