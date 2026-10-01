// remark-math recognizes dollar delimiters; many editors also emit TeX delimiters.
// Normalize those before Markdown parsing so CommonMark does not consume the backslashes.
export function normalizeMathDelimiters(source: string) {
  let output = '';
  let index = 0;
  let lineStart = true;
  let inlineTicks = 0;
  let fenceMarker = '';
  let fenceLength = 0;

  while (index < source.length) {
    if (lineStart && !inlineTicks) {
      const nextLine = source.indexOf('\n', index);
      const lineEnd = nextLine === -1 ? source.length : nextLine;
      const line = source.slice(index, lineEnd);
      const matchLine = line.endsWith('\r') ? line.slice(0, -1) : line;
      const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(matchLine);
      if (fenceMarker || fence || /^( {4}|\t)/.test(matchLine)) {
        output += line;
        if (nextLine !== -1) output += '\n';
        index = nextLine === -1 ? source.length : nextLine + 1;
        if (fenceMarker) {
          if (fence?.[1][0] === fenceMarker && fence[1].length >= fenceLength && /^[ \t]*$/.test(fence[2])) {
            fenceMarker = '';
          }
        } else if (fence) {
          fenceMarker = fence[1][0];
          fenceLength = fence[1].length;
        }
        continue;
      }
    }

    const character = source[index];
    if (character === '\n') {
      output += character;
      index++;
      lineStart = true;
      continue;
    }
    lineStart = false;

    if (character === '`') {
      let count = 1;
      while (source[index + count] === '`') count++;
      if (!inlineTicks) inlineTicks = count;
      else if (inlineTicks === count) inlineTicks = 0;
      output += '`'.repeat(count);
      index += count;
      continue;
    }
    if (inlineTicks) {
      output += character;
      index++;
      continue;
    }

    if (character === '\\' && source[index + 1] === '\\') {
      output += '\\\\';
      index += 2;
      continue;
    }
    if (character === '\\' && (source[index + 1] === '(' || source[index + 1] === '[')) {
      const inline = source[index + 1] === '(';
      const closing = inline ? ')' : ']';
      let end = index + 2;
      while (end < source.length) {
        if (inline && source[end] === '\n') break;
        if (source[end] === '\\' && source[end + 1] === closing && source[end - 1] !== '\\') break;
        end++;
      }
      if (end < source.length && source[end] === '\\' && source[end + 1] === closing) {
        const formula = source.slice(index + 2, end);
        if (formula.trim()) {
          output += inline ? `$${formula}$` : `\n\n$$\n${formula.trim()}\n$$\n\n`;
          index = end + 2;
          continue;
        }
      }
    }

    output += character;
    index++;
  }

  return output;
}
