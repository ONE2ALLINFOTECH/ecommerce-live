// upload middleware
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: isVideo ? "videos" : "products",
      resource_type: isVideo ? "video" : "image",
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4', 'video/avi', 'video/quicktime', 'video/webm',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;