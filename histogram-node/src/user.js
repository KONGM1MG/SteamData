export function renderChart(containerId, data) {
    const margin = { top: 40, right: 30, bottom: 30, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    data.forEach(d => {
        d.time = parseTime(d.time);
        d.players = +d.players;
    });
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.time))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.players)])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickSize(0).tickFormat(() => "")); // 隐藏横坐标的刻度和数字

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d3.format(".2s")(d)));

    const tooltip = d3.select(`#${containerId}`)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.3)")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("opacity", 0);

    svg.selectAll(".stick")
        .data(data)
        .enter().append("line")
        .attr("class", "stick")
        .attr("x1", d => xScale(d.time))
        .attr("y1", height)
        .attr("x2", d => xScale(d.time))
        .attr("y2", d => yScale(d.players))
        .attr("stroke", "#00aaff")
        .attr("stroke-width", 2)
        .on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                .style("opacity", 1)
                .html(`
                    <strong>时间:</strong> ${d3.timeFormat("%Y-%m-%d %H:%M")(d.time)}<br>
                    <strong>玩家数:</strong> ${(d.players / 1000000).toFixed(2)}M
                `);
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr("stroke", "#ff0")
                .attr("stroke-width", 4);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", (event) => {
            tooltip.style("display", "none")
                .style("opacity", 0);
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr("stroke", "#00aaff")
                .attr("stroke-width", 2);
        });

    const peakValue = d3.max(data, d => d.players);
    svg.append("line")
        .attr("class", "peak-line")
        .attr("x1", 0)
        .attr("y1", yScale(peakValue))
        .attr("x2", width)
        .attr("y2", yScale(peakValue))
        .attr("stroke", "#ff0000")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

    svg.append("text")
        .attr("x", width - 100)
        .attr("y", yScale(peakValue) - 10)
        .attr("fill", "#ff0000")
        .text(`峰值: ${(peakValue / 1000000).toFixed(2)}M`);
}