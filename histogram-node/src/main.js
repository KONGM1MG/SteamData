import * as d3 from "d3";
import { renderChart } from "./user.js";
import steam from "./steam.js";
import csv from "./assets/chart.csv";

steam();

document.addEventListener("DOMContentLoaded", () => {
    d3.csv(csv).then(data => {//
        renderChart("chart", data);
    }
    );

});
