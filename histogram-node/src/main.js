// import * as d3 from "d3";
// import steam from "./steam.js";


// // console.log(data);
// steam();


import * as d3 from "d3";
import { renderChart } from "./user.js";
import steam from "./steam.js";
import csv from "./chart.csv";

// 调用 steam 的逻辑
steam();

// 渲染图表逻辑
document.addEventListener("DOMContentLoaded", () => {
    d3.csv(csv).then(data => {//
        renderChart("chart", data);
    }
    );

});
