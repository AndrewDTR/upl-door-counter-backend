require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cron = require("node-cron");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3500;
const apiUrl = process.env.API_URL;
const token = process.env.TOKEN;

let doorState = undefined;
let doorUpdates = [];
const UPDATES_FILE = "doorUpdates.json";


// manually check every 5 mins
setInterval(async () => {
    await doorFetch();
}, (1000 * 60 * 5));

if (fs.existsSync(UPDATES_FILE)) {
    doorUpdates = JSON.parse(fs.readFileSync(UPDATES_FILE));
    if (doorUpdates.length > 0) {
        doorState = doorUpdates[doorUpdates.length - 1];
    }
}

cron.schedule("0 0 * * *", async () => {
    doorUpdates = [];
    doorState = undefined;
    fs.writeFileSync(UPDATES_FILE, JSON.stringify(doorUpdates));
    await doorFetch();
}, { timezone: "America/Chicago" });

cron.schedule("59 23 * * *", async () => {
    await fetch("https://printer.amoses.dev/upl")
}, { timezone: "America/Chicago" });

async function doorFetch() {
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: token,
            },
        });

        const data = response.data;

        // grab the items with the appropriate HA entity ids
        const door = data.filter(
            (item) =>
                item.entity_id === "binary_sensor.door"
        )[0];

        const doorStatus = (door.state === "off" ? "closed" : "open")

        const doorReturn =
        {
            status: doorStatus,
            last_updated: door.last_updated
        }

        if (doorState?.status !== doorReturn?.status) {
            doorUpdates.push(doorReturn);
            fs.writeFileSync(UPDATES_FILE, JSON.stringify(doorUpdates));
        }

        doorState = doorReturn;
    } catch {
        console.log("Error when fetching");
        doorState = undefined;
    }
}

app.use(cors());

app.get("/door-status", async (req, res) => {
    if (doorState === undefined) {
        await doorFetch();
    }

    res.json(doorState);
});

app.post("/fetch", async (req, res) => {
    await doorFetch();
    res.sendStatus(200);
});

app.get("/day", async (req, res) => {
    res.json(doorUpdates);
});

// :P
app.get("/", async (req, res) => {
    res
        .status(200)
        .send("<html><body><b>wow upl door status endpoint 443</b></body></html>");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});