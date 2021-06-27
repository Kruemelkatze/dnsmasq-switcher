# dnsmasq-switcher

This web application is part of a system to dynamically enable/disable SmartDNS for devices on your network. I got tired of changing the DNS settings of my TV (does not allow to install VPN apps) manually in order to watch Netflix US. This system now allows me to switch the TV's netflix location via a button press on my phone.

The system is a proof of concept, but it basically works. The basic concept is:

-   A Linux host (in my case a Raspberry Pi 3 B+) that runs a DNS server (_dnsmasq_) for your local network.
-   The devices in your network use the local DNS server instead of your router (or whatever you set).
-   The local DNS server redirects all DNS queries to either a standard DNS server (1.1.1.1) or a SmartDNS server (you get the IP from your VPN provider).
-   The web app in this repository is used to easily switch between those two DNS modes.

## FAQ

### What can I do with it?

Enable/Disable SmartDNS on other/multiple devices via a button click. SmartDNS allows to bypass geolocking.

### Why can't I just use a VPN on my device?

On most smart TVs, you can't install VPN apps. For phones and computers, you don't need this system.

### Why can't I use a network-wide VPN via a gateway?

This was my initial idea and is much more common and easy. But this way, you can only enable/disable the VPN for your whole network, re-routing all network traffic of all devices. But I want to watch US series on the TV while also gaming without VPN.

### What do I need for SmartDNS?

You need a SmartDNS ip that is bound to your own public IPv4 address. Your VPN provider (I use _Surfshark_) most likely has a page or tutorial for this.

### It looks complicated.

It certainly is, but it works.

### Your linux game is terrible.

I know. Feel free to adapt it. :-)

## Setup

You need a linux host with internet access in your network that will act as DNS. I use a Raspberry for this. The following setup steps must be done on that host.

As said, this app is just the switching portion of the whole system. You also need to setup the _dnsmasq_ service including rules for restarting it without pw prompt.

Be sure to replace **USER** in the following steps with your user.

### Set a static IP on your DNS host

There are plenty of tutorials on this which describe it better than I can. :-)

### Clone the repository

```bash
cd ~
git clone https://github.com/Kruemelkatze/dnsmasq-switcher.git
```

The following steps assume the repository to be under `~/dnsmasq-switcher`.

### _dnsmasq_ setup

1. Install

    ```bash
    sudo apt install dnsutils
    ```

2. Backup the existing _dnsmasq_ config.

    ```bash
    sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf_bkp
    ```

3. Copy the [configs](configs) from the repository to `/etc/dnsmasq.conf`. Override the existing conf file if not moved before.

    ````bash
    sudo cp ~/dnsmasq-switcher/configs/* /etc/```
    ````

4. Set the SmartDNS ip in `dnsmasq.conf_smartdns`

5. Set user and group ownerships of config files.

    ```
    sudo chown USER /etc/dnsmasq.conf*
    sudo chrp USER /etc/dnsmasq.conf*
    ```

6. Allow user to restart _dnsmasq_ without PW prompt by adding this to the _sudoers_ file.

    ```bash
    sudu visudo
    ```

    Add this line (be sure to replace USER):

    ```conf
    %USER     ALL=NOPASSWD:/usr/bin/systemctl reload dnsmasq.service
    ```

7. Reboot

### Web application setup

1. Install nodejs (I used NVM). They have great tutorials on this.

2. Install dependencies of app

    ```bash
    cd ~/dnsmasq-switcher
    npm i
    ```

3. Set node env to production, just to be sure.

    ```bash
    sudo export NODE_ENV=production
    ```

4. Test-start the application.

    ```bash
        node index.js
    ```

    The output should be like this:

    ```bash
    USER@raspberrypi:~/dnsmasq-switcher $ node index.js
    DNS Switcher listening at http://localhost:5000
    Environment: production
    ```

    Stop it again.

5. Create systemd file to automatically start it after booting.

    ```bash
        sudo nano /lib/systemd/system/dnsmasq-switcher.service
    ```

    File content. Be sure to replace NODEPATH with the path returned by `whereis node`.

    ```conf
        [Unit]
        Description=DNS Switcher for SmartDNS
        After=network.target

        [Service]
        Environment=NODE_PORT=5000
        Environment=NODE_ENV=production
        Type=simple
        User=pi
        ExecStart=NODEPATH /home/USER/dnsmasq-switcher/index.js
        Restart=on-failure

        [Install]
        WantedBy=multi-user.target
    ```

6. Enable service and start it
    ```bash
    systemctl daemon-reload
    sudo systemctl enable dnsmasq-switcher
    sudo systemctl restart dnsmasq-switcher
    ```

### Set DNS on your devices

Set the DNS IP on your devices to the (static) IP of your new DNS server.

You can then browse to [http://DNSHOST:5000](http://DNSHOST:5000) and switch between default and SmartDNS modes.

You can **update the SmartDNS ip** via the form at [http://DNSHOST:5000/update](http://DNSHOST:5000/update). You have to switch the mode afterwards for it to work.

[<img width="300" alt="DNS switching app on phone" src="public/phone_img.jpg"/>](public/phone_img.jpg)


