const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const Question = require('../models/Question');
const QuestionImport = require('../models/QuestionImport');

const ALLOWED_TYPES = new Set(['MCQ', 'Subjective', 'Coding', 'True/False']);
const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

const HEADER_ALIASES = {
  text: ['text', 'question', 'questiontext', 'question_text', 'prompt'],
  type: ['type', 'questiontype', 'question_type'],
  subject: ['subject', 'topic', 'chapter', 'category'],
  difficulty: ['difficulty', 'level'],
  tags: ['tags', 'tag'],
  options: ['options', 'choices'],
  correctAnswer: ['correctanswer', 'correct_answer', 'answer', 'correctoption', 'correct_option'],
  codingTemplate: ['codingtemplate', 'coding_template', 'startercode', 'starter_code'],
  testCases: ['testcases', 'test_cases', 'testcase', 'test_case'],
  image: ['image', 'imageurl', 'image_url'],
  referenceSolution: ['referencesolution', 'reference_solution', 'solution', 'answer_key']
};

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '')
    .replace(/[()[\]{}]/g, '');
}

function getFieldValue(row, field) {
  const aliases = HEADER_ALIASES[field] || [];
  const entries = Object.entries(row || {});

  for (const [key, value] of entries) {
    if (aliases.includes(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

function detectSourceType(fileName) {
  const extension = path.extname(fileName || '').toLowerCase();
  if (extension === '.csv') return 'csv';
  if (extension === '.xlsx' || extension === '.xls') return 'xlsx';
  if (extension === '.json') return 'json';
  throw new Error('Unsupported file format. Please upload CSV, Excel, or JSON.');
}

function normalizeType(value) {
  const rawValue = String(value || 'MCQ').trim().toLowerCase();
  if (rawValue === 'mcq') return 'MCQ';
  if (rawValue === 'subjective') return 'Subjective';
  if (rawValue === 'coding') return 'Coding';
  if (rawValue === 'true/false' || rawValue === 'truefalse' || rawValue === 'tf') return 'True/False';
  return value;
}

function normalizeDifficulty(value) {
  const rawValue = String(value || 'Medium').trim().toLowerCase();
  if (!rawValue) return 'Medium';
  if (rawValue === 'easy' || rawValue === 'basic' || rawValue === 'beginner') return 'Easy';
  if (rawValue === 'medium' || rawValue === 'intermediate') return 'Medium';
  if (rawValue === 'hard' || rawValue === 'advanced') return 'Hard';
  return value;
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  const rawValue = String(value || '').trim().toLowerCase();
  return ['true', 'yes', '1', 'correct'].includes(rawValue);
}

function extractOptionEntries(row) {
  const inlineOptions = getFieldValue(row, 'options');
  if (inlineOptions) {
    return splitList(inlineOptions).map((text) => ({ text, isCorrect: false }));
  }

  return Object.entries(row || {})
    .filter(([key]) => /^option\d+$/i.test(String(key).trim()))
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([, value]) => String(value || '').trim())
    .filter(Boolean)
    .map((text) => ({ text, isCorrect: false }));
}

function applyCorrectAnswers(options, row) {
  const correctAnswerRaw = getFieldValue(row, 'correctAnswer');
  if (!correctAnswerRaw) {
    return options;
  }

  const normalizedCorrectValues = splitList(correctAnswerRaw).map((value) => value.toLowerCase());
  const indexedAnswerSet = new Set(
    normalizedCorrectValues
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .map((value) => value - 1)
  );

  return options.map((option, index) => ({
    ...option,
    isCorrect:
      indexedAnswerSet.has(index) ||
      normalizedCorrectValues.includes(option.text.toLowerCase()) ||
      parseBoolean(row[`isCorrect${index + 1}`])
  }));
}

function normalizeTestCases(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((testCase) => ({
        input: String(testCase.input || '').trim(),
        output: String(testCase.output || '').trim()
      }))
      .filter((testCase) => testCase.input || testCase.output);
  }

  try {
    const parsed = JSON.parse(String(value));
    return normalizeTestCases(parsed);
  } catch (error) {
    return splitList(value).map((entry) => {
      const [input, output] = entry.split('=>').map((item) => String(item || '').trim());
      return { input, output };
    }).filter((testCase) => testCase.input || testCase.output);
  }
}

function normalizeTags(value) {
  return splitList(value);
}

function normalizeQuestion(rawRow) {
  const row = rawRow || {};
  const type = normalizeType(getFieldValue(row, 'type') || row.type || 'MCQ');
  const normalized = {
    text: String(getFieldValue(row, 'text') || row.text || '').trim(),
    image: String(getFieldValue(row, 'image') || row.image || '').trim() || undefined,
    type,
    subject: String(getFieldValue(row, 'subject') || row.subject || '').trim(),
    difficulty: normalizeDifficulty(getFieldValue(row, 'difficulty') || row.difficulty || 'Medium'),
    tags: normalizeTags(getFieldValue(row, 'tags') || row.tags),
    options: [],
    codingTemplate: String(getFieldValue(row, 'codingTemplate') || row.codingTemplate || '').trim() || undefined,
    referenceSolution: String(getFieldValue(row, 'referenceSolution') || row.referenceSolution || '').trim() || undefined,
    testCases: normalizeTestCases(getFieldValue(row, 'testCases') || row.testCases)
  };

  if (type === 'MCQ') {
    normalized.options = applyCorrectAnswers(extractOptionEntries(row), row);
  } else if (Array.isArray(row.options)) {
    normalized.options = row.options.map((option) => ({
      text: String(option.text || option).trim(),
      isCorrect: Boolean(option.isCorrect)
    })).filter((option) => option.text);
  }

  return normalized;
}

function validateQuestion(question) {
  const errors = [];

  if (!question.text) {
    errors.push('Question text is required.');
  }

  if (!ALLOWED_TYPES.has(question.type)) {
    errors.push('Question type must be one of MCQ, Subjective, or Coding.');
  }

  if (!ALLOWED_DIFFICULTIES.has(question.difficulty)) {
    errors.push('Difficulty must be one of Easy, Medium, or Hard.');
  }

  if (question.type === 'MCQ') {
    if (!question.options.length || question.options.length < 2) {
      errors.push('MCQ questions must have at least two options.');
    }

    const correctOptions = question.options.filter((option) => option.isCorrect);
    if (!correctOptions.length) {
      errors.push('MCQ questions must include at least one correct option.');
    }
  }

  if (question.type === 'Coding' && !question.testCases.length) {
    errors.push('Coding questions should include at least one test case.');
  }

  return errors;
}

function parseRowsFromJson(buffer) {
  const parsed = JSON.parse(buffer.toString('utf8'));
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.questions)) {
    return parsed.questions;
  }

  throw new Error('JSON file must contain an array or a { "questions": [] } payload.');
}

function parseRowsFromSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    defval: '',
    raw: false
  });
}

function serializePreview(document) {
  return {
    previewId: document.batchId,
    sourceType: document.sourceType,
    originalFileName: document.originalFileName,
    status: document.status,
    summary: document.summary,
    parsedQuestions: document.parsedQuestions
  };
}

async function createPreview({ file, userId }) {
  if (!file) {
    throw new Error('A file is required for bulk upload preview.');
  }

  const sourceType = detectSourceType(file.originalname);
  const rows = sourceType === 'json'
    ? parseRowsFromJson(file.buffer)
    : parseRowsFromSpreadsheet(file.buffer);

  const rowOffset = sourceType === 'json' ? 1 : 2;
  const parsedQuestions = rows.map((row, index) => {
    const normalizedQuestion = normalizeQuestion(row);
    const validationErrors = validateQuestion(normalizedQuestion);

    return {
      rowNumber: index + rowOffset,
      rawData: row,
      normalizedQuestion,
      validationErrors,
      isValid: validationErrors.length === 0
    };
  });

  const summary = {
    totalRows: parsedQuestions.length,
    validRows: parsedQuestions.filter((question) => question.isValid).length,
    invalidRows: parsedQuestions.filter((question) => !question.isValid).length
  };

  const preview = await QuestionImport.create({
    batchId: crypto.randomUUID(),
    originalFileName: file.originalname,
    sourceType,
    uploadedBy: userId,
    summary,
    parsedQuestions
  });

  return serializePreview(preview);
}

async function getPreview({ previewId, userId }) {
  const preview = await QuestionImport.findOne({ batchId: previewId, uploadedBy: userId }).lean();
  if (!preview) {
    throw new Error('Bulk upload preview not found.');
  }

  return serializePreview(preview);
}

async function commitPreview({ previewId, userId, importMode = 'valid-only' }) {
  const preview = await QuestionImport.findOne({ batchId: previewId, uploadedBy: userId });
  if (!preview) {
    throw new Error('Bulk upload preview not found.');
  }

  if (preview.status === 'imported') {
    throw new Error('This bulk upload preview has already been imported.');
  }

  if (importMode === 'all-or-nothing' && preview.summary.invalidRows > 0) {
    throw new Error('Preview contains invalid rows. Resolve them or use valid-only mode.');
  }

  const validQuestions = preview.parsedQuestions
    .filter((item) => item.isValid)
    .map((item) => ({
      ...item.normalizedQuestion,
      createdBy: userId,
      importMeta: {
        batchId: preview.batchId,
        sourceFileName: preview.originalFileName,
        sourceType: preview.sourceType,
        importedAt: new Date()
      }
    }));

  if (!validQuestions.length) {
    throw new Error('No valid questions available to import.');
  }

  const insertedQuestions = await Question.insertMany(validQuestions);

  preview.status = 'imported';
  preview.importedQuestionIds = insertedQuestions.map((question) => question._id);
  await preview.save();

  return {
    previewId: preview.batchId,
    importedCount: insertedQuestions.length,
    skippedCount: preview.summary.invalidRows,
    questionIds: insertedQuestions.map((question) => question._id)
  };
}

module.exports = {
  createPreview,
  getPreview,
  commitPreview
};
