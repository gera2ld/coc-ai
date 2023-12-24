export function safeHtml(html: string) {
  return html.replace(
    /[&<]/g,
    (m) =>
      ({
        '<': '&lt;',
        '&': '&amp;',
      })[m] || '',
  );
}

const helpers = {
  escape: safeHtml,
  json_encode: JSON.stringify,
};

export function fillTemplate(tpl: string, args: QueryContext) {
  return tpl.replace(/{{([^}]*)}}/g, (_m, g: string) => {
    const [param, ...pipes] = g.split('|>').map((part) => part.trim());
    let result = args[param];
    try {
      for (const pipe of pipes) {
        result = helpers[pipe](result);
      }
    } catch {
      // ignore
    }
    return result;
  });
}
