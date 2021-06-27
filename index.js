const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const express = require('express')
const exphbs = require('express-handlebars');

// DEV
const configFileDev = `${__dirname}/configs/dnsmasq.conf`;
const restartCmdDev = 'ls'; //I'm working on windows, so testing is not possible

// PROD
const configFileProd = '/etc/dnsmasq.conf';
const restartCmdProd = 'sudo systemctl restart dnsmasq.service';

var configFile;
var restartCmd;
if (process.env.NODE_ENV === 'production') {
    configFile = configFileProd;
    restartCmd = restartCmdProd;
} else {
    configFile = configFileDev;
    restartCmd = restartCmdDev;
}


const app = express()
const port = process.env.NODE_PORT || 5000

const hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: {
        'ifEquals': function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        }
    }
});

app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', __dirname + "/views");

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Routes ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


app.use('/public', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    var { mode, ip } = getCurrent();
    res.render('index', {
        mode, ip
    })
});

app.post('/switch', function (req, res) {
    var target = (req.body && req.body.target) || "";

    switch (target.toLowerCase()) {
        case "smartdns":
            setDNSConfig("smartdns");
            break;
        case "reset":
            setDNSConfig("default");
            break;
        default:
            break;
    }

    res.redirect("/");
});

app.get('/update', function (req, res) {
    var { mode, ip } = getInfos("smartdns");
    res.render('update', {
        mode, ip,
    })
});

app.post('/updatesmartdnsip', function (req, res) {
    var smartDnsIp = (req.body && req.body.smartdnsip) || "";

    if (smartDnsIp) {
        updateSmartDNSIp(smartDnsIp);
    }
    res.redirect("/update");
});

app.listen(port, () => {
    console.log(`DNS Switcher listening at http://localhost:${port}`)
    if (!process.env.NODE_ENV) {
        console.log(`Environment: not set, defaulting to development`)
    } else {
        console.log(`Environment: ${process.env.NODE_ENV}`)
    }
})

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DNS Functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function getCurrent() {
    return getInfos();
}

function getInfos(mode) {
    var config = fs.readFileSync(`${configFile}${mode ? '_' + mode : ''}`, 'utf8')
    var mode = config.includes("#smartdns") ? 'smartdns' : 'default';
    var ip = /#\/(.*)/.exec(config)[1];
    return { mode, ip };
}

function setDNSConfig(mode) {
    var file = `${configFile}_${mode}`;
    fs.copyFileSync(file, configFile);

    // Restart
    execSync(restartCmd, { stdio: 'inherit' });
}

function updateSmartDNSIp(smartDnsIp) {
    var file = `${configFile}_smartdns`;
    var smartDnsConfig = fs.readFileSync(file, "utf8");
    smartDnsConfig = smartDnsConfig.replace(/#\/(.*)/, `#/${smartDnsIp}`)
    fs.writeFileSync(file, smartDnsConfig);
}
