import multer from "multer";
import path from "node:path";
import fs from "node:fs";

// Local disk storage — matches the roadmap's Phase 3 deployment (single VPS,
// no object storage service provisioned). Revisit if MyDoners ever needs
// multi-server deployment, since local disk wouldn't be shared across nodes.
const uploadDir = path.join(process.cwd(), "uploads", "delivery-proof");
fs.mkdirSync(uploadDir, { recursive: true });

export const deliveryProofUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `order-${req.params.orderId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const productImageDir = path.join(process.cwd(), "uploads", "products");
fs.mkdirSync(productImageDir, { recursive: true });

export const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: productImageDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `product-${req.params.productId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});
