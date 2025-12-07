require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");


const app = express();
const PORT = process.env.PORT || 3500;
const apiUrl = process.env.API_URL;
const token = process.env.TOKEN;

let doorState = undefined;

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

        doorState = doorReturn;
    } catch {
        console.log("Error when fetching")
    }
}

app.use(cors());

app.get("/door-status", async (req, res) => {
    if (doorState === undefined) {
        await fetch();
    }

    res.json(doorState);
});

app.get("/fetch", async (req, res) => {
    await fetch();
    res.send().status(200)
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