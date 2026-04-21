import { useCallback, useState } from "react";

export function useAvatarUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file) => {
    setError(null);
    setProgress(0);
    setUploading(true);
    try {
      if (!file || !file.type?.startsWith("image/")) {
        throw new Error("Please choose an image file");
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Max file size is 2MB");
      }

      const pre = await fetch("/api/uploads/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const preData = await pre.json();
      if (!pre.ok) throw new Error(preData.error || "Failed to get upload URL");

      const { uploadUrl, publicUrl } = preData;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded * 100) / e.total));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      setProgress(100);
      setUploading(false);
      return { url: publicUrl };
    } catch (e) {
      setError(e.message);
      setUploading(false);
      throw e;
    }
  }, []);

  return { upload, uploading, progress, error };
}

export default useAvatarUpload;


