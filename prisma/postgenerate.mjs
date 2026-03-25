/**
 * Post-generate script for Prisma.
 * Prisma 7.x generates modular files without a barrel index.
 * This script creates the index.ts so @/generated/prisma imports work.
 */
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, '..', 'src', 'generated', 'prisma', 'index.ts');

const content = `export { PrismaClient } from './client'
export * from './enums'
export { Prisma } from './client'
`;

writeFileSync(indexPath, content);
console.log('✓ Created prisma barrel index at src/generated/prisma/index.ts');
