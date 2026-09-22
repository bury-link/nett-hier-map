import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export async function persistUploadedFile(source: string, destination: string): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  await rm(source, { force: true });
}
