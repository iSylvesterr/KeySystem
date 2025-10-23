const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

function readConfig() {
    try {
        const data = fs.readFileSync('./config.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { scriptUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/script.lua' };
    }
}

function readKeys() {
    try {
        const data = fs.readFileSync('./keys.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function writeKeys(keys) {
    fs.writeFileSync('./keys.json', JSON.stringify(keys, null, 2));
}

app.get('/check', (req, res) => {
    const { key, hwid } = req.query;

    if (!key || !hwid) {
        return res.json({
            ok: false,
            msg: 'Missing key or hwid parameter'
        });
    }

    const keys = readKeys();

    if (!keys[key]) {
        return res.json({
            ok: false,
            msg: 'Invalid key'
        });
    }

    const keyData = keys[key];

    if (!keyData.redeemed) {
        return res.json({
            ok: false,
            msg: 'Key not redeemed yet'
        });
    }

    const config = readConfig();

    if (keyData.reset_hwid) {
        keys[key].hwid = hwid;
        keys[key].reset_hwid = false;
        writeKeys(keys);

        return res.json({
            ok: true,
            msg: 'HWID registered after reset',
            script_url: config.scriptUrl
        });
    }

    if (keyData.hwid === '') {
        keys[key].hwid = hwid;
        keys[key].reset_hwid = false;
        writeKeys(keys);

        return res.json({
            ok: true,
            msg: 'HWID registered',
            script_url: config.scriptUrl
        });
    }

    if (keyData.hwid !== hwid) {
        return res.json({
            ok: false,
            msg: 'HWID mismatch'
        });
    }

    return res.json({
        ok: true,
        msg: 'Key valid',
        script_url: config.scriptUrl
    });
});

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'iSylHub Premium Key System API',
        endpoints: {
            check: '/check?key=YOUR_KEY&hwid=YOUR_HWID'
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Express server running on port ${PORT}`);
    console.log(`📡 API Endpoint: http://0.0.0.0:${PORT}/check`);
});
