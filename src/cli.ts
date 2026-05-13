#!/usr/bin/env node
/**
 * mcp-resource-subscriber CLI entry point.
 * Full implementation is tracked in GitHub Issues.
 *
 * Current programmatic usage:
 *   npm run probe:subscribe -- --url <server-url>
 */

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('mcp-resource-subscriber');
  console.log('');
  console.log('Usage: mcp-resource-subscriber --url <server-url> [--uri <resource-uri>]');
  console.log('');
  console.log('Status: CLI implementation in progress.');
  console.log('Current workaround: npm run probe:subscribe -- --url <server-url>');
  process.exit(0);
}

console.error('mcp-resource-subscriber: CLI implementation is in progress.');
console.error('Current workaround: npm run probe:subscribe -- --url <server-url>');
process.exit(1);
