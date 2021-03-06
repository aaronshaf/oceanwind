import translate from './translate.js';
import defaultTheme, { globals } from './theme.js';

import merge from './util/merge.js';
import normalize from './util/normalize.js';

import { css } from './vendor/otion.js';

// For server side rendering with client hydration
export { setup, hydrate } from './vendor/otion.js';

// Provide link to file and line number with warnings
const warn = (theme) => (message) => {
  const msg = [message, new Error().stack.split('at ').pop()].join(' ');
  if (theme.strict) throw msg;
  console.warn(msg);
};

export const process = (theme) => (strings, values) => {
  // Normalize rules into an array
  const rules = normalize(strings, values);
  // Keep track of processed rules this rule set
  const seen = {};
  // Go through each rule in the array and translate to css
  const styles = rules.map((rule) => {
    // Warn about any duplicate rule declarations
    if (seen[rule]) warn(theme)(`Duplicate declaration of "${rule}"`);
    // Mark rule as seen
    seen[rule] = true;
    // Split the rule into parts
    rule = rule.split(':');
    // Seperate out directive from variants
    let directive = rule.pop();
    let variants = rule;
    // Lookup translation for directive
    let translation = translate(theme)(directive);
    // Warn if there was no translation for the given directive
    if (!Object.keys(translation)[0] || !Object.values(translation)[0]) {
      warn(theme)(`No translation for "${directive}"`);
    }
    // Apply variants to the translation
    variants.reverse().forEach((variant) => {
      let size = theme.screens[variant];
      if (size) {
        translation = {
          '@media': { [`(min-width: ${size})`]: translation },
        };
      } else translation = { [`:${variant}`]: translation };
    });
    // Return translation with variants applied
    return translation;
  });
  // Deep merge all translations
  return merge(...styles);
};

// Utility for merging a provided theme with the default theme
export const configure = (theme) =>
  merge(defaultTheme(merge(globals, theme)), theme);

// Return process primed with a provided theme
export const themed = (theme = {}) => {
  const processWithTheme = process(configure(theme));
  return (strings, ...values) => css(processWithTheme(strings, values));
};

// Return process primed with the default theme
export default themed();
