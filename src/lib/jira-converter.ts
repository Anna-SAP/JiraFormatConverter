export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/\u00A0/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'style' || tagName === 'script' || tagName === 'meta') {
      return '';
    }

    if (tagName === 'tr') {
      const parentTable = el.closest('table');
      const rows = Array.from(parentTable?.querySelectorAll('tr') || []);
      const rowIndex = rows.indexOf(el as HTMLTableRowElement);
      const isHeaderRow = el.querySelector('th') !== null || rowIndex === 0;
      
      const cellsText = Array.from(el.children).map(cell => {
        let cellText = walk(cell).trim();
        cellText = cellText.replace(/\|/g, '\\|');
        cellText = cellText.replace(/\n/g, ' ');
        return cellText;
      });
      
      let rowStr = `| ${cellsText.join(' | ')} |\n`;
      if (isHeaderRow) {
        const separator = cellsText.map(() => '---').join(' | ');
        rowStr += `| ${separator} |\n`;
      }
      return rowStr;
    }

    let childrenText = Array.from(el.childNodes).map(walk).join('');
    
    switch (tagName) {
      case 'b':
      case 'strong':
        return `**${childrenText}**`;
      case 'i':
      case 'em':
        return `*${childrenText}*`;
      case 'u':
        return `<u>${childrenText}</u>`;
      case 's':
      case 'strike':
      case 'del':
        return `~~${childrenText}~~`;
      case 'a':
        const href = (el as HTMLAnchorElement).href;
        if (href && href !== childrenText) {
          return `[${childrenText}](${href})`;
        }
        return `[${childrenText}]`;
      case 'p':
      case 'div':
        return `${childrenText}\n`;
      case 'br':
        return `\n`;
      case 'h1': return `# ${childrenText}\n`;
      case 'h2': return `## ${childrenText}\n`;
      case 'h3': return `### ${childrenText}\n`;
      case 'h4': return `#### ${childrenText}\n`;
      case 'h5': return `##### ${childrenText}\n`;
      case 'h6': return `###### ${childrenText}\n`;
      case 'ul':
      case 'ol':
        return `${childrenText}\n`;
      case 'li':
        const parent = el.parentElement;
        const bullet = parent?.tagName.toLowerCase() === 'ol' ? '1.' : '-';
        return `${bullet} ${childrenText}\n`;
      case 'table':
      case 'tbody':
      case 'thead':
        return `${childrenText}\n`;
      case 'th':
      case 'td':
        return childrenText;
      case 'code':
        return `\`${childrenText}\``;
      case 'pre':
        return `\`\`\`\n${childrenText}\n\`\`\`\n`;
      default:
        return childrenText;
    }
  }

  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}

export function convertToJira(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;
  const placeholders: { type: string; lang?: string; code: string }[] = [];

  // 1. Extract code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${placeholders.length}__`;
    placeholders.push({
      type: 'block',
      lang: lang,
      code: code
    });
    return placeholder;
  });

  // 2. Extract inline code
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${placeholders.length}__`;
    placeholders.push({
      type: 'inline',
      code: code
    });
    return placeholder;
  });

  // 3. Escape { and }
  text = text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');

  // 4. Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  // 5. Italic (Markdown uses * or _)
  text = text.replace(/(^|[^\w*])\*([^*]+)\*([^\w*]|$)/g, '$1_$2_$3');
  text = text.replace(/(^|[^\w_])_([^_]+)_([^\w_]|$)/g, '$1_$2_$3');

  // 6. Strikethrough
  text = text.replace(/~~([^~]+)~~/g, '-$1-');
  
  // 6.5 Underline
  text = text.replace(/<u>(.*?)<\/u>/g, '+$1+');

  // 7. Headings
  text = text.replace(/^###### (.*$)/gm, 'h6. $1');
  text = text.replace(/^##### (.*$)/gm, 'h5. $1');
  text = text.replace(/^#### (.*$)/gm, 'h4. $1');
  text = text.replace(/^### (.*$)/gm, 'h3. $1');
  text = text.replace(/^## (.*$)/gm, 'h2. $1');
  text = text.replace(/^# (.*$)/gm, 'h1. $1');

  // 8. Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1|$2]');

  // 9. Lists
  text = text.replace(/^(\s*)\d+\.\s+(.*)$/gm, (match, spaces, content) => {
    const level = Math.floor(spaces.length / 2) + 1;
    return '#'.repeat(level) + ' ' + content;
  });
  text = text.replace(/^(\s*)[-*]\s+(.*)$/gm, (match, spaces, content) => {
    const level = Math.floor(spaces.length / 2) + 1;
    return '*'.repeat(level) + ' ' + content;
  });

  // 10. Tables
  const lines = text.split('\n');
  const resultLines: string[] = [];
  let inMarkdownTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Markdown table separator
    if (line.trim().match(/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/)) {
      inMarkdownTable = true;
      if (resultLines.length > 0) {
        let prevLine = resultLines[resultLines.length - 1].trim();
        if (!prevLine.startsWith('|')) prevLine = '|' + prevLine;
        if (!prevLine.endsWith('|')) prevLine = prevLine + '|';
        resultLines[resultLines.length - 1] = prevLine.replace(/\|/g, '||');
      }
      continue;
    }

    if (inMarkdownTable) {
      if (line.trim() === '' || !line.includes('|')) {
        inMarkdownTable = false;
      } else {
        let formattedLine = line.trim();
        if (!formattedLine.startsWith('|')) formattedLine = '|' + formattedLine;
        if (!formattedLine.endsWith('|')) formattedLine = formattedLine + '|';
        resultLines.push(formattedLine);
        continue;
      }
    }

    // TSV table
    const trimmedLine = line.trim();
    if (trimmedLine.includes('\t')) {
      const cells = trimmedLine.split('\t').map(c => c.trim());
      const prevLineTrimmed = i > 0 ? lines[i-1].trim() : '';
      const isFirstTsvRow = i === 0 || !prevLineTrimmed.includes('\t');
      if (isFirstTsvRow) {
        resultLines.push('||' + cells.join('||') + '||');
      } else {
        resultLines.push('|' + cells.join('|') + '|');
      }
      continue;
    }

    resultLines.push(line);
  }
  text = resultLines.join('\n');

  // 11. Restore code blocks and inline code
  placeholders.forEach((p, index) => {
    if (p.type === 'block') {
      const lang = p.lang ? `:${p.lang}` : '';
      text = text.replace(`__CODE_BLOCK_${index}__`, `{code${lang}}\n${p.code}{code}`);
    } else {
      text = text.replace(`__INLINE_CODE_${index}__`, `{{${p.code}}}`);
    }
  });

  return text;
}
