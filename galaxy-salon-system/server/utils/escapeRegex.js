/**
 * Escape a user-supplied string for safe use inside a MongoDB $regex.
 *
 * Without this, an ordinary search term containing regex punctuation throws and the
 * endpoint 500s — e.g. searching a phone number as "+91..." makes "+" a dangling
 * quantifier. It also blocks regex-injection style inputs such as ".*".
 */
const escapeRegex = (input = '') => String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { escapeRegex };
