import { Queue, type ConnectionOptions } from 'bullmq';
import { queueRedis } from './queue-redis';

export const pdfQueue = new Queue('pdf-generation', { connection: queueRedis as ConnectionOptions });
export const assessmentQueue = new Queue('assessment', { connection: queueRedis as ConnectionOptions });
