import * as d3 from "d3";
import worldData from "./world-countries.json";
import trafficData from "./download_traffic_per_country.json";
import top_asns from "./top_asns_per_country.json";


export default function steam() {
  // 基础设置
  const width = 900;
  const height = 450;
  const scale = 144;

  const projection = d3.geoEquirectangular()
    .scale(scale)
    .translate([width / 2, height / 2])
    .precision(0.4);

  const path = d3.geoPath().projection(projection);

  // 创建 SVG 元素
  const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "#f0f8ff");

  // 添加缩放功能
  const zoom = d3.zoom()
    .scaleExtent([1, 8]) // 设置缩放范围
    .translateExtent([[0, 0], [width, height]]) // 设置平移范围
    .on("zoom", zoomed);

  svg.call(zoom)
    .on("mousedown.zoom", null) // 禁用拖动功能
    .on("mousemove.zoom", null)
    .on("wheel", (event) => {
      event.preventDefault();
      zoom.scaleBy(svg.transition().duration(200), event.deltaY > 0 ? 1.1 : 0.9);
    });

  function zoomed(event) {
    svg.selectAll("path")
      .attr("transform", event.transform);
  }

  // 计算 totalbytes 和 avgmbps 的最小值和最大值
  const totalBytesValues = Object.values(trafficData).map(d => d.totalbytes);
  const SumTotalBytes = d3.sum(totalBytesValues);
  const avgMbpsValues = Object.values(trafficData).map(d => d.avgmbps);
  const minTotalBytes = d3.min(totalBytesValues);
  const maxTotalBytes = d3.max(totalBytesValues);
  const minAvgMbps = d3.min(avgMbpsValues);
  const maxAvgMbps = d3.max(avgMbpsValues);

  // 创建分段颜色比例尺
  const quantizeTotalBytes = d3.scaleQuantize()
    .domain([Math.sqrt(minTotalBytes), Math.sqrt(maxTotalBytes)])
    .range([
      '#e0f4ff', '#a8c9e7', '#8ab8d6', '#6a9bbd', '#4c7f9d', 
      '#3a6491', '#274c7f', '#1b3666', '#0f244d'  // 更深的蓝色范围
    ]);

  const quantizeAvgMbps = d3.scaleQuantize()
    .domain([Math.sqrt(minAvgMbps), Math.sqrt(maxAvgMbps)])
    .range([
      '#e0f4ff', '#a8c9e7', '#8ab8d6', '#6a9bbd', '#4c7f9d', 
      '#3a6491', '#274c7f', '#1b3666', '#0f244d'  // 更深的蓝色范围
    ]);
  // 绘制地图函数
  function drawMap(data, colorScale, key) {
    svg.selectAll("path").remove(); // 清空当前地图
    svg.append("g")
      .selectAll("path")
      .data(worldData.features)
      .enter().append("path")
      .attr("d", path)
      .attr("class", "country")
      .attr("fill", d => {
        const countryCode = d.id;
        const countryData = data[countryCode];
        return countryData ? colorScale(countryData) : "#ccc";
      })
      .attr("stroke", "#333") // 设置国家边界颜色
      .attr("stroke-width", 0.5) // 设置国家边界宽度
      .on("mouseover", function(event, d) {
        d3.select(this).style("fill", "#89adba");
        const countryCode = d.id;
        const countryData = data[countryCode];

        const value = countryData ? formatValue(countryData, key) : "No data";
        d3.select("#tooltip")
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px")
          .style("opacity", 1)
          .html(`${d.properties.name}<br>${key} ${value}`);
      })
      .on("mouseout", function() {
        d3.select(this).style("fill", "");
        d3.select("#tooltip").style("opacity", 0);
      })
      .on("click", function(event, d) {
        const countryCode = d.id;
        const countryData = data[countryCode];
        if (countryData) {
          const totalBytes = formatBytes(countryData.totalbytes);
          const avgMbps = formatMbps(countryData.avgmbps);
          const globalTrafficPercentage = (countryData.totalbytes / SumTotalBytes * 100).toFixed(1) + "%";
          d3.select("#country-info").html(`
            <h3>${LocalizeCountry(d)}</h3>
            <p>总计字节: ${totalBytes}</p>
            <p>平均下载速度: ${avgMbps}</p>
            <p>Steam 全球流量百分比: ${globalTrafficPercentage}</p>
          `);
        } else {
          d3.select("#country-info").html(`
            <h3>${d.properties.name}</h3>
            <p>No data available</p>
          `);
        }
        const asns = top_asns[countryCode];
        if (asns) {
          // 按平均下载速度降序排序并取前5个
          const topAsns = asns.sort((a, b) => b.avgmbps - a.avgmbps).slice(0, 5);
          // 设置图表的宽度和高度
          const width = 700;
          const height = 300;
          const barHeight = 30;

          let asnsHtml = `
            <h3>互联网服务提供商性能 Top 5</h3>
            <table>
              <thead>
                <tr>
                  <th>运营商</th>
                  <th>平均下载速度 (Mbps)</th>
                </tr>
              </thead>
              <tbody>
          `;

          topAsns.forEach((asn) => {
            asnsHtml += `
              <tr>
                <td>${asn.asname}</td>
                <td>${asn.avgmbps.toFixed(2)}</td>
              </tr>
            `;
          });

          asnsHtml += `
              </tbody>
            </table>
          `;

          asnsHtml += `
          </svg>
          `;
          d3.select("#asns-list").html(asnsHtml);
        } else {
          d3.select("#asns-list").html(`
            <h3>Top ASNs</h3>
            <p>No data available</p>
          `);
        }
      });

  }

  // 格式化显示的数值
  function formatValue(data, key) {
    if(key=="Total Bytes")
    {    
      if (data.totalbytes) {
        return formatBytes(data.totalbytes);
      }
    }
    else if(key=="Avg Mbps")
    {
      if (data.avgmbps) {
        return formatMbps(data.avgmbps);
      }
    }
    return "No data";
  }

  function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  function formatMbps(mbps) {
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps'];
    if (mbps === 0) return '0 Mbps';
    const i = parseInt(Math.floor(Math.log(mbps) / Math.log(1024)));
    return (mbps / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  var rgCountryLoc = {"AFG":"\u963f\u5bcc\u6c57","ALA":"\u5965\u5170\u5c9b","ALB":"\u963f\u5c14\u5df4\u5c3c\u4e9a","DZA":"\u963f\u5c14\u53ca\u5229\u4e9a","ASM":"\u7f8e\u5c5e\u8428\u6469\u4e9a","AND":"\u5b89\u9053\u5c14","AGO":"\u5b89\u54e5\u62c9","AIA":"\u5b89\u572d\u62c9","ATA":"\u5357\u6781\u6d32","ATG":"\u5b89\u63d0\u74dc\u548c\u5df4\u5e03\u8fbe","ARG":"\u963f\u6839\u5ef7","ARM":"\u4e9a\u7f8e\u5c3c\u4e9a","ABW":"\u963f\u9c81\u5df4","AUS":"\u6fb3\u5927\u5229\u4e9a","AUT":"\u5965\u5730\u5229","AZE":"\u963f\u585e\u62dc\u7586","BHS":"\u5df4\u54c8\u9a6c","BHR":"\u5df4\u6797","BGD":"\u5b5f\u52a0\u62c9\u56fd","BRB":"\u5df4\u5df4\u591a\u65af","BLR":"\u767d\u4fc4\u7f57\u65af","BEL":"\u6bd4\u5229\u65f6","BLZ":"\u4f2f\u5229\u5179","BEN":"\u8d1d\u5b81","BMU":"\u767e\u6155\u5927","BTN":"\u4e0d\u4e39","BOL":"\u73bb\u5229\u7ef4\u4e9a","BES":"BQ","BIH":"\u6ce2\u65af\u5c3c\u4e9a\u548c\u9ed1\u585e\u54e5\u7ef4\u90a3","BWA":"\u535a\u8328\u74e6\u7eb3","BVT":"\u5e03\u97e6\u5c9b","BRA":"\u5df4\u897f","IOT":"\u82f1\u5c5e\u5370\u5ea6\u6d0b\u9886\u5730","BRN":"\u6587\u83b1\u8fbe\u9c81\u8428\u5170\u56fd","BGR":"\u4fdd\u52a0\u5229\u4e9a","BFA":"\u5e03\u57fa\u7eb3\u6cd5\u7d22","BDI":"\u5e03\u9686\u8fea","KHM":"\u67ec\u57d4\u5be8","CMR":"\u5580\u9ea6\u9686","CAN":"\u52a0\u62ff\u5927","CPV":"\u4f5b\u5f97\u89d2","CYM":"\u5f00\u66fc\u7fa4\u5c9b","CAF":"\u4e2d\u975e\u5171\u548c\u56fd","TCD":"\u4e4d\u5f97","CHL":"\u667a\u5229","CHN":"\u4e2d\u56fd","CXR":"\u5723\u8bde\u5c9b","CCK":"\u79d1\u79d1\u65af\uff08\u57fa\u6797\uff09\u7fa4\u5c9b","COL":"\u54e5\u4f26\u6bd4\u4e9a","COM":"\u79d1\u6469\u7f57","COG":"\u521a\u679c\u5171\u548c\u56fd","COD":"\u521a\u679c\u6c11\u4e3b\u5171\u548c\u56fd","COK":"\u5e93\u514b\u7fa4\u5c9b","CRI":"\u54e5\u65af\u8fbe\u9ece\u52a0","CIV":"\u79d1\u7279\u8fea\u74e6","HRV":"\u514b\u7f57\u5730\u4e9a","CUB":"CU","CUW":"CW","CYP":"\u585e\u6d66\u8def\u65af","CZE":"\u6377\u514b\u5171\u548c\u56fd","DNK":"\u4e39\u9ea6","DJI":"\u5409\u5e03\u63d0","DMA":"\u591a\u7c73\u5c3c\u514b","DOM":"\u591a\u7c73\u5c3c\u52a0\u5171\u548c\u56fd","TMP":"\u4e1c\u5e1d\u6c76","ECU":"\u5384\u74dc\u591a\u5c14","EGY":"\u57c3\u53ca","SLV":"\u8428\u5c14\u74e6\u591a","GNQ":"\u8d64\u9053\u51e0\u5185\u4e9a","ERI":"\u5384\u7acb\u7279\u91cc\u4e9a","EST":"\u7231\u6c99\u5c3c\u4e9a","ETH":"\u57c3\u585e\u4fc4\u6bd4\u4e9a","FLK":"\u798f\u514b\u5170\u7fa4\u5c9b\uff08\u9a6c\u5c14\u7ef4\u7eb3\u65af\uff09","FRO":"\u6cd5\u7f57\u7fa4\u5c9b","FJI":"\u6590\u6d4e","FIN":"\u82ac\u5170","FRA":"\u6cd5\u56fd","FXX":"FX","GUF":"\u6cd5\u5c5e\u572d\u4e9a\u90a3","PYF":"\u6cd5\u5c5e\u6ce2\u5229\u5c3c\u897f\u4e9a","ATF":"\u6cd5\u5c5e\u5357\u90e8\u9886\u5730","GAB":"\u52a0\u84ec","GMB":"\u5188\u6bd4\u4e9a","GEO":"\u683c\u9c81\u5409\u4e9a","DEU":"\u5fb7\u56fd","GHA":"\u52a0\u7eb3","GIB":"\u76f4\u5e03\u7f57\u9640","GRC":"\u5e0c\u814a","GRL":"\u683c\u9675\u5170","GRD":"\u683c\u6797\u7eb3\u8fbe","GLP":"\u74dc\u5fb7\u7f57\u666e","GUM":"\u5173\u5c9b","GTM":"\u5371\u5730\u9a6c\u62c9","GGY":"\u6839\u897f","GIN":"\u51e0\u5185\u4e9a","GNB":"\u51e0\u5185\u4e9a\u6bd4\u7ecd","GUY":"\u572d\u4e9a\u90a3","HTI":"\u6d77\u5730","HMD":"\u8d6b\u5fb7\u548c\u9ea6\u514b\u5510\u7eb3\u7fa4\u5c9b","VAT":"\u68b5\u8482\u5188\u57ce\u56fd","HND":"\u6d2a\u90fd\u62c9\u65af","HKG":"\u9999\u6e2f","HUN":"\u5308\u7259\u5229","ISL":"\u51b0\u5c9b","IND":"\u5370\u5ea6","IDN":"\u5370\u5ea6\u5c3c\u897f\u4e9a","IRN":"\u4f0a\u6717","IRQ":"\u4f0a\u62c9\u514b","IRL":"\u7231\u5c14\u5170","IMN":"\u9a6c\u6069\u5c9b","ISR":"\u4ee5\u8272\u5217","ITA":"\u610f\u5927\u5229","JAM":"\u7259\u4e70\u52a0","JPN":"\u65e5\u672c","JEY":"\u6cfd\u897f\u5c9b","JOR":"\u7ea6\u65e6","KAZ":"\u54c8\u8428\u514b\u65af\u5766","KEN":"\u80af\u5c3c\u4e9a","KIR":"\u57fa\u91cc\u5df4\u65af","PRK":"KP","KOR":"\u97e9\u56fd","KOS":"XD","KWT":"\u79d1\u5a01\u7279","KGZ":"\u5409\u5c14\u5409\u65af\u65af\u5766","LAO":"\u8001\u631d","LVA":"\u62c9\u8131\u7ef4\u4e9a","LBN":"\u9ece\u5df4\u5ae9","LSO":"\u83b1\u7d22\u6258","LBR":"\u5229\u6bd4\u91cc\u4e9a","LBY":"\u5229\u6bd4\u4e9a","LIE":"\u5217\u652f\u6566\u58eb\u767b","LTU":"\u7acb\u9676\u5b9b","LUX":"\u5362\u68ee\u5821","MAC":"\u6fb3\u95e8","MKD":"\u5317\u9a6c\u5176\u987f","MDG":"\u9a6c\u8fbe\u52a0\u65af\u52a0","MWI":"\u9a6c\u62c9\u7ef4","MYS":"\u9a6c\u6765\u897f\u4e9a","MDV":"\u9a6c\u5c14\u4ee3\u592b","MLI":"\u9a6c\u91cc","MLT":"\u9a6c\u8033\u4ed6","MHL":"\u9a6c\u7ecd\u5c14\u7fa4\u5c9b","MTQ":"\u9a6c\u63d0\u5c3c\u514b","MRT":"\u6bdb\u91cc\u5854\u5c3c\u4e9a","MUS":"\u6bdb\u91cc\u6c42\u65af","MYT":"\u9a6c\u7ea6\u7279","MEX":"\u58a8\u897f\u54e5","FSM":"\u5bc6\u514b\u7f57\u5c3c\u897f\u4e9a\u8054\u90a6","MDA":"\u6469\u5c14\u591a\u74e6","MCO":"\u6469\u7eb3\u54e5","MNG":"\u8499\u53e4","MNE":"\u9ed1\u5c71","MSR":"\u8499\u7279\u585e\u62c9\u7279","MAR":"\u6469\u6d1b\u54e5","MOZ":"\u83ab\u6851\u6bd4\u514b","MMR":"\u7f05\u7538","NAM":"\u7eb3\u7c73\u6bd4\u4e9a","NRU":"\u7459\u9c81","NPL":"\u5c3c\u6cca\u5c14","NLD":"\u8377\u5170","ANT":"\u8377\u5c5e\u5b89\u7684\u5217\u65af","NCL":"\u65b0\u5580\u91cc\u591a\u5c3c\u4e9a","NZL":"\u65b0\u897f\u5170","NIC":"\u5c3c\u52a0\u62c9\u74dc","NER":"\u5c3c\u65e5\u5c14","NGA":"\u5c3c\u65e5\u5229\u4e9a","NIU":"\u7ebd\u57c3","NFK":"\u8bfa\u798f\u514b\u5c9b","MNP":"\u5317\u9a6c\u91cc\u4e9a\u7eb3\u7fa4\u5c9b","NOR":"\u632a\u5a01","OMN":"\u963f\u66fc","PSE":"\u5df4\u52d2\u65af\u5766","PAK":"\u5df4\u57fa\u65af\u5766","PLW":"\u5e15\u52b3","PAN":"\u5df4\u62ff\u9a6c","PNG":"\u5df4\u5e03\u4e9a\u65b0\u51e0\u5185\u4e9a","PRY":"\u5df4\u62c9\u572d","PER":"\u79d8\u9c81","PHL":"\u83f2\u5f8b\u5bbe","PCN":"\u76ae\u7279\u51ef\u6069\u7fa4\u5c9b","POL":"\u6ce2\u5170","PRT":"\u8461\u8404\u7259","PRI":"\u6ce2\u591a\u9ece\u5404","QAT":"\u5361\u5854\u5c14","REU":"\u7559\u5c3c\u6c6a","ROU":"\u7f57\u9a6c\u5c3c\u4e9a","RUS":"\u4fc4\u7f57\u65af\u8054\u90a6","RWA":"\u5362\u65fa\u8fbe","BLM":"BL","SHN":"\u5723\u8d6b\u52d2\u62ff","KNA":"\u5723\u57fa\u8328\u548c\u5c3c\u7ef4\u65af","LCA":"\u5723\u5362\u897f\u4e9a","MAF":"MF","VCT":"\u5723\u6587\u68ee\u7279\u548c\u683c\u6797\u7eb3\u4e01\u65af","WSM":"\u8428\u6469\u4e9a","SMR":"\u5723\u9a6c\u529b\u8bfa","STP":"\u5723\u591a\u7f8e\u548c\u666e\u6797\u897f\u6bd4","SAU":"\u6c99\u7279\u963f\u62c9\u4f2f","SEN":"\u585e\u5185\u52a0\u5c14","SRB":"\u585e\u5c14\u7ef4\u4e9a","SYC":"\u585e\u820c\u5c14","SLE":"\u585e\u62c9\u5229\u6602","SGP":"\u65b0\u52a0\u5761","SXM":"SX","SVK":"\u65af\u6d1b\u4f10\u514b","SVN":"\u65af\u6d1b\u6587\u5c3c\u4e9a","SLB":"\u6240\u7f57\u95e8\u7fa4\u5c9b","SOM":"\u7d22\u9a6c\u91cc","ZAF":"\u5357\u975e","SSD":"SS","SGS":"\u5357\u4e54\u6cbb\u4e9a\u548c\u5357\u6851\u5a01\u5947\u7fa4\u5c9b","ESP":"\u897f\u73ed\u7259","LKA":"\u65af\u91cc\u5170\u5361","SPM":"\u5723\u76ae\u57c3\u5c14\u548c\u5bc6\u514b\u9686","SDN":"\u82cf\u4e39","SUR":"\u82cf\u91cc\u5357","SJM":"\u65af\u74e6\u5c14\u5df4\u548c\u626c\u9a6c\u5ef6","SWZ":"\u65af\u5a01\u58eb\u5170","SWE":"\u745e\u5178","CHE":"\u745e\u58eb","SYR":"\u53d9\u5229\u4e9a","TWN":"\u53f0\u6e7e","TJK":"\u5854\u5409\u514b\u65af\u5766","TZA":"\u5766\u6851\u5c3c\u4e9a\u8054\u5408\u5171\u548c\u56fd","THA":"\u6cf0\u56fd","TGO":"\u591a\u54e5","TKL":"\u6258\u514b\u52b3","TON":"\u6c64\u52a0","TTO":"\u7279\u7acb\u5c3c\u8fbe\u548c\u591a\u5df4\u54e5","TUN":"\u7a81\u5c3c\u65af","TUR":"\u571f\u8033\u5176","TKM":"\u571f\u5e93\u66fc\u65af\u5766","TCA":"\u7279\u514b\u65af\u548c\u51ef\u79d1\u65af\u7fa4\u5c9b","TUV":"\u56fe\u74e6\u5362","UGA":"\u4e4c\u5e72\u8fbe","UKR":"\u4e4c\u514b\u5170","ARE":"\u963f\u62c9\u4f2f\u8054\u5408\u914b\u957f\u56fd","GBR":"\u82f1\u56fd","USA":"\u7f8e\u56fd","UMI":"\u7f8e\u56fd\u672c\u571f\u5916\u5c0f\u5c9b\u5c7f","URY":"\u4e4c\u62c9\u572d","UZB":"\u4e4c\u5179\u522b\u514b\u65af\u5766","VUT":"\u74e6\u52aa\u963f\u56fe","VEN":"\u59d4\u5185\u745e\u62c9","VNM":"\u8d8a\u5357","VGB":"\u82f1\u5c5e\u7ef4\u5c14\u4eac\u7fa4\u5c9b","VIR":"\u7f8e\u5c5e\u7ef4\u5c14\u4eac\u7fa4\u5c9b","WLF":"\u74e6\u5229\u65af\u548c\u5bcc\u56fe\u7eb3","ESH":"\u897f\u6492\u54c8\u62c9","YEM":"\u4e5f\u95e8","ZMB":"\u8d5e\u6bd4\u4e9a","ZWE":"\u6d25\u5df4\u5e03\u97e6","XCS":"\u4e2d\u56fd"}
  function LocalizeCountry( d )
  {
    if ( d.id in rgCountryLoc )
      return rgCountryLoc[d.id];
    else
      return d.properties.name;
  }

  // 创建 tooltip 元素
  d3.select("body").append("div")
    .attr("id", "tooltip")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // 默认显示 totalbytes 数据
  drawMap(trafficData, (d) => quantizeTotalBytes(Math.sqrt(d.totalbytes)), "Total Bytes");

// 创建超链接切换功能
d3.select("#show-total-bytes")
  .on("click", function(event) {
    event.preventDefault();
    drawMap(trafficData, (d) => quantizeTotalBytes(Math.sqrt(d.totalbytes)), "Total Bytes");
  });

d3.select("#show-avg-mbps")
  .on("click", function(event) {
    event.preventDefault();
    drawMap(trafficData, (d) => quantizeAvgMbps(Math.sqrt(d.avgmbps)), "Avg Mbps");
  });
}
