import { NextResponse } from "next/server";
import crypto from "crypto";

function extractPublicId(imageUrl: string) {
  try {
    const parsedUrl = new URL(imageUrl);
    const uploadIndex = parsedUrl.pathname.indexOf("/upload/");

    if (uploadIndex === -1) {
      return null;
    }

    let publicIdPath = parsedUrl.pathname.slice(uploadIndex + "/upload/".length);
    publicIdPath = publicIdPath.replace(/^v\d+\//, "");
    publicIdPath = publicIdPath.replace(/\.[^.]+$/, "");

    return publicIdPath || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      return NextResponse.json({ error: "Could not determine Cloudinary public_id" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary configuration is missing" }, { status: 500 });
    }

    const timestamp = Math.round(Date.now() / 1000).toString();
    const signatureToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureToSign).digest("hex");

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "Delete failed" }, { status: response.status });
    }

    return NextResponse.json({ result: data.result, publicId });
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}