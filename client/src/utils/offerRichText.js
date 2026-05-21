/** Dozwolone tagi w nazwie pozycji oferty */
const ALLOWED_TAGS = new Set(['B', 'I', 'BR']);

export function sanitizeOfferItemHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      return Array.from(node.childNodes).map(walk).join('');
    }
    const inner = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'BR') return '<br>';
    return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
  };
  return Array.from(div.childNodes).map(walk).join('').trim();
}

export function plainTextFromHtml(html) {
  return sanitizeOfferItemHtml(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}
