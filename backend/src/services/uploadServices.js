const cloudinary = require("../config/cloudinary");

const uploadFile = (
  buffer,  //backend ko mili file ka temporary data
  {
    folder,   //cloudinary mein file kis folder mein jayegi
    resourceType = "auto",
    allowedTypes = [],
    maxBytes = 500 * 1024 * 1024,    //default maximum size 5 MB
    fileName,   //uploaded original file ka naam (optional) — URL me wahi dikhega
  }
) => {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return reject(new Error("A valid file buffer is required."));
    }

    if (buffer.length > maxBytes) {
      return reject(new Error("File size exceeds the allowed limit."));
    }

    // Original file name milne par wahi public_id bano — URL ke aakhri hisse me
    // uploaded naam dikhega. Format (extension) public_id me mat daalna —
    // Cloudinary result/ secure_url me help extension laga deta hai.
    let publicId;
    if (fileName) {
      const base = String(fileName)
        .replace(/\.[^/.]+$/, "")      // extension hatao
        .replace(/[^A-Za-z0-9_-]+/g, "_") // URL-safe banao
        .slice(0, 60);
      if (base) publicId = base;
    }

    const uploadOptions = {
      folder,
      resource_type: resourceType,
    };
    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;   // dobara same naam upload ho to replace ho
      uploadOptions.invalidate = true;  // CDN cache bhi naye file se refresh ho
    }

    cloudinary.uploader
      .upload_stream(     //file ko cloudinary par upload karta haii
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);

          resolve({
            url: result.secure_url,  //upload file ka HTTPS Url
            publicId: result.public_id,  //cloudinary par assest ko identify karne k liye id
            resourceType: result.resource_type,
          });
        }
      )
      .end(buffer);
  });
};

module.exports = { uploadFile };