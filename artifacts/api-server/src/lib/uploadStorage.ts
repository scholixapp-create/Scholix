import fs from "node:fs";
import path from "node:path";

export function prepareUploadsDirectory(): string {
  const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  const configuredPath = process.env.UPLOADS_DIR?.trim();
  const railwayProduction = process.env.NODE_ENV === "production" &&
    Boolean(process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_PROJECT_ID);

  if (railwayProduction && !mountPath) {
    throw new Error("Persistent upload storage is not mounted. Attach the API's Railway volume before deploying.");
  }
  if ((mountPath && !path.isAbsolute(mountPath)) ||
      (configuredPath && !path.isAbsolute(configuredPath))) {
    throw new Error("Upload storage paths must be absolute.");
  }

  const directory = path.resolve(configuredPath || mountPath || path.join(process.cwd(), "uploads"));
  if (railwayProduction && mountPath) {
    const relative = path.relative(path.resolve(mountPath), directory);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error("UPLOADS_DIR must be inside the API's mounted Railway volume.");
    }
  }

  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
  return directory;
}
