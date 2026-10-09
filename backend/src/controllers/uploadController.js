const { uploadFile } = require("../services/uploadServices");

const ALLOWED_RESOURCE_TYPES = ["auto", "image", "raw", "video"];

// POST /api/upload/file  multipart: file + folder + resourceType?
const uploadSingleFile = async (req, res) => {
  const { companyCode } = req.user;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      field: "file",
      message: "File is required.",
    });
  }

  // folder frontend se jo aaye (e.g. "employees/1001/resume"), usko company ke
  // namespace ke andar rakho taaki har company ka data alag rahe.
  const subFolder = String(req.body?.folder ?? "misc")
    .replace(/\.\./g, "")
    .replace(/^\/+|\/+$/g, "");

  const resourceType = ALLOWED_RESOURCE_TYPES.includes(req.body?.resourceType)
    ? req.body.resourceType
    : "auto";

  try {
    const result = await uploadFile(req.file.buffer, {
      folder: `companies/${companyCode}/${subFolder}`,
      resourceType,
      maxBytes: 5 * 1024 * 1024,
      fileName: req.file.originalname,
    });

    res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      data: {
        url: result.url,
        publicId: result.publicId,
        resourceType: result.resourceType,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload file.",
    });
  }
};

module.exports = { uploadSingleFile };
