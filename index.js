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
    await fetch();
}, (1000 * 60 * 5));

if (fs.existsSync(UPDATES_FILE)) {
    doorUpdates = JSON.parse(fs.readFileSync(UPDATES_FILE));
}

cron.schedule("0 0 * * *", () => {
    doorUpdates = [];
    fs.writeFileSync(UPDATES_FILE, JSON.stringify(doorUpdates));
}, { timezone: "America/Chicago" });

async function fetch() {
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
        await fetch();
    }

    res.json(doorState);
});

app.post("/fetch", async (req, res) => {
    await fetch();
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