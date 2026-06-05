<!DOCTYPE html>
<html>

<head>

    <title>WhatsApp Connect</title>

    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">

    <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <style>
        body {
            background: #eef2f7;
            font-family: Arial;
        }

        .wa-card {
            width: 420px;
            max-width: 95%;
            margin: auto;
            margin-top: 50px;
            background: #ffffff;
            border-radius: 20px;
            padding: 35px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            text-align: center;
        }

        .logo {
            width: 70px;
            height: 70px;
            background: #25D366;
            margin: auto;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 35px;
            margin-bottom: 15px;
        }

        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .subtitle {
            color: #777;
            font-size: 14px;
            margin-bottom: 25px;
        }

        .status-badge {
            padding: 10px 18px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 20px;
        }

        .connecting {
            background: #fff3cd;
            color: #856404;
        }

        .connected {
            background: #d4edda;
            color: #155724;
        }

        .disconnected {
            background: #f8d7da;
            color: #721c24;
        }

        .qr-img {
            width: 260px;
            height: 260px;
            object-fit: contain;
            background: #fff;
            padding: 10px;
            border-radius: 15px;
            border: 1px solid #eee;
        }

        .number-box {
            margin-top: 20px;
            font-size: 18px;
            font-weight: 600;
        }

        .disconnect-btn {
            margin-top: 25px;
            border-radius: 10px;
            padding: 10px 20px;
            display: none;
        }

        .loading-text {
            font-size: 18px;
            margin-top: 20px;
        }
    </style>

</head>

<body>

    <div class="wa-card">

        <div class="logo">
            <i class="fab fa-whatsapp"></i>
        </div>

        <div class="title">
            WhatsApp Connection
        </div>

        <div class="subtitle">
            Connect your school's WhatsApp account
        </div>

        <div id="statusBox"></div>

        <div id="qrBox">
            Loading...
        </div>

        <div id="numberBox" class="number-box"></div>

        <button class="btn btn-danger disconnect-btn" id="disconnectBtn">
            Disconnect
        </button>

    </div>

   <script>

    /*
    =====================================
    CONFIG
    =====================================
    */

    const schoolId = 1900;

    // const serverUrl = 'http://localhost:3000';
    const serverUrl = 'https://whatsapp-production-cee4.up.railway.app';

    let isConnected = false;

    /*
    =====================================
    SHOW / HIDE DISCONNECT BUTTON
    =====================================
    */

    function showDisconnectButton() {

        $('#disconnectBtn').show();

    }

    function hideDisconnectButton() {

        $('#disconnectBtn').hide();

    }

    /*
    =====================================
    START SESSION
    =====================================
    */

    function startSession() {

        $.ajax({

            url:
                serverUrl +
                '/start-session/' +
                schoolId,

            method: 'POST',

            success: function (res) {

                console.log('SESSION START:', res);

            }

        });

    }

    /*
    =====================================
    LOAD STATUS
    =====================================
    */

    function loadStatus() {

        $.ajax({

            url:
                serverUrl +
                '/status/' +
                schoolId +
                '?t=' +
                new Date().getTime(),

            method: 'GET',

            timeout: 5000,

            success: function (res) {

                console.log('STATUS:', res);

                /*
                SERVER BACK ONLINE
                */

                $('#statusBox').html('');

                /*
                CONNECTED
                */

                if (res.status === 'connected') {

                    isConnected = true;

                    showDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge connected">' +
                        '<i class="fab fa-whatsapp"></i> Connected' +
                        '</div>'
                    );

                    $('#numberBox').html(
                        'Connected Number : <b>+' +
                        (res.number || '') +
                        '</b>'
                    );

                    $('#qrBox').hide().html('');

                    return;
                }

                /*
                AUTHENTICATED
                */

                if (res.status === 'authenticated') {

                    isConnected = false;

                    hideDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge connecting">' +
                        '<i class="fas fa-spinner fa-spin"></i> Connecting WhatsApp...' +
                        '</div>'
                    );

                    $('#qrBox')
                        .show()
                        .html(
                            '<div class="loading-text">Connecting...</div>'
                        );

                    return;
                }

                /*
                SESSION NOT INITIALIZED
                */

                if (
                    res.status === 'not_initialized'
                ) {

                    isConnected = false;

                    hideDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge connecting">' +
                        '<i class="fas fa-spinner fa-spin"></i> Starting WhatsApp...' +
                        '</div>'
                    );

                    $('#qrBox')
                        .show()
                        .html(
                            '<div class="loading-text">Preparing QR...</div>'
                        );

                    /*
                    AUTO START SESSION
                    */

                    startSession();

                    return;
                }

                /*
                OTHER STATES
                */

                isConnected = false;

                hideDisconnectButton();

                loadQR();

            },

            error: function () {

                isConnected = false;

                hideDisconnectButton();

                $('#statusBox').html(
                    '<div class="status-badge disconnected">' +
                    '<i class="fas fa-server"></i> Server Offline' +
                    '</div>'
                );

                $('#numberBox').html('');

                $('#qrBox')
                    .show()
                    .html(
                        '<div class="loading-text">Waiting for server...</div>'
                    );

            }

        });

    }

    /*
    =====================================
    LOAD QR
    =====================================
    */

    function loadQR() {

        if (isConnected) {
            return;
        }

        $.ajax({

            url:
                serverUrl +
                '/qr/' +
                schoolId +
                '?t=' +
                new Date().getTime(),

            method: 'GET',

            timeout: 5000,

            success: function (res) {

                console.log('QR:', res);

                /*
                QR READY
                */

                if (
                    res.status === 'qr_ready' &&
                    res.qr
                ) {

                    hideDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge connecting">' +
                        '<i class="fas fa-qrcode"></i> Scan QR in WhatsApp' +
                        '</div>'
                    );

                    $('#numberBox').html('');

                    $('#qrBox')
                        .show()
                        .html(
                            '<img src="' +
                            res.qr +
                            '" class="qr-img">'
                        );

                    return;
                }

                /*
                INITIALIZING
                */

                if (
                    res.status === 'initializing'
                ) {

                    hideDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge connecting">' +
                        '<i class="fas fa-spinner fa-spin"></i> Starting WhatsApp...' +
                        '</div>'
                    );

                    $('#qrBox')
                        .show()
                        .html(
                            '<div class="loading-text">Preparing QR...</div>'
                        );

                    return;
                }

                /*
                AUTHENTICATED
                */

                if (
                    res.status === 'authenticated'
                ) {

                    hideDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge connecting">' +
                        '<i class="fas fa-spinner fa-spin"></i> Connecting WhatsApp...' +
                        '</div>'
                    );

                    $('#qrBox')
                        .show()
                        .html(
                            '<div class="loading-text">Connecting...</div>'
                        );

                    return;
                }

                /*
                DISCONNECTED
                */

                if (
                    res.status === 'disconnected'
                ) {

                    hideDisconnectButton();

                    $('#statusBox').html(
                        '<div class="status-badge disconnected">' +
                        'Disconnected' +
                        '</div>'
                    );

                    $('#qrBox')
                        .show()
                        .html(
                            '<div class="loading-text">Reconnecting...</div>'
                        );

                    return;
                }

            },

            error: function () {

                isConnected = false;

                hideDisconnectButton();

                $('#statusBox').html(
                    '<div class="status-badge disconnected">' +
                    '<i class="fas fa-server"></i> Server Offline' +
                    '</div>'
                );

                $('#numberBox').html('');

                $('#qrBox')
                    .show()
                    .html(
                        '<div class="loading-text">Waiting for server...</div>'
                    );

            }

        });

    }

    /*
    =====================================
    DISCONNECT
    =====================================
    */

    $('#disconnectBtn').click(function () {

        if (!confirm('Disconnect WhatsApp?')) {
            return;
        }

        $('#disconnectBtn').prop('disabled', true);

        $.ajax({

            url:
                serverUrl +
                '/disconnect/' +
                schoolId,

            type: 'POST',

            success: function () {

                isConnected = false;

                hideDisconnectButton();

                $('#statusBox').html(
                    '<div class="status-badge disconnected">' +
                    'Disconnected Successfully' +
                    '</div>'
                );

                $('#numberBox').html('');

                $('#qrBox')
                    .show()
                    .html(
                        '<div class="loading-text">Restarting session...</div>'
                    );

                /*
                START AGAIN
                */

                setTimeout(function () {

                    startSession();

                }, 3000);

            },

            complete: function () {

                $('#disconnectBtn')
                    .prop('disabled', false);

            }

        });

    });

    /*
    =====================================
    INITIAL LOAD
    =====================================
    */

    hideDisconnectButton();

    loadStatus();

    /*
    =====================================
    AUTO REFRESH
    =====================================
    */

    setInterval(function () {

        loadStatus();

    }, 3000);

</script>

</body>

</html>