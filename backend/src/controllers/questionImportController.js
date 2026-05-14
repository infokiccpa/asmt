const multer = require('multer');
const {
  createPreview,
  getPreview,
  commitPreview
} = require('../services/questionImportService');

const allowedMimeTypes = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
  'text/json'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.BULK_UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024)
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype) || /\.(csv|xlsx|xls|json)$/i.test(file.originalname)) {
      return cb(null, true);
    }

    return cb(new Error('Only CSV, Excel, and JSON files are supported.'));
  }
});

exports.uploadQuestionImportFile = upload.single('file');

exports.previewQuestionImport = async (req, res) => {
  try {
    const preview = await createPreview({ file: req.file, userId: req.user._id });
    res.status(201).json(preview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getQuestionImportPreview = async (req, res) => {
  try {
    const preview = await getPreview({ previewId: req.params.previewId, userId: req.user._id });
    res.json(preview);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.commitQuestionImport = async (req, res) => {
  try {
    const result = await commitPreview({
      previewId: req.body.previewId,
      userId: req.user._id,
      importMode: req.body.importMode
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
