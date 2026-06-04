import { Queue } from 'bullmq';
import { queueRedis } from './queue-redis';

export const pdfQueue = new Queue('pdf-generation', { connection: queueRedis });
export const assessmentQueue = new Queue('assessment', { connection: queueRedis });
