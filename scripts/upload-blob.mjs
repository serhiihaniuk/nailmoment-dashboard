import { put } from "@vercel/blob";
import { readFileSync, statSync } from "fs";
import { basename } from "path";

const PREFIX = "db-backups/";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node upload-blob.mjs <file-path>");
  process.exit(1);
}

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set");
  process.exit(1);
}

const { size } = statSync(filePath);
const body = readFileSync(filePath);
const key = `${PREFIX}${basename(filePath)}`;

console.log(`Uploading ${filePath} (${(size / 1024).toFixed(1)} KB) -> ${key}`);

const result = await put(key, body, {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  token,
});

console.log(`Uploaded: ${result.url}`);
