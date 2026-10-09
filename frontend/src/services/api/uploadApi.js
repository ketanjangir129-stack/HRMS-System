const API_URL = "http://localhost:5001/api";

/*
| Sabhi image/file uploads ab backend ke through Cloudinary par jaati hain —
| Firebase Storage ab use nahi hota. Backend token se company nikalta hai aur
| file ko companies/{companyCode}/{folder} ke neeche store karta hai.
*/
export const uploadFileApi = async (file, { folder, resourceType } = {}) => {
  const token = localStorage.getItem("authToken");

  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);
  if (resourceType) formData.append("resourceType", resourceType);

  const response = await fetch(`${API_URL}/upload/file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to upload file.");
  }

  return data.data; // { url, publicId, resourceType }
};
