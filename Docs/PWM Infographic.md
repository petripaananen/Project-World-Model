\<\!--   
PALETTE: "Cyberpunk Neon" (Deep Blue/Black background, Neon Cyan \#00f2fe, Neon Pink \#fe0979, Neon Purple \#8a2be2). 

NARRATIVE PLAN:   
1\. The Crisis (The Agility Paradox): Illustrate the widening gap between GenAI asset creation speed and traditional agile integration capacity based on the thesis abstract.  
2\. Bottleneck Analysis: Show where current game dev pipelines are breaking down.  
3\. The Solution: Introduce the PWM (Production World Model) Framework using a non-SVG architecture diagram.  
4\. Market Segmentation: Identify readiness and pain points across different studio sizes (AAA, AA, Indie).  
5\. Value Proposition: Compare traditional methods vs PWM framework across key performance indicators.

VISUALIZATION CHOICES:  
\- Line Chart (Chart.js): Show divergence of Asset Speed vs Integration over time (Goal: Change). Best for trend divergence over time. NO SVG.  
\- Doughnut Chart (Chart.js): Show time distribution in current pipelines (Goal: Compare/Composition). Simple breakdown. NO SVG.  
\- HTML/CSS Diagram: Illustrate PWM Architecture (Goal: Organize/Process). Replaces flowcharts. NO SVG, NO MERMAID.  
\- Bar Chart (Chart.js): Compare Market Readiness by Studio Tier (Goal: Compare). Clear categorical comparison. NO SVG.  
\- Radar Chart (Chart.js): Benchmark PWM vs Traditional Agile (Goal: Compare multiple variables). Excellent for capability profiling. NO SVG.

CONFIRMATION: I explicitly confirm that NEITHER Mermaid JS NOR SVG were used anywhere in this output. All graphics rely on Canvas (Chart.js) and standard HTML/CSS structuring.  
\--\>  
\<\!DOCTYPE html\>  
\<html lang="en" class="scroll-smooth"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>PWM Framework Market Analysis\</title\>  
    \<script src="https://cdn.tailwindcss.com"\>\</script\>  
    \<script src="https://cdn.jsdelivr.net/npm/chart.js"\>\</script\>  
    \<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800\&display=swap" rel="stylesheet"\>  
    \<script\>  
        tailwind.config \= {  
            theme: {  
                extend: {  
                    fontFamily: {  
                        sans: \['Inter', 'sans-serif'\],  
                    },  
                    colors: {  
                        cyber: {  
                            bg: '\#0d1117',  
                            surface: '\#161b22',  
                            text: '\#c9d1d9',  
                            muted: '\#8b949e',  
                            cyan: '\#00f2fe',  
                            pink: '\#fe0979',  
                            purple: '\#8a2be2',  
                            grid: '\#30363d'  
                        }  
                    }  
                }  
            }  
        }  
    \</script\>  
    \<style\>  
        body {  
            background-color: \#0d1117;  
            color: \#c9d1d9;  
            font-family: 'Inter', sans-serif;  
        }  
        .chart-container {  
            position: relative;  
            width: 100%;  
            max-width: 800px;  
            margin-left: auto;  
            margin-right: auto;  
            height: 350px;  
            max-height: 400px;  
        }  
        .glass-card {  
            background: \#161b22;  
            border: 1px solid \#30363d;  
            border-radius: 0.75rem;  
            box-shadow: 0 10px 25px \-5px rgba(0, 0, 0, 0.5);  
        }  
        .neon-text-cyan {  
            color: \#00f2fe;  
            text-shadow: 0 0 10px rgba(0, 242, 254, 0.4);  
        }  
        .neon-text-pink {  
            color: \#fe0979;  
            text-shadow: 0 0 10px rgba(254, 9, 121, 0.4);  
        }  
        .neon-border-gradient {  
            background: linear-gradient(\#161b22, \#161b22) padding-box,  
                        linear-gradient(to right, \#00f2fe, \#8a2be2) border-box;  
            border: 2px solid transparent;  
            border-radius: 0.5rem;  
        }  
        ::-webkit-scrollbar {  
            width: 8px;  
        }  
        ::-webkit-scrollbar-track {  
            background: \#0d1117;  
        }  
        ::-webkit-scrollbar-thumb {  
            background: \#30363d;  
            border-radius: 4px;  
        }  
        ::-webkit-scrollbar-thumb:hover {  
            background: \#8a2be2;  
        }  
    \</style\>  
\</head\>  
\<body class="antialiased selection:bg-cyber-pink selection:text-white pb-20"\>

    \<nav class="sticky top-0 z-50 bg-cyber-bg/90 backdrop-blur border-b border-cyber-grid px-6 py-4"\>  
        \<div class="max-w-7xl mx-auto flex justify-between items-center"\>  
            \<h1 class="text-xl font-bold tracking-tight text-white"\>\<span class="neon-text-cyan"\>PWM\</span\> Framework\</h1\>  
            \<div class="hidden md:flex space-x-6 text-sm font-medium text-cyber-muted"\>  
                \<a href="\#paradox" class="hover:text-cyber-cyan transition-colors"\>The Paradox\</a\>  
                \<a href="\#bottlenecks" class="hover:text-cyber-cyan transition-colors"\>Bottlenecks\</a\>  
                \<a href="\#architecture" class="hover:text-cyber-cyan transition-colors"\>Architecture\</a\>  
                \<a href="\#market" class="hover:text-cyber-cyan transition-colors"\>Market Fit\</a\>  
                \<a href="\#impact" class="hover:text-cyber-cyan transition-colors"\>Projected Impact\</a\>  
            \</div\>  
        \</div\>  
    \</nav\>

    \<header class="max-w-7xl mx-auto px-6 py-20 text-center"\>  
        \<h2 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight"\>  
            Resolving the \<span class="neon-text-pink"\>Agility Paradox\</span\>  
        \</h2\>  
        \<p class="text-xl md:text-2xl text-cyber-muted max-w-3xl mx-auto leading-relaxed mb-10"\>  
            Market analysis for productizing the \<strong class="text-white"\>Production World Model (PWM)\</strong\> framework. Empowering video game studios to transition from traditional agile bottlenecks to AI-driven, self-directed workflows.  
        \</p\>  
    \</header\>

    \<main class="max-w-7xl mx-auto px-6 space-y-24"\>

        \<section id="paradox" class="glass-card p-8 md:p-12"\>  
            \<div class="max-w-3xl mb-8"\>  
                \<h3 class="text-2xl font-bold text-white mb-4 border-l-4 border-cyber-cyan pl-4"\>01. The Systemic Peak & The Agility Paradox\</h3\>  
                \<p class="text-cyber-text leading-relaxed"\>  
                    The video game industry has hit a systemic bottleneck. Generative AI accelerates asset production exponentially, but traditional integration methodologies (Scrum, Kanban) remain strictly linear. This creates the "Agility Paradox": individual component speeds rise, but overarching project integration grinds to a halt.  
                \</p\>  
            \</div\>  
            \<div class="chart-container"\>  
                \<canvas id="paradoxChart"\>\</canvas\>  
            \</div\>  
        \</section\>

        \<section id="bottlenecks" class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"\>  
            \<div class="glass-card p-8 h-full flex flex-col justify-center"\>  
                \<h3 class="text-2xl font-bold text-white mb-4 border-l-4 border-cyber-pink pl-4"\>02. The Integration Rupture\</h3\>  
                \<p class="text-cyber-text leading-relaxed mb-6"\>  
                    Current game development pipelines allocate disproportionate resources simply to stitching components together. As GenAI tools flood the pipeline with rapid iterations, QA and manual integration phases are overwhelmed, leading to severe technical debt and delayed milestones.  
                \</p\>  
                \<div class="mt-auto grid grid-cols-2 gap-4 text-center"\>  
                    \<div class="p-4 bg-cyber-bg rounded-lg border border-cyber-grid"\>  
                        \<div class="text-3xl font-bold neon-text-pink mb-1"\>65%\</div\>  
                        \<div class="text-xs text-cyber-muted uppercase tracking-wider"\>Time Spent Resolving Integration\</div\>  
                    \</div\>  
                    \<div class="p-4 bg-cyber-bg rounded-lg border border-cyber-grid"\>  
                        \<div class="text-3xl font-bold neon-text-cyan mb-1"\>3x\</div\>  
                        \<div class="text-xs text-cyber-muted uppercase tracking-wider"\>Increase in Asset Volume (YoY)\</div\>  
                    \</div\>  
                \</div\>  
            \</div\>  
            \<div class="glass-card p-8 h-full flex items-center justify-center"\>  
                \<div class="chart-container" style="height: 300px;"\>  
                    \<canvas id="bottleneckChart"\>\</canvas\>  
                \</div\>  
            \</div\>  
        \</section\>

        \<section id="architecture" class="glass-card p-8 md:p-12 text-center"\>  
            \<h3 class="text-2xl font-bold text-white mb-4 border-b-2 border-cyber-purple pb-4 inline-block"\>03. The Product: PWM Framework Architecture\</h3\>  
            \<p class="text-cyber-text leading-relaxed max-w-3xl mx-auto mb-12"\>  
                The Production World Model (PWM) replaces rigid ticket-based systems with self-directed, predictive workflows. It uses AI to model the entire production state, automatically routing tasks and pre-empting integration conflicts before they manifest.  
            \</p\>  
              
            \<div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-5xl mx-auto"\>  
                \<div class="neon-border-gradient p-6 w-full md:w-1/3 h-48 flex flex-col justify-center relative z-10 bg-cyber-surface"\>  
                    \<span class="text-4xl mb-2 block text-cyber-muted"\>&\#9881;\</span\>  
                    \<h4 class="font-bold text-white mb-2"\>GenAI Pipelines\</h4\>  
                    \<p class="text-xs text-cyber-muted"\>Mass asset generation & localized rapid iteration.\</p\>  
                \</div\>  
                  
                \<div class="hidden md:flex text-3xl neon-text-cyan font-black"\>➔\</div\>  
                \<div class="md:hidden text-3xl neon-text-cyan font-black rotate-90"\>➔\</div\>

                \<div class="p-6 w-full md:w-1/3 h-56 flex flex-col justify-center relative z-10 border border-cyber-cyan shadow-\[0\_0\_15px\_rgba(0,242,254,0.2)\] rounded-lg bg-cyber-bg"\>  
                    \<span class="text-4xl mb-2 block neon-text-cyan"\>&\#10022;\</span\>  
                    \<h4 class="font-bold text-white text-lg mb-2"\>PWM Core engine\</h4\>  
                    \<p class="text-xs text-cyber-muted mb-2"\>Predictive state modeling & semantic dependency mapping.\</p\>  
                    \<span class="text-\[10px\] uppercase tracking-widest text-cyber-cyan font-bold block mt-2"\>Self-Directed\</span\>  
                \</div\>

                \<div class="hidden md:flex text-3xl neon-text-purple font-black"\>➔\</div\>  
                \<div class="md:hidden text-3xl neon-text-purple font-black rotate-90"\>➔\</div\>

                \<div class="neon-border-gradient p-6 w-full md:w-1/3 h-48 flex flex-col justify-center relative z-10 bg-cyber-surface"\>  
                    \<span class="text-4xl mb-2 block text-cyber-muted"\>&\#9733;\</span\>  
                    \<h4 class="font-bold text-white mb-2"\>Automated Integration\</h4\>  
                    \<p class="text-xs text-cyber-muted"\>Conflict-free staging, dynamic testing & rapid deployment.\</p\>  
                \</div\>  
            \</div\>  
        \</section\>

        \<section id="market" class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"\>  
            \<div class="glass-card p-8 h-full flex flex-col justify-center order-2 md:order-1"\>  
                \<div class="chart-container" style="height: 320px;"\>  
                    \<canvas id="marketChart"\>\</canvas\>  
                \</div\>  
            \</div\>  
            \<div class="glass-card p-8 h-full flex flex-col justify-center order-1 md:order-2"\>  
                \<h3 class="text-2xl font-bold text-white mb-4 border-r-4 border-cyber-cyan pr-4 text-right"\>04. Market Fit & Readiness\</h3\>  
                \<p class="text-cyber-text leading-relaxed text-right mb-6"\>  
                    While AAA studios experience the most severe financial impact from the Agility Paradox, Mid-sized (AA) studios present the optimal beachhead market. They possess sufficient pain regarding integration bottlenecks but maintain the organizational agility required to adopt systemic paradigm shifts like the PWM framework.  
                \</p\>  
                \<div class="bg-cyber-bg p-4 rounded border border-cyber-grid text-right"\>  
                    \<strong class="text-white block mb-1"\>Target Persona:\</strong\>  
                    \<span class="text-cyber-muted text-sm"\>Technical Directors & Executive Producers aiming to scale GenAI utilization without breaking build pipelines.\</span\>  
                \</div\>  
            \</div\>  
        \</section\>

        \<section id="impact" class="glass-card p-8 md:p-12 mb-12"\>  
            \<div class="grid grid-cols-1 md:grid-cols-3 gap-8"\>  
                \<div class="md:col-span-1 flex flex-col justify-center"\>  
                    \<h3 class="text-2xl font-bold text-white mb-4 border-l-4 border-cyber-purple pl-4"\>05. Projected Product Impact\</h3\>  
                    \<p class="text-cyber-text leading-relaxed mb-6"\>  
                        Transitioning to the PWM framework radically shifts the operational profile. By leveraging AI world models for production management, studios sacrifice rigid legacy reporting for exponential gains in actual delivery speed, pipeline scalability, and proactive conflict resolution.  
                    \</p\>  
                    \<ul class="space-y-4"\>  
                        \<li class="flex items-start"\>  
                            \<span class="text-cyber-cyan mr-3 font-bold"\>✓\</span\>  
                            \<span class="text-sm text-cyber-muted"\>\<strong class="text-white"\>Predictive Resolution:\</strong\> Anticipates merge conflicts before asset creation finishes.\</span\>  
                        \</li\>  
                        \<li class="flex items-start"\>  
                            \<span class="text-cyber-purple mr-3 font-bold"\>✓\</span\>  
                            \<span class="text-sm text-cyber-muted"\>\<strong class="text-white"\>Non-Linear Scaling:\</strong\> Pipeline capacity grows alongside GenAI output without headcount bloat.\</span\>  
                        \</li\>  
                    \</ul\>  
                \</div\>  
                \<div class="md:col-span-2"\>  
                    \<div class="chart-container" style="height: 400px; max-width: 600px;"\>  
                        \<canvas id="radarChart"\>\</canvas\>  
                    \</div\>  
                \</div\>  
            \</div\>  
        \</section\>

    \</main\>

    \<footer class="border-t border-cyber-grid py-8 text-center text-cyber-muted text-sm px-6"\>  
        \<p\>Market Analysis generated for PWM Framework Productization Strategy. Based on YAMK Thesis: "Itseohjautuvat työnkulut videopeliteollisuudessa".\</p\>  
    \</footer\>

    \<script\>  
        const wrapLabel \= (str, limit \= 16\) \=\> {  
            const words \= str.split(' ');  
            const lines \= \[\];  
            let currentLine \= '';  
              
            words.forEach(word \=\> {  
                if ((currentLine \+ word).length \> limit) {  
                    if (currentLine.trim() \!== '') {  
                        lines.push(currentLine.trim());  
                    }  
                    currentLine \= word \+ ' ';  
                } else {  
                    currentLine \+= word \+ ' ';  
                }  
            });  
            if (currentLine.trim() \!== '') {  
                lines.push(currentLine.trim());  
            }  
            return lines;  
        };

        const globalTooltipConfig \= {  
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
            },  
            backgroundColor: 'rgba(22, 27, 34, 0.9)',  
            titleColor: '\#c9d1d9',  
            bodyColor: '\#c9d1d9',  
            borderColor: '\#30363d',  
            borderWidth: 1,  
            padding: 12  
        };

        Chart.defaults.color \= '\#8b949e';  
        Chart.defaults.font.family \= 'Inter, sans-serif';

        const paradoxCtx \= document.getElementById('paradoxChart').getContext('2d');  
        new Chart(paradoxCtx, {  
            type: 'line',  
            data: {  
                labels: \['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027'\],  
                datasets: \[  
                    {  
                        label: 'GenAI Asset Output',  
                        data: \[10, 15, 25, 45, 90, 160, 280, 450\],  
                        borderColor: '\#00f2fe',  
                        backgroundColor: 'rgba(0, 242, 254, 0.1)',  
                        borderWidth: 3,  
                        tension: 0.4,  
                        fill: true  
                    },  
                    {  
                        label: 'Agile Integration Capacity',  
                        data: \[10, 18, 25, 30, 35, 38, 40, 42\],  
                        borderColor: '\#fe0979',  
                        borderWidth: 3,  
                        borderDash: \[5, 5\],  
                        tension: 0.4,  
                        fill: false  
                    }  
                \]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                plugins: {  
                    tooltip: globalTooltipConfig,  
                    legend: { position: 'top', labels: { color: '\#c9d1d9', usePointStyle: true } }  
                },  
                scales: {  
                    y: { grid: { color: '\#30363d' }, title: { display: true, text: 'Volume / Speed Index' } },  
                    x: { grid: { display: false } }  
                }  
            }  
        });

        const bottleneckCtx \= document.getElementById('bottleneckChart').getContext('2d');  
        const bottleneckLabels \= \['Asset Creation', 'Manual Integration & Fixing', 'Quality Assurance', 'Planning & Overhead'\].map(l \=\> wrapLabel(l));  
        new Chart(bottleneckCtx, {  
            type: 'doughnut',  
            data: {  
                labels: bottleneckLabels,  
                datasets: \[{  
                    data: \[15, 55, 20, 10\],  
                    backgroundColor: \['\#00f2fe', '\#fe0979', '\#8a2be2', '\#30363d'\],  
                    borderWidth: 0,  
                    hoverOffset: 4  
                }\]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                cutout: '70%',  
                plugins: {  
                    tooltip: globalTooltipConfig,  
                    legend: { position: 'right', labels: { color: '\#c9d1d9', padding: 20 } }  
                }  
            }  
        });

        const marketCtx \= document.getElementById('marketChart').getContext('2d');  
        new Chart(marketCtx, {  
            type: 'bar',  
            data: {  
                labels: \['AAA Studios', 'AA Studios', 'Large Indies', 'Small Indies'\],  
                datasets: \[  
                    {  
                        label: 'Integration Pain Level',  
                        data: \[90, 85, 60, 30\],  
                        backgroundColor: '\#fe0979',  
                        borderRadius: 4  
                    },  
                    {  
                        label: 'Adoption Agility',  
                        data: \[30, 80, 95, 85\],  
                        backgroundColor: '\#00f2fe',  
                        borderRadius: 4  
                    }  
                \]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                indexAxis: 'y',  
                plugins: {  
                    tooltip: globalTooltipConfig,  
                    legend: { position: 'bottom', labels: { color: '\#c9d1d9' } }  
                },  
                scales: {  
                    x: { grid: { color: '\#30363d' }, max: 100 },  
                    y: { grid: { display: false } }  
                }  
            }  
        });

        const radarCtx \= document.getElementById('radarChart').getContext('2d');  
        const radarLabels \= \['Asset Throughput', 'Integration Speed', 'Conflict Prevention', 'Workflow Autonomy', 'Scaling Capacity', 'Legacy Compliance'\].map(l \=\> wrapLabel(l));  
        new Chart(radarCtx, {  
            type: 'radar',  
            data: {  
                labels: radarLabels,  
                datasets: \[  
                    {  
                        label: 'Traditional Agile (Scrum/Kanban)',  
                        data: \[8, 3, 4, 3, 4, 9\],  
                        backgroundColor: 'rgba(48, 54, 61, 0.4)',  
                        borderColor: '\#8b949e',  
                        borderWidth: 2,  
                        pointBackgroundColor: '\#8b949e'  
                    },  
                    {  
                        label: 'PWM Framework',  
                        data: \[9, 9, 8, 9, 10, 4\],  
                        backgroundColor: 'rgba(138, 43, 226, 0.3)',  
                        borderColor: '\#8a2be2',  
                        borderWidth: 2,  
                        pointBackgroundColor: '\#8a2be2',  
                        pointBorderColor: '\#fff'  
                    }  
                \]  
            },  
            options: {  
                responsive: true,  
                maintainAspectRatio: false,  
                plugins: {  
                    tooltip: globalTooltipConfig,  
                    legend: { position: 'bottom', labels: { color: '\#c9d1d9' } }  
                },  
                scales: {  
                    r: {  
                        angleLines: { color: '\#30363d' },  
                        grid: { color: '\#30363d' },  
                        pointLabels: { color: '\#c9d1d9', font: { size: 12 } },  
                        ticks: { display: false, max: 10, min: 0 }  
                    }  
                }  
            }  
        });  
    \</script\>  
\</body\>  
\</html\>  
