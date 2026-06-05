const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

const sessions = {};

/*
====================================
INITIALIZE WHATSAPP
====================================
*/

function initializeWhatsApp(schoolId) {

    /*
    PREVENT MULTIPLE INIT
    */

    if (sessions[schoolId]) {
        return;
    }

    /*
    CREATE CLIENT
    */

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
                '--disable-gpu'

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

        console.log('QR EVENT RECEIVED');

        try {

            const qrImage = await qrcode.toDataURL(qr);

            if (sessions[schoolId]) {

                sessions[schoolId].qr = qrImage;

                sessions[schoolId].status = 'qr_ready';

            }

            console.log('QR READY:', schoolId);

        } catch (err) {

            console.log(err);

        }

    });

    /*
    AUTHENTICATED
    */

    client.on('authenticated', () => {

        console.log('AUTHENTICATED:', schoolId);

        if (sessions[schoolId]) {

            sessions[schoolId].status = 'authenticated';

            /*
            REMOVE QR
            */

            sessions[schoolId].qr = null;

        }

    });

    /*
    READY
    */

    client.on('ready', async () => {

        console.log('READY EVENT RECEIVED');

        try {

            if (!sessions[schoolId]) {
                return;
            }

            sessions[schoolId].status = 'connected';

            /*
            REMOVE QR
            */

            sessions[schoolId].qr = null;

            const info = client.info;

            sessions[schoolId].number = info.wid.user;

            console.log('CONNECTED:', schoolId);

        } catch (err) {

            console.log(err);

        }

    });

    /*
    LOADING
    */

    client.on('loading_screen', (percent, message) => {

        console.log('LOADING:', percent, message);

    });

    /*
    STATE CHANGE
    */

    client.on('change_state', state => {

        console.log('STATE:', state);

    });

    /*
    AUTH FAILURE
    */

    client.on('auth_failure', msg => {

        console.log('AUTH FAILURE:', msg);

    });

    /*
    SESSION SAVED
    */

    client.on('remote_session_saved', () => {

        console.log('SESSION SAVED');

    });

    /*
    DISCONNECTED
    */

    client.on('disconnected', async (reason) => {

        console.log('DISCONNECTED:', schoolId);

        console.log(reason);

        if (sessions[schoolId]) {

            sessions[schoolId].status = 'disconnected';

            sessions[schoolId].number = null;

            sessions[schoolId].qr = null;

        }

    });

    /*
    INITIALIZE CLIENT
    */

    client.initialize()

        .then(() => {

            console.log('INITIALIZED:', schoolId);

        })

        .catch((err) => {

            console.log(err);

            delete sessions[schoolId];

        });

}

/*
====================================
QR API
====================================
*/

app.get('/qr/:schoolId', async (req, res) => {

    try {

        const schoolId = String(req.params.schoolId);

        /*
        INIT IF NOT EXISTS
        */

        if (!sessions[schoolId]) {

            initializeWhatsApp(schoolId);

        }

        const session = sessions[schoolId];

        return res.json({

            status: session.status,

            qr:
                session.status === 'qr_ready'
                    ? session.qr
                    : null,

            number: session.number

        });

    } catch (err) {

        console.log(err);

        return res.json({

            status: 'error',

            error: err.message

        });

    }

});

/*
====================================
STATUS API
====================================
*/

app.get('/status/:schoolId', (req, res) => {

    try {

        const schoolId = String(req.params.schoolId);

        if (!sessions[schoolId]) {

            return res.json({

                status: 'not_initialized'

            });

        }

        return res.json({

            status: sessions[schoolId].status,

            number: sessions[schoolId].number

        });

    } catch (err) {

        console.log(err);

        return res.json({

            status: 'error',

            error: err.message

        });

    }

});

/*
====================================
DISCONNECT API
====================================
*/

app.post('/disconnect/:schoolId', async (req, res) => {

    try {

        const schoolId = String(req.params.schoolId);

        if (!sessions[schoolId]) {

            return res.json({

                success: true

            });

        }

        const client = sessions[schoolId].client;

        /*
        LOGOUT
        */

        try {

            await client.logout();

        } catch (e) {

            console.log(e);

        }

        /*
        DESTROY
        */

        try {

            await client.destroy();

        } catch (e) {

            console.log(e);

        }

        /*
        REMOVE SESSION MEMORY
        */

        delete sessions[schoolId];

        /*
        DELETE AUTH FILES
        */

        const sessionPath = path.join(

            __dirname,

            '.wwebjs_auth',

            `session-school_${schoolId}`

        );

        /*
        WAIT BEFORE DELETE
        */

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

                        console.log('SESSION DELETED');

                    }

                }

            );

        }, 10000);

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

});

/*
====================================
SEND MESSAGE API
====================================
*/

app.post('/send-message', async (req, res) => {

    try {

        const schoolId = String(req.body.schoolId);

        const phone = req.body.phone;

        const message = req.body.message;

        /*
        CHECK SESSION
        */

        if (!sessions[schoolId]) {

            return res.json({

                success: false,

                message: 'Session not found'

            });

        }

        /*
        CHECK CONNECTED
        */

        if (sessions[schoolId].status !== 'connected') {

            return res.json({

                success: false,

                message: 'WhatsApp not connected'

            });

        }

        const client = sessions[schoolId].client;

        /*
        FORMAT NUMBER
        */

        const cleanPhone = String(phone)
            .replace(/\+/g, '')
            .replace(/\s/g, '');

        const chatId = cleanPhone + '@c.us';

        /*
        SEND MESSAGE
        */

        await client.sendMessage(chatId, message);

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

});

/*
====================================
HOME
====================================
*/

app.get('/', (req, res) => {

    res.send('WhatsApp Server Running');

});

/*
====================================
START SERVER
====================================
*/

app.listen(3000, () => {

    console.log('WhatsApp Server Running On Port 3000');

});