/* global MAILERSEND_API_TOKEN, EMAIL_TASKS_AUTH */
const htmlToText = require('html-to-text');

export function emailTasks ({ }) {
    return async (ctx) => {
        console.log('Emails task handler');
        try {
            const req = ctx.request;
            // req keys = ["body","headers","host","hostname","href","json","method","origin","path","protocol","query","querystring","search","text"]
            // console.log('headers', JSON.stringify(req.headers));
            const t = await req.text();
            const tt = JSON.parse(t);
            console.log('t is parsed. tt keys=', Object.keys(tt));
            if (!tt.requestOptions && !tt.requestOptions.body) {
                console.error('bad request body. can\'t parse task', JSON.stringify(tt));
                ctx.status = 200; // we return 200 so Google task will not dispatch this bad task again
                ctx.body = JSON.stringify({status: "bad request body"})
                return;
            }
            const task = JSON.parse(tt.requestOptions.body);
            console.log('task is parsed');

            //const task = await req.json();
            //validations
            //TODO: use this also in task handler "kGGUHpWlBN1L64AVxAG4qAsZAkaLC3oHr6l2XIvU"
            if (req.headers.authorization !== EMAIL_TASKS_AUTH) {
                console.error('Bad authorization header. Got ', req.headers.authorization);
                ctx.status = 200; // we return 200 so Google task will not dispatch this bad task again
                ctx.body = JSON.stringify({status: "bad authorization"})
                return;
            }
            if (!task.from ||
                !task.to ||
                !task.subject ||
                !task.html
            ) {
                console.error('bad email task. Mandatory field not provided. Got', JSON.stringify(task));
                ctx.status = 200; // we return 200 so Google task will not dispatch this bad task again
                ctx.body = JSON.stringify({status: "bad email task"})
                return;
            }
            task.text = task.text || htmlToText.fromString(task.html);
            const { status, text } = await mailerSend(task.from, task.to, task.replyTo, task.subject, task.html, task.text)
            ctx.status = status;
            ctx.body = JSON.stringify({message: text});
        } catch (err) {
            console.error('Error while handling email', err)
            ctx.status = 500;
            ctx.set('X-Debug-Error', err);
            ctx.body = "Error (e34): " + err
        }
    }
}

async function mailerSend(from, to, replyTo, subject, html, text ) {
    const url = 'https://api.mailersend.com/v1/email';
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${MAILERSEND_API_TOKEN}`);
    headers.append("Content-Type", "application/json");

    text = text || htmlToText.fromString(html);
    to = Array.isArray(to) ? to : [{email: to}]
    const body = {
        from,
        to,
        subject,
        text,
        html
    }
    if (replyTo) {
        body['reply_to'] = replyTo;
    }

    // console.log('mail api body:', JSON.stringify(body));
    const requestOptions = {
        method: 'POST',
        body: JSON.stringify(body),
        headers
    };

    console.log('Calling mailersend')
    return fetch(url, requestOptions)
        .then(async response => {
            console.log('status is-ok + code from mailersend', response.ok, response.status)
            const text = await response.text()
            return { status: response.status, text: text };
        })
        .then(({status, text}) =>
        {
            console.log(text);
            return {status, text};
        })
        .catch(error => {
            console.error('error (e77)', error, url, JSON.stringify(requestOptions, null, 2))
            return {status: 500, text: 'error (e77):' + error.message}
        });
}