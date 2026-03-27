/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Copy, ArrowRightLeft, Check, FileText, Code2 } from 'lucide-react';
import { convertToJira, htmlToMarkdown } from './lib/jira-converter';

export default function App() {
  const [htmlInput, setHtmlInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const markdown = htmlToMarkdown(htmlInput);
    setOutput(convertToJira(markdown));
  }, [htmlInput]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setHtmlInput(e.currentTarget.innerHTML);
  };

  return (
    <div className="min-h-screen bg-[#1D2125] flex flex-col font-sans">
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #8C9BAB;
          pointer-events: none;
          display: block;
        }
        /* Basic styling for pasted tables in dark mode */
        [contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1rem;
        }
        [contenteditable] th, [contenteditable] td {
          border: 1px solid #383A3F;
          padding: 8px;
        }
        [contenteditable] th {
          background-color: #2C333A;
        }
      `}</style>
      <header className="bg-[#22272B] border-b border-[#383A3F] px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 text-[#579DFF]">
          <div className="p-2 bg-[#1C2B41] rounded-lg">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#B6C2CF] leading-tight">Jira Format Converter</h1>
            <p className="text-xs text-[#9FADBC]">Rich Text & Markdown to Jira Wiki Markup</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          disabled={!output}
          className="flex items-center gap-2 px-4 py-2 bg-[#0C66E4] text-white rounded hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 h-[calc(100vh-76px)]">
        {/* Input Panel */}
        <div className="flex-1 flex flex-col bg-[#22272B] rounded-lg shadow-sm border border-[#383A3F] overflow-hidden">
          <div className="bg-[#2C333A] px-4 py-3 border-b border-[#383A3F] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#9FADBC]" />
            <span className="font-semibold text-[#B6C2CF] text-sm">Input</span>
            <span className="text-xs text-[#9FADBC] ml-2 font-normal">Paste rich text (Excel/Sheets) or Markdown</span>
          </div>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            data-placeholder="Paste your rich text table from Excel/Google Sheets, or type Markdown here..."
            className="flex-1 p-4 overflow-auto focus:outline-none focus:ring-2 focus:ring-[#579DFF] focus:border-transparent font-sans text-sm text-[#B6C2CF] leading-relaxed"
          />
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col bg-[#22272B] rounded-lg shadow-sm border border-[#383A3F] overflow-hidden">
          <div className="bg-[#2C333A] px-4 py-3 border-b border-[#383A3F] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#9FADBC]" />
              <span className="font-semibold text-[#B6C2CF] text-sm">Jira Wiki Markup</span>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Converted Jira markup will appear here..."
            className="flex-1 p-4 resize-none bg-[#22272B] focus:outline-none font-mono text-sm text-[#B6C2CF] leading-relaxed"
            spellCheck={false}
          />
        </div>
      </main>
    </div>
  );
}
