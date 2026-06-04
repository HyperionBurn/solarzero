import { Queue } from 'bullmq';
import { redis } from './redis';

export const pdfQueue = new Queue('pdf-generation', { connection: redis });
export const assessmentQueue = new Queue('assessment', { connection: redis });
