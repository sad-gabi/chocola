import { renderComponents } from './componentLoader.js';

export async function renderView(viewModule) {
  const view = (await viewModule()).default();
  document.title = view.title;
  let html = view.html;
  html = renderComponents(html);
  document.querySelector('#app').innerHTML = html;
  for (const script of view.scripts || []) await script();
}
