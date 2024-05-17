export * from './handler';
export * from './useDebounce';

export type OverrideCSSOptions = {
  prefix: string;
  styleSheet: CSSStyleSheet;
  selectorsToIgnore: string[];
};

const isNotPrintMedia = (rule: CSSRule): rule is CSSMediaRule =>
  (rule as CSSMediaRule).media?.mediaText !== 'print';

export const findStyleSheetByUrl = (url: string): CSSStyleSheet | undefined =>
  [...document.styleSheets].find(sheet => (sheet.href || '').indexOf(url) > -1);

/**
 * This function scopes a stylesheet matching the given url to the give css selector
 * This function will prefix the cssRules selectorText from CSSOM with the given selector
 *
 * @param prefix : css selector to scope the stylesheet to;
 * @param url : url to find the stylesheet from document
 * @param ignoreList : list of css selectors to ignore prefixing (ex. modal)
 */
export const overrideCssScope = ({
  prefix,
  styleSheet,
  selectorsToIgnore = []
}: OverrideCSSOptions): void => {
  const shouldIgnoreSelectorRule = (selector: string) =>
    selectorsToIgnore.some(cssSelector => selector.indexOf(cssSelector) > -1);

  const processRules = (cssRules: any[] = []) => {
    cssRules.forEach((rule: CSSStyleRule) => {
      rule.selectorText = rule.selectorText
        ? rule.selectorText
            .split(',')
            .map((s: string) =>
              shouldIgnoreSelectorRule(s) ? s : `${prefix} ${s}`
            )
            .join(',')
        : rule.selectorText;

      if (isNotPrintMedia(rule)) {
        processRules(Array.from(rule.cssRules || []));
      }
    });
  };

  processRules(Array.from(styleSheet?.cssRules || []));
};

export const resourceLoader = (() => {
  const _load = (tag: 'script' | 'link') => (
    url: string | null,
    content = ''
  ): Promise<string | null> =>
    new Promise((resolve, reject) => {
      let attr: 'src' | 'href' = 'src';
      const element = document.createElement(
        tag === 'link' && !!content ? 'style' : tag
      );

      element.onload = () => resolve(url);
      element.onerror = () => reject(url);

      // Need to set different attributes depending on tag type
      switch (tag) {
        case 'script':
          element.type = 'text/javascript';
          (element as HTMLScriptElement).defer = true;
          break;
        case 'link':
          element.type = 'text/css';
          (element as HTMLLinkElement).rel = 'stylesheet';
          attr = 'href';
      }

      if (content) {
        element.innerHTML = content;
      } else {
        // Inject into document to kick off loading
        (element as any)[attr] = url;
      }

      document.head.appendChild(element);

      if (content) {
        resolve(url);
      }
    });

  return {
    css: _load('link'),
    js: _load('script')
  };
})();

export const redirect = (url: string, asLink = true): string | void =>
  asLink ? (window.location.href = url) : window.location.replace(url);
