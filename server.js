const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

/*
====================================
SESSIONS
====================================
*/

const sessions = {};
const initializingSessions = {};

/*
====================================
INITIALIZE WHATSAPP
====================================
*/

async function initializeWhatsApp(schoolId) {

    schoolId = String(schoolId);

    /*
    PREVENT DUPLICATE
    */

    if (sessions[schoolId]) {
        return;
    }

    if (initializingSessions[schoolId]) {
        return;
    }

    initializingSessions[schoolId] = true;

    console.log('INITIALIZING:', schoolId);

    try {

        const client = new Client({

            authStrategy: new LocalAuth({
                clientId: `school_${schoolId}`
            }),

            takeoverOnConflict: true,

            takeoverTimeoutMs: 0,

            puppeteer: {

                headless: true,

                args: [

                    '--no-sandbox',

                    '--disable-setuid-sandbox',

                    '--disable-dev-shm-usage',

                    '--disable-gpu',

                    '--disable-extensions',

                    '--disable-background-networking',

                    '--disable-background-timer-throttling',

                    '--disable-renderer-backgrounding',

                    '--disable-sync',

                    '--mute-audio'

                ]

            }

        });

        /*
        STORE SESSION
        */

        sessions[schoolId] = {

            client: client,

            qr: null,

            status: 'initializing',

            number: null

        };

        /*
        QR EVENT
        */

        client.on('qr', async (qr) => {

            console.log('QR EVENT:', schoolId);

            try {

                const qrImage =
                    await qrcode.toDataURL(qr);

                if (sessions[schoolId]) {

                    sessions[schoolId].qr =
                        qrImage;

                    sessions[schoolId].status =
                        'qr_ready';

                }

            } catch (err) {

                console.log(err);

            }

        });

        /*
        AUTHENTICATED
        */

        client.on('authenticated', () => {

            console.log(
                'AUTHENTICATED:',
                schoolId
            );

            if (sessions[schoolId]) {

                sessions[schoolId].status =
                    'authenticated';

                sessions[schoolId].qr = null;

            }

        });

        /*
        READY
        */

        client.on('ready', async () => {

            console.log(
                'CONNECTED:',
                schoolId
            );

            try {

                if (!sessions[schoolId]) {
                    return;
                }

                sessions[schoolId].status =
                    'connected';

                sessions[schoolId].qr = null;

                sessions[schoolId].number =
                    client.info.wid.user;

                delete initializingSessions[
                    schoolId
                ];

            } catch (err) {

                console.log(err);

            }

        });

        /*
        LOADING
        */

        client.on(
            'loading_screen',
            (percent, message) => {

                console.log(
                    'LOADING:',
                    percent,
                    message
                );

            }
        );

        /*
        STATE
        */

        client.on(
            'change_state',
            (state) => {

                console.log(
                    'STATE:',
                    schoolId,
                    state
                );

            }
        );

        /*
        AUTH FAILURE
        */

        client.on(
            'auth_failure',
            (msg) => {

                console.log(
                    'AUTH FAILURE:',
                    schoolId
                );

                console.log(msg);

            }
        );

        /*
        DISCONNECTED
        */

        client.on(
            'disconnected',
            async (reason) => {

                console.log(
                    'DISCONNECTED:',
                    schoolId
                );

                console.log(reason);

                try {

                    if (sessions[schoolId]) {

                        sessions[
                            schoolId
                        ].status =
                            'disconnected';

                        sessions[
                            schoolId
                        ].number = null;

                        sessions[
                            schoolId
                        ].qr = null;

                    }

                    delete sessions[schoolId];

                    delete initializingSessions[
                        schoolId
                    ];

                    /*
                    AUTO RECONNECT
                    */

                    setTimeout(() => {

                        initializeWhatsApp(
                            schoolId
                        );

                    }, 5000);

                } catch (err) {

                    console.log(err);

                }

            }
        );

        /*
        INITIALIZE
        */

        await client.initialize();

        console.log(
            'INITIALIZED:',
            schoolId
        );

    } catch (err) {

        console.log(err);

        delete sessions[schoolId];

        delete initializingSessions[schoolId];

    }

}

/*
====================================
RESTORE OLD SESSIONS
====================================
*/

function restoreSessions() {

    try {

        const authPath = path.join(
            __dirname,
            '.wwebjs_auth'
        );

        if (!fs.existsSync(authPath)) {
            return;
        }

        const folders =
            fs.readdirSync(authPath);

        folders.forEach(folder => {

            if (
                folder.startsWith(
                    'session-school_'
                )
            ) {

                const schoolId =
                    folder.replace(
                        'session-school_',
                        ''
                    );

                console.log(
                    'RESTORING SESSION:',
                    schoolId
                );

                initializeWhatsApp(
                    schoolId
                );

            }

        });

    } catch (err) {

        console.log(err);

    }

}

/*
====================================
START SESSION
====================================
*/

app.post(
    '/start-session/:schoolId',
    async (req, res) => {

        try {

            const schoolId =
                String(
                    req.params.schoolId
                );

            if (sessions[schoolId]) {

                return res.json({

                    success: true,

                    status:
                        sessions[
                            schoolId
                        ].status

                });

            }

            initializeWhatsApp(
                schoolId
            );

            return res.json({

                success: true,

                status: 'initializing'

            });

        } catch (err) {

            console.log(err);

            return res.json({

                success: false,

                error: err.message

            });

        }

    }
);

/*
====================================
QR API
====================================
*/

app.get(
    '/qr/:schoolId',
    async (req, res) => {

        try {

            const schoolId =
                String(
                    req.params.schoolId
                );

            if (!sessions[schoolId]) {

                return res.json({

                    status:
                        'not_initialized',

                    qr: null

                });

            }

            return res.json({

                status:
                    sessions[
                        schoolId
                    ].status,

                qr:
                    sessions[
                        schoolId
                    ].status ===
                    'qr_ready'
                        ? sessions[
                            schoolId
                        ].qr
                        : null,

                number:
                    sessions[
                        schoolId
                    ].number

            });

        } catch (err) {

            console.log(err);

            return res.json({

                status: 'error',

                error: err.message

            });

        }

    }
);

/*
====================================
STATUS
====================================
*/

app.get(
    '/status/:schoolId',
    (req, res) => {

        try {

            const schoolId =
                String(
                    req.params.schoolId
                );

            if (!sessions[schoolId]) {

                return res.json({

                    status:
                        'not_initialized'

                });

            }

            return res.json({

                status:
                    sessions[
                        schoolId
                    ].status,

                number:
                    sessions[
                        schoolId
                    ].number

            });

        } catch (err) {

            console.log(err);

            return res.json({

                status: 'error',

                error: err.message

            });

        }

    }
);

/*
====================================
SEND MESSAGE
====================================
*/

app.post(
    '/send-message',
    async (req, res) => {

        try {

            const schoolId =
                String(
                    req.body.schoolId
                );

            const phone =
                req.body.phone;

            const message =
                req.body.message;

            if (!sessions[schoolId]) {

                return res.json({

                    success: false,

                    message:
                        'Session not found'

                });

            }

            if (
                sessions[schoolId]
                    .status !==
                'connected'
            ) {

                return res.json({

                    success: false,

                    message:
                        'WhatsApp not connected'

                });

            }

            const client =
                sessions[schoolId]
                    .client;

            const cleanPhone =
                String(phone)
                .replace(/\+/g, '')
                .replace(/\s/g, '');

            const chatId =
                cleanPhone +
                '@c.us';

            await client.sendMessage(
                chatId,
                message
            );

            return res.json({

                success: true

            });

        } catch (err) {

            console.log(err);

            return res.json({

                success: false,

                error: err.message

            });

        }

    }
);

/*
====================================
DISCONNECT
====================================
*/

app.post(
    '/disconnect/:schoolId',
    async (req, res) => {

        try {

            const schoolId =
                String(
                    req.params.schoolId
                );

            if (!sessions[schoolId]) {

                return res.json({
                    success: true
                });

            }

            const client =
                sessions[schoolId]
                    .client;

            try {

                await client.logout();

            } catch (e) {

                console.log(e);

            }

            try {

                await client.destroy();

            } catch (e) {

                console.log(e);

            }

            delete sessions[schoolId];

            delete initializingSessions[
                schoolId
            ];

            const sessionPath =
                path.join(

                    __dirname,

                    '.wwebjs_auth',

                    `session-school_${schoolId}`

                );

            setTimeout(() => {

                fs.rm(

                    sessionPath,

                    {

                        recursive: true,

                        force: true

                    },

                    (err) => {

                        if (err) {

                            console.log(err);

                        } else {

                            console.log(
                                'SESSION DELETED'
                            );

                        }

                    }

                );

            }, 5000);

            return res.json({

                success: true

            });

        } catch (err) {

            console.log(err);

            return res.json({

                success: false,

                error: err.message

            });

        }

    }
);

/*
====================================
HOME
====================================
*/

app.get('/', (req, res) => {

    res.send(
        'WhatsApp Server Running'
    );

});

/*
====================================
START SERVER
====================================
*/

app.listen(3000, () => {

    console.log(
        'WhatsApp Server Running On Port 3000'
    );

    restoreSessions();

});