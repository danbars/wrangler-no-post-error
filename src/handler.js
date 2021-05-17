/* global LOG_DNA_KEY */
import Proxy from 'cloudworker-proxy';
import { logger } from './logger';
import { emailTasks } from './task-handlers/emails'
const rules = [
    {
        handlerName: 'logger',
        options: {
            LOG_DNA_KEY: LOG_DNA_KEY,
            HOSTNAME: 'tasks.form-data.com',
            APPLICATION_NAME: 'tasks'
        }
    },
    {
        handlerName: 'rateLimit',
        options: {
            limit: 100, // The default allowed calls
            scope: 'default',
            type: 'IP', // Anything except IP will sum up all calls
        }
    },
    {
        handlerName: 'emailTasks',
        path: '/emails/v1',
        method: ['POST'],
        options: {}
    }
];

const proxy = new Proxy(rules, {
    emailTasks,
    logger
});

/**
 * Fetch and log a given request object
 * @param {Request} options
 */
export async function handler(event) {
    return proxy.resolve(event);
}
