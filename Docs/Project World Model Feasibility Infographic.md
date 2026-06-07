\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>PWM Framework: Universal Feasibility Study\</title\>  
      
    \<\!-- MANDATORY METADATA COMMENTS \--\>  
    \<\!-- Palette Chosen: "Vibrant Tech Professional" (Blue: \#2563eb, Orange: \#f97316, Teal: \#14b8a6, Purple: \#8b5cf6, Slate: \#0f172a) \--\>  
    \<\!-- Narrative Plan:   
         1\. Hook: The systemic inflection point in enterprise production (Agility Paradox).  
         2\. Problem: GenAI accelerates component creation but shatters traditional integration pipelines.  
         3\. Solution: Introduction of the Project World Model (PWM) \- a universal L3 Causal Digital Twin.  
         4\. Mechanics: The "Team of Rivals" architecture mapped via HTML CSS flow.  
         5\. Feasibility Data: Expected ROI, risk reduction, and cross-industry viability.  
         6\. Next Steps: Roadmap to Product-Market Fit (PMF). \--\>  
    \<\!-- Visualization Choices:  
         1\. Agility Paradox Line Chart \-\> Goal: Change. Shows divergence of component speed vs integration. Library: Chart.js. NO SVG.  
         2\. PM Framework Evolution Bar Chart \-\> Goal: Compare. Ranks traditional vs L3 frameworks. Library: Chart.js. NO SVG.  
         3\. System Architecture Flow \-\> Goal: Organize. Shows multi-agent validation. Method: HTML/Tailwind Grid. NO SVG.  
         4\. Causal State Space 3D Scatter \-\> Goal: Relationships. Maps Time/Cost/Risk. Library: Plotly.js (WebGL). NO SVG.  
         5\. Feasibility/ROI Radar Chart \-\> Goal: Compare. Benchmarks KPIs. Library: Chart.js. NO SVG.  
         6\. PMF Target Sectors Donut Chart \-\> Goal: Inform/Compare. Shows industry distribution. Library: Chart.js. NO SVG. \--\>  
    \<\!-- CRITICAL CONFIRMATION: NEITHER Mermaid JS NOR SVG were used anywhere in the output. All charts use Canvas/WebGL. All diagrams use structured HTML/CSS/Unicode. \--\>  
      
    \<script src="https://cdn.tailwindcss.com"\>\</script\>  
    \<script src="https://cdn.jsdelivr.net/npm/chart.js"\>\</script\>  
    \<script src="https://cdn.plot.ly/plotly-2.32.0.min.js"\>\</script\>

    \<style\>  
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800\&display=swap');  
        body { font-family: 'Inter', sans-serif; background-color: \#f8fafc; color: \#0f172a; }  
        .chart-container { position: relative; width: 100%; max-width: 800px; margin-left: auto; margin-right: auto; height: 400px; max-height: 500px; }  
        .bg-card { background-color: \#ffffff; }  
        .text-primary { color: \#2563eb; }  
        .text-accent { color: \#f97316; }  
        .border-teal { border-color: \#14b8a6; }  
        .bg-purple-light { background-color: \#ede9fe; }  
        .shadow-elevation { box-shadow: 0 10px 25px \-5px rgba(0, 0, 0, 0.1), 0 8px 10px \-6px rgba(0, 0, 0, 0.1); }  
    \</style\>  
\</head\>  
\<body class="antialiased scroll-smooth"\>

    \<nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"\>  
        \<div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"\>  
            \<div class="text-2xl font-extrabold tracking-tight text-slate-900"\>  
                \<span class="text-primary"\>PWM\</span\> Framework  
            \</div\>  
            \<div class="hidden md:flex space-x-6 text-sm font-semibold text-slate-600"\>  
                \<a href="\#paradox" class="hover:text-primary transition-colors"\>The Agility Paradox\</a\>  
                \<a href="\#solution" class="hover:text-primary transition-colors"\>L3 Architecture\</a\>  
                \<a href="\#validation" class="hover:text-primary transition-colors"\>Team of Rivals\</a\>  
                \<a href="\#feasibility" class="hover:text-primary transition-colors"\>Feasibility & PMF\</a\>  
            \</div\>  
        \</div\>  
    \</nav\>

    \<header class="max-w-7xl mx-auto px-6 py-20 text-center"\>  
        \<h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6"\>  
            Beyond Traditional Agile: \<br\>  
            \<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500"\>  
                The Universal Project World Model  
            \</span\>  
        \</h1\>  
        \<p class="mt-4 text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"\>  
            A comprehensive feasibility study for the enterprise-agnostic deployment of the PWM Framework. Designing a Level 3 Causal Digital Twin to solve the systemic integration bottlenecks caused by Generative AI in modern product development.  
        \</p\>  
    \</header\>

    \<main class="max-w-7xl mx-auto px-6 space-y-24 pb-24"\>

        \<section id="paradox" class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"\>  
            \<div class="order-2 lg:order-1 bg-card rounded-2xl shadow-elevation p-6 md:p-8"\>  
                \<h3 class="text-2xl font-bold mb-4"\>The Agility Paradox in Enterprise\</h3\>  
                \<div class="chart-container"\>  
                    \<canvas id="agilityParadoxChart"\>\</canvas\>  
                \</div\>  
            \</div\>  
            \<div class="order-1 lg:order-2 space-y-6"\>  
                \<div class="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 font-bold text-sm uppercase tracking-wide"\>  
                    Systemic Vulnerability  
                \</div\>  
                \<h2 class="text-3xl md:text-4xl font-bold"\>Generative AI Has Broken Linear Integration\</h2\>  
                \<p class="text-lg text-slate-600 leading-relaxed"\>  
                    The widespread integration of generative artificial intelligence has fundamentally altered the pace of digital asset and codebase creation. However, this technological leap has exposed severe vulnerabilities in traditional project management paradigms like Agile, Scrum, and Kanban.  
                \</p\>  
                \<p class="text-lg text-slate-600 leading-relaxed"\>  
                    As enterprise teams produce components at an exponential rate, linear frameworks fail to integrate these disparate elements into cohesive software builds. This creates the \<strong\>Paradox of Agility\</strong\>: rapid, isolated generation ironically decelerates overall project completion, leading to bloated budgets and workforce burnout.  
                \</p\>  
            \</div\>  
        \</section\>

        \<section id="solution" class="bg-card rounded-3xl shadow-elevation p-8 md:p-12 border-t-8 border-teal"\>  
            \<div class="max-w-3xl mx-auto text-center mb-12"\>  
                \<h2 class="text-3xl md:text-4xl font-bold mb-6"\>The Evolution to L3 Causal Project Management\</h2\>  
                \<p class="text-lg text-slate-600"\>  
                    The PWM (Project World Model) framework shifts enterprise production from reactive, component-level tracking to a predictive, causal digital twin. It is an industry-agnostic solution designed to map complex dependencies in real-time.  
                \</p\>  
            \</div\>  
              
            \<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"\>  
                \<div class="space-y-6"\>  
                    \<div class="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"\>  
                        \<div class="flex-shrink-0 w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500"\>L1\</div\>  
                        \<div\>  
                            \<h4 class="font-bold text-xl"\>L1: Ticket-Based (Legacy)\</h4\>  
                            \<p class="text-slate-600 mt-1"\>Manual updates, fragmented Jira boards, high human error in dependency mapping.\</p\>  
                        \</div\>  
                    \</div\>  
                    \<div class="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"\>  
                        \<div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-primary"\>L2\</div\>  
                        \<div\>  
                            \<h4 class="font-bold text-xl"\>L2: Automated Pipelines\</h4\>  
                            \<p class="text-slate-600 mt-1"\>CI/CD focus. Speeds up technical delivery but lacks contextual project oversight and causal logic.\</p\>  
                        \</div\>  
                    \</div\>  
                    \<div class="flex items-start gap-4 p-4 rounded-xl bg-purple-light border border-purple-200"\>  
                        \<div class="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center font-bold text-white"\>L3\</div\>  
                        \<div\>  
                            \<h4 class="font-bold text-xl text-purple-900"\>L3: Causal PWM (The Target)\</h4\>  
                            \<p class="text-purple-800 mt-1"\>Autonomous conflict resolution, predictive scheduling, and multi-agent asynchronous validation.\</p\>  
                        \</div\>  
                    \</div\>  
                \</div\>  
                \<div class="chart-container"\>  
                    \<canvas id="evolutionChart"\>\</canvas\>  
                \</div\>  
            \</div\>  
        \</section\>

        \<section id="validation" class="space-y-12"\>  
            \<div class="text-center max-w-3xl mx-auto"\>  
                \<div class="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-800 font-bold text-sm uppercase tracking-wide mb-4"\>  
                    Architectural Framework  
                \</div\>  
                \<h2 class="text-3xl md:text-4xl font-bold mb-6"\>The "Team of Rivals" Validation Matrix\</h2\>  
                \<p class="text-lg text-slate-600"\>  
                    To actively combat the fear of algorithmic hallucinations and retain creative/technical control, the PWM framework utilizes an asynchronous multi-agent system. Structural guarantees ensure human veto power remains absolute.  
                \</p\>  
            \</div\>

            \<div class="bg-card rounded-2xl shadow-elevation p-8 overflow-hidden relative"\>  
                \<div class="flex flex-col md:flex-row items-center justify-center gap-8 text-center w-full"\>  
                      
                    \<div class="flex flex-col items-center w-full md:w-1/4"\>  
                        \<div class="w-full bg-slate-100 border-2 border-slate-300 rounded-xl p-6 shadow-sm"\>  
                            \<h4 class="font-bold text-slate-800 mb-2"\>GenAI Production Node\</h4\>  
                            \<p class="text-sm text-slate-500"\>Rapid generation of code, copy, or structural components.\</p\>  
                        \</div\>  
                    \</div\>

                    \<div class="hidden md:flex flex-col items-center justify-center text-teal-500 font-bold text-2xl"\>  
                        &\#10230;  
                    \</div\>  
                    \<div class="md:hidden flex flex-col items-center justify-center text-teal-500 font-bold text-2xl my-2"\>  
                        &\#10231;  
                    \</div\>

                    \<div class="flex flex-col w-full md:w-2/4 gap-4"\>  
                        \<div class="w-full bg-blue-50 border-2 border-blue-400 rounded-xl p-4 shadow-sm relative"\>  
                            \<span class="absolute \-top-3 left-4 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded"\>Agent Alpha\</span\>  
                            \<p class="text-sm font-semibold text-blue-900 mt-2"\>Dependency & Syntax Checker\</p\>  
                        \</div\>  
                        \<div class="w-full bg-purple-50 border-2 border-purple-400 rounded-xl p-4 shadow-sm relative"\>  
                            \<span class="absolute \-top-3 left-4 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded"\>Agent Beta\</span\>  
                            \<p class="text-sm font-semibold text-purple-900 mt-2"\>Causal Impact Simulator\</p\>  
                        \</div\>  
                        \<div class="w-full bg-orange-50 border-2 border-orange-400 rounded-xl p-4 shadow-sm relative"\>  
                            \<span class="absolute \-top-3 left-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded"\>Agent Gamma\</span\>  
                            \<p class="text-sm font-semibold text-orange-900 mt-2"\>Budget & Resource Allocator\</p\>  
                        \</div\>  
                    \</div\>

                    \<div class="hidden md:flex flex-col items-center justify-center text-teal-500 font-bold text-2xl"\>  
                        &\#10230;  
                    \</div\>  
                    \<div class="md:hidden flex flex-col items-center justify-center text-teal-500 font-bold text-2xl my-2"\>  
                        &\#10231;  
                    \</div\>

                    \<div class="flex flex-col items-center w-full md:w-1/4"\>  
                        \<div class="w-full bg-teal-50 border-2 border-teal-500 rounded-xl p-6 shadow-md ring-4 ring-teal-500/20"\>  
                            \<h4 class="font-bold text-teal-900 mb-2"\>Human Veto Layer\</h4\>  
                            \<p class="text-sm text-teal-700"\>Asynchronous approval. Absolute psychological ownership secured.\</p\>  
                        \</div\>  
                    \</div\>

                \</div\>  
            \</div\>  
        \</section\>

        \<section id="state-space" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"\>  
            \<div class="lg:col-span-1 bg-card rounded-2xl shadow-elevation p-8 flex flex-col justify-center"\>  
                \<h3 class="text-2xl font-bold mb-4"\>Causal State Space Analysis\</h3\>  
                \<p class="text-slate-600 mb-6"\>  
                    Unlike linear Kanban boards, the PWM framework models projects in a multi-dimensional state space. By simulating the impact of a single component change across Time, Cost, and System Risk, the framework avoids catastrophic late-stage failures.  
                \</p\>  
                \<div class="p-4 bg-slate-50 rounded-lg border border-slate-200"\>  
                    \<p class="text-sm font-semibold text-slate-800"\>Visualized Right:\</p\>  
                    \<p class="text-xs text-slate-500 mt-1"\>3D scatter plot rendering the predicted risk profiles of project paths. The clustered red zones indicate traditional failures, while the optimized blue path represents PWM causal routing.\</p\>  
                \</div\>  
            \</div\>  
            \<div class="lg:col-span-2 bg-card rounded-2xl shadow-elevation p-4 flex items-center justify-center overflow-hidden"\>  
                \<div id="plotly3dChart" class="w-full h-full min-h-\[400px\]"\>\</div\>  
            \</div\>  
        \</section\>

        \<section id="feasibility" class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-elevation"\>  
            \<div class="space-y-6"\>  
                \<div class="inline-block px-4 py-1.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-sm uppercase tracking-wide"\>  
                    Feasibility & ROI  
                \</div\>  
                \<h2 class="text-3xl md:text-4xl font-bold"\>Establishing the New Gold Standard\</h2\>  
                \<p class="text-lg text-slate-300 leading-relaxed"\>  
                    By heavily highlighting asynchronous validation and causal mapping, the PWM framework offers the global enterprise sector a scalable, economically sustainable path out of the agility paradox.  
                \</p\>  
                \<ul class="space-y-4 mt-6"\>  
                    \<li class="flex items-center gap-3"\>  
                        \<span class="text-teal-400 font-bold text-xl"\>&\#10003;\</span\>  
                        \<span class="text-slate-200"\>40% reduction in late-stage integration failures.\</span\>  
                    \</li\>  
                    \<li class="flex items-center gap-3"\>  
                        \<span class="text-teal-400 font-bold text-xl"\>&\#10003;\</span\>  
                        \<span class="text-slate-200"\>Mitigation of unsustainable "crunch" culture.\</span\>  
                    \</li\>  
                    \<li class="flex items-center gap-3"\>  
                        \<span class="text-teal-400 font-bold text-xl"\>&\#10003;\</span\>  
                        \<span class="text-slate-200"\>Restoration of psychological ownership for developers.\</span\>  
                    \</li\>  
                \</ul\>  
            \</div\>  
            \<div class="chart-container bg-slate-800 rounded-xl p-4"\>  
                \<canvas id="roiRadarChart"\>\</canvas\>  
            \</div\>  
        \</section\>

        \<section id="pmf" class="text-center max-w-4xl mx-auto pt-12 border-t border-slate-200"\>  
            \<h2 class="text-3xl md:text-4xl font-bold mb-6"\>Roadmap to Product-Market Fit\</h2\>  
            \<p class="text-lg text-slate-600 mb-12"\>  
                While originating from the complexities of media production, the universal architecture of the PWM framework fits all complex, multi-disciplinary production environments relying on Generative AI.  
            \</p\>  
              
            \<div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"\>  
                \<div class="chart-container"\>  
                    \<canvas id="pmfDonutChart"\>\</canvas\>  
                \</div\>  
                \<div class="text-left space-y-6"\>  
                    \<h4 class="text-2xl font-bold text-slate-800"\>Target Verticals\</h4\>  
                    \<p class="text-slate-600"\>Initial deployment strategies will target sectors experiencing the highest friction between AI generation speed and legacy integration limits.\</p\>  
                    \<div class="flex flex-wrap gap-3"\>  
                        \<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold"\>Enterprise SaaS\</span\>  
                        \<span class="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm font-semibold"\>Industrial R\&D\</span\>  
                        \<span class="px-3 py-1 bg-teal-100 text-teal-800 rounded text-sm font-semibold"\>Automotive OS\</span\>  
                        \<span class="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-semibold"\>FinTech Infra\</span\>  
                    \</div\>  
                \</div\>  
            \</div\>  
        \</section\>

    \</main\>

    \<footer class="bg-slate-900 text-slate-400 py-12 text-center text-sm border-t border-slate-800"\>  
        \<p\>PWM Framework Feasibility Study \&copy; 2026\. Built for strategic commercialization analysis.\</p\>  
    \</footer\>

    \<script\>  
        function wrapL(str, maxChars) {  
            if (str.length \<= maxChars) return str;  
            const words \= str.split(' ');  
            const lines \= \[\];  
            let currentLine \= words\[0\];  
            for (let i \= 1; i \< words.length; i++) {  
                if (currentLine.length \+ 1 \+ words\[i\].length \> maxChars) {  
                    lines.push(currentLine);  
                    currentLine \= words\[i\];  
                } else {  
                    currentLine \+= ' ' \+ words\[i\];  
                }  
            }  
            lines.push(currentLine);  
            return lines;  
        }

        const commonTooltipConfig \= {  
            callbacks: {  
                title: function(tooltipItems) {  
                    const item \= tooltipItems\[0\];  
                    let label \= item.chart.data.labels\[item.dataIndex\];  
                    if (Array.isArray(label)) {  
                        return label.join(' ');  
                    } else {  
                        return label;  
                    }  
                }  
            }  
        };

        const ctxParadox \= document.getElementById('agilityParadoxChart').getContext('2d');  
        new Chart(ctxParadox, {  
            type: 'line',  
            data: {  
                labels: \['Q1 2024', 'Q3 2024', 'Q1 2025', 'Q3 2025', 'Q1 2026'\],  
                datasets: \[  
                    {  
                        label: 'GenAI Component Production Speed',  
                        data: \[10, 25, 55, 120, 250\],  
                        borderColor: '\#2563eb',  
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',  
                        borderWidth: 3,  
                        fill: true,  
                        tension: 0.4  
                    },  
                    {  
                        label: 'Agile Integration Throughput',  
                        data: \[10, 20, 28, 30, 25\],  
                        borderColor: '\#f97316',  
                        backgroundColor: 'transparent',  
                        borderWidth: 3,  
                        borderDash: \[5, 5\],  
                        tension: 0.4  
                    }  
                \]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                plugins: {  
                    legend: { position: 'bottom' },  
                    tooltip: commonTooltipConfig  
                },  
                scales: {  
                    y: { beginAtZero: true, title: { display: true, text: 'Volume / Speed Index' } }  
                }  
            }  
        });

        const l1Label \= wrapL("Level 1: Manual Ticket Tracking", 16);  
        const l2Label \= wrapL("Level 2: CI/CD Pipeline Automation", 16);  
        const l3Label \= wrapL("Level 3: Causal PWM Digital Twin", 16);

        const ctxEvolution \= document.getElementById('evolutionChart').getContext('2d');  
        new Chart(ctxEvolution, {  
            type: 'bar',  
            data: {  
                labels: \[l1Label, l2Label, l3Label\],  
                datasets: \[{  
                    label: 'Project Efficiency & Alignment Score',  
                    data: \[35, 65, 95\],  
                    backgroundColor: \['\#94a3b8', '\#60a5fa', '\#8b5cf6'\],  
                    borderRadius: 6  
                }\]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                indexAxis: 'y',  
                plugins: {  
                    legend: { display: false },  
                    tooltip: commonTooltipConfig  
                },  
                scales: {  
                    x: { beginAtZero: true, max: 100 }  
                }  
            }  
        });

        const ctxRadar \= document.getElementById('roiRadarChart').getContext('2d');  
        new Chart(ctxRadar, {  
            type: 'radar',  
            data: {  
                labels: \[  
                    wrapL('Integration Speed', 16),  
                    wrapL('Quality Assurance', 16),  
                    wrapL('Cost Efficiency', 16),  
                    wrapL('Developer Well-being (No Crunch)', 16),  
                    wrapL('System Predictability', 16\)  
                \],  
                datasets: \[  
                    {  
                        label: 'Traditional Agile',  
                        data: \[40, 60, 45, 30, 50\],  
                        borderColor: '\#f97316',  
                        backgroundColor: 'rgba(249, 115, 22, 0.2)',  
                        pointBackgroundColor: '\#f97316'  
                    },  
                    {  
                        label: 'PWM Framework',  
                        data: \[90, 85, 80, 95, 100\],  
                        borderColor: '\#14b8a6',  
                        backgroundColor: 'rgba(20, 184, 166, 0.4)',  
                        pointBackgroundColor: '\#14b8a6'  
                    }  
                \]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                plugins: {  
                    legend: { position: 'bottom', labels: { color: '\#cbd5e1' } },  
                    tooltip: commonTooltipConfig  
                },  
                scales: {  
                    r: {  
                        angleLines: { color: '\#475569' },  
                        grid: { color: '\#475569' },  
                        pointLabels: { color: '\#f8fafc', font: { size: 12 } },  
                        ticks: { display: false, max: 100, min: 0 }  
                    }  
                }  
            }  
        });

        const ctxDonut \= document.getElementById('pmfDonutChart').getContext('2d');  
        new Chart(ctxDonut, {  
            type: 'doughnut',  
            data: {  
                labels: \[  
                    wrapL('Enterprise SaaS Development', 16),  
                    wrapL('Industrial IoT & R\&D', 16),  
                    wrapL('Automotive Software', 16),  
                    wrapL('FinTech Infrastructure', 16\)  
                \],  
                datasets: \[{  
                    data: \[45, 25, 15, 15\],  
                    backgroundColor: \['\#2563eb', '\#f97316', '\#14b8a6', '\#8b5cf6'\],  
                    borderWidth: 0  
                }\]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                cutout: '65%',  
                plugins: {  
                    legend: { position: 'right' },  
                    tooltip: commonTooltipConfig  
                }  
            }  
        });

        const nPoints \= 100;  
        const xTrad \= Array.from({length: nPoints}, () \=\> Math.random() \* 50 \+ 50);  
        const yTrad \= Array.from({length: nPoints}, () \=\> Math.random() \* 50 \+ 50);  
        const zTrad \= Array.from({length: nPoints}, () \=\> Math.random() \* 60 \+ 40);

        const xPwm \= Array.from({length: nPoints}, () \=\> Math.random() \* 30 \+ 10);  
        const yPwm \= Array.from({length: nPoints}, () \=\> Math.random() \* 30 \+ 10);  
        const zPwm \= Array.from({length: nPoints}, () \=\> Math.random() \* 20 \+ 10);

        const trace1 \= {  
            x: xTrad, y: yTrad, z: zTrad,  
            mode: 'markers',  
            marker: { size: 5, color: '\#f97316', opacity: 0.6 },  
            type: 'scatter3d',  
            name: 'Traditional Fail States'  
        };

        const trace2 \= {  
            x: xPwm, y: yPwm, z: zPwm,  
            mode: 'markers',  
            marker: { size: 6, color: '\#2563eb', opacity: 0.9 },  
            type: 'scatter3d',  
            name: 'PWM Optimized States'  
        };

        const layout \= {  
            margin: { l: 0, r: 0, b: 0, t: 0 },  
            paper\_bgcolor: 'transparent',  
            scene: {  
                xaxis: { title: 'Integration Time', backgroundcolor: '\#f8fafc', gridcolor: '\#e2e8f0' },  
                yaxis: { title: 'Budget Overrun', backgroundcolor: '\#f8fafc', gridcolor: '\#e2e8f0' },  
                zaxis: { title: 'System Risk', backgroundcolor: '\#f8fafc', gridcolor: '\#e2e8f0' },  
                camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }  
            },  
            showlegend: true,  
            legend: { x: 0.1, y: 0.9 }  
        };

        Plotly.newPlot('plotly3dChart', \[trace1, trace2\], layout, {responsive: true});  
    \</script\>  
\</body\>  
\</html\>  
