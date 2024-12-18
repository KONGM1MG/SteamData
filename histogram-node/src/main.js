// import * as d3 from "d3";
// import steam from "./steam.js";


// // console.log(data);
// steam();


import * as d3 from "d3";
import { renderChart } from "./user.js";
import steam from "./steam.js";

// 调用 steam 的逻辑
steam();

// 渲染图表逻辑
document.addEventListener("DOMContentLoaded", () => {
    const startTime = new Date("2024-12-13T00:00:00");
    const endTime = new Date("2024-12-16T00:00:00");
    const filePath = "chart.csv"; // 数据文件路径

    // 渲染图表到指定容器
    renderChart("chart");
});
