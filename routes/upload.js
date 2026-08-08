// routes/upload.js
// Procesa la imagen con Sharp (recorte cuadrado inteligente, nitidez,
// optimización) y la sube a Cloudinary, para que persista aunque el
// servidor se reinicie (el disco de Render es temporal).

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

  try {
    const processedBuffer = await sharp(req.file.buffer)
      .resize(900, 900, { fit: 'cover', position: 'attention' })
      .sharpen()
      .modulate({ brightness: 1.03, saturation: 1.05 })
      .webp({ quality: 82 })
      .toBuffer();

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'prisma', resource_type: 'image', format: 'webp' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(processedBuffer);
    });

    res.json({ url: uploadResult.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo procesar la imagen.' });
  }
});

module.exports = router;