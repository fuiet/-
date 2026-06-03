const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const termHeader = '\u540d\u8bcd\u89e3\u91ca';
const renaissanceStart = '\u4e00\u3001\u4e50\u6d3e\u4e0e\u4eba\u7269\u7c7b';

const sources = [
  { file: 'medieval.docx', theme: '\u4e2d\u4e16\u7eaa\u97f3\u4e50' },
  { file: 'renaissance.docx', theme: '\u6587\u827a\u590d\u5174\u97f3\u4e50' },
  { file: 'baroque.docx', theme: '\u5df4\u6d1b\u514b\u97f3\u4e50' },
  { file: 'classical.docx', theme: '\u53e4\u5178\u4e3b\u4e49\u97f3\u4e50' },
  { file: 'greco-roman.docx', theme: '\u53e4\u5e0c\u814a\u53e4\u7f57\u9a6c\u97f3\u4e50' }
];

const strongLabels = new Set([
  '\u5b9a\u4e49',
  '\u7279\u5f81',
  '\u529f\u80fd',
  '\u610f\u4e49',
  '\u4f7f\u7528',
  '\u5e94\u7528',
  '\u8d77\u6e90',
  '\u8d21\u732e',
  '\u4ee3\u8868\u4eba\u7269',
  '\u4ee3\u8868\u4f5c',
  '\u8eab\u4efd',
  '\u7ed3\u6784',
  '\u6838\u5fc3\u7279\u5f81',
  '\u98ce\u683c\u7279\u5f81',
  '\u4e3b\u8981\u8d21\u732e',
  '\u97f3\u4e50\u89c2\u70b9',
  '\u5f71\u54cd'
]);

function normalizeText(text) {
  return text
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getTermsSection(text, sourceFile) {
  let start = text.indexOf(termHeader);
  if (start < 0 && sourceFile === 'renaissance.docx') start = text.indexOf(renaissanceStart);
  if (start < 0) return '';
  return text.slice(start);
}

function isTitleLine(line) {
  return /^\s*(?:\uff08\s*\uff09\s*)?\d+\s*[.、]\s*[^：:\n]{1,40}\s*[：:]?\s*$/.test(line);
}

function getTitle(line) {
  return line
    .replace(/^\s*(?:\uff08\s*\uff09\s*)?\d+\s*[.、]\s*/, '')
    .replace(/[：:]\s*$/, '')
    .trim();
}

function parseEntries(section, theme) {
  const lines = section.split('\n').map((line) => line.trim()).filter(Boolean);
  const entries = [];
  let current = null;
  let currentLabel = null;

  for (const line of lines) {
    if (line === termHeader || /^([一二三四五六七八九十]+)、/.test(line) || /^要求/.test(line)) continue;

    if (isTitleLine(line)) {
      if (current && Object.keys(current.fields).length) entries.push(current);
      current = { title: getTitle(line), theme, fields: {} };
      currentLabel = null;
      continue;
    }

    if (!current) continue;

    const fieldMatch = line.match(/^([^：:]{1,18})[：:]\s*(.*)$/);
    if (fieldMatch) {
      currentLabel = fieldMatch[1].trim();
      current.fields[currentLabel] = [fieldMatch[2].trim()].filter(Boolean);
      continue;
    }

    if (currentLabel) current.fields[currentLabel].push(line);
  }

  if (current && Object.keys(current.fields).length) entries.push(current);
  return entries.filter((entry) => entry.title && entry.title.length <= 30);
}

function cleanPhrase(phrase) {
  return phrase
    .replace(/^\s*[-—•]/, '')
    .replace(/[。；;，,：:]+$/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function splitCandidateText(text) {
  const roughParts = text
    .replace(/[（）()]/g, ' ')
    .split(/[。；;\n]/)
    .flatMap((part) => {
      const trimmed = part.trim();
      if (trimmed.length <= 24 && /、/.test(trimmed)) return trimmed.split('、');
      if (/、/.test(trimmed) && trimmed.length <= 48) return trimmed.split('、').map((item) => item.trim());
      return [trimmed];
    });

  return roughParts
    .map(cleanPhrase)
    .filter((part) => part.length >= 4 && part.length <= 38)
    .filter((part) => !/^(类型|结构|特征|意义|贡献|代表人物|代表作)$/.test(part))
    .filter((part) => !/^\d+$/.test(part));
}

function extractCandidates(entry) {
  const weighted = [];
  for (const [label, chunks] of Object.entries(entry.fields)) {
    const text = chunks.join('\n');
    const pieces = splitCandidateText(text);
    for (const piece of pieces) {
      weighted.push({
        text: piece,
        label,
        weight: strongLabels.has(label) ? 2 : 1
      });
    }
  }

  const seen = new Set();
  return weighted
    .sort((a, b) => b.weight - a.weight)
    .filter((item) => {
      if (seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    });
}

function seededNumber(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

function shuffle(items, seed) {
  const list = [...items];
  let state = seededNumber(seed) || 1;
  for (let i = list.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function makeQuestion(entry, allEntries, index) {
  const ownCandidates = extractCandidates(entry);
  if (ownCandidates.length < 3) return null;

  const correctCount = 3 + (seededNumber(entry.title) % 3);
  const correct = ownCandidates.slice(0, correctCount).map((item) => item.text);

  const sameThemeWrongPool = allEntries
    .filter((item) => item !== entry)
    .filter((item) => item.theme === entry.theme)
    .flatMap((item) => extractCandidates(item).slice(0, 4).map((candidate) => candidate.text))
    .filter((text) => !correct.includes(text));

  const allThemeWrongPool = allEntries
    .filter((item) => item !== entry)
    .flatMap((item) => extractCandidates(item).slice(0, 4).map((candidate) => candidate.text))
    .filter((text) => !correct.includes(text));

  const sameThemeWrong = shuffle(Array.from(new Set(sameThemeWrongPool)), `${entry.title}-same-wrong`);
  const fallbackWrong = shuffle(Array.from(new Set(allThemeWrongPool)), `${entry.title}-all-wrong`);
  const wrong = Array.from(new Set([...sameThemeWrong, ...fallbackWrong])).slice(0, 8 - correct.length);
  if (wrong.length + correct.length < 8) return null;

  const options = shuffle(
    [
      ...correct.map((text) => ({ text, correct: true })),
      ...wrong.map((text) => ({ text, correct: false }))
    ],
    `${entry.title}-options`
  ).slice(0, 8);

  const fieldSummary = Object.entries(entry.fields)
    .slice(0, 5)
    .map(([label, chunks]) => `${label}：${chunks.join('')}`)
    .join('\n');

  return {
    id: index + 1,
    concept: entry.title,
    unit: entry.theme,
    prompt: `以下哪些描述属于“${entry.title}”？`,
    explanation: fieldSummary,
    options
  };
}

(async () => {
  const parsed = [];
  for (const source of sources) {
    const filePath = path.join(__dirname, '..', 'data', 'source-docx', source.file);
    const result = await mammoth.extractRawText({ path: filePath });
    const section = getTermsSection(normalizeText(result.value), source.file);
    const entries = parseEntries(section, source.theme);
    parsed.push(...entries);
    console.log(`${source.theme}: ${entries.length} terms`);
  }

  const questions = parsed
    .map((entry, index) => makeQuestion(entry, parsed, index))
    .filter(Boolean)
    .map((question, index) => ({ ...question, id: index + 1 }));

  const out = `export const generatedQuestions = ${JSON.stringify(questions, null, 2)};\n`;
  const outPath = path.join(__dirname, '..', 'src', 'data', 'generatedQuestions.js');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`Generated ${questions.length} questions -> ${outPath}`);
})();
