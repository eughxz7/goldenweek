let tentativaAtual = 1;
let perdaAcumuladaGlobal = 0;
let bancaDeTrabalho = 0.00;

// Variáveis do Gráfico de Evolução
let graficoInstancia = null;
let historicoBanca = [];
let historicoLabels = [];

// Função executada assim que a página carrega
window.addEventListener('DOMContentLoaded', () => {
    // 1. Tenta recuperar a banca salva no último Green
    const bancaSalva = localStorage.getItem('gw_banca_salva');
    if (bancaSalva && parseFloat(bancaSalva) > 0) {
        bancaDeTrabalho = parseFloat(bancaSalva);
        document.getElementById('bancaAtual').value = bancaDeTrabalho.toFixed(2);
    } else {
        bancaDeTrabalho = 0.00;
        document.getElementById('bancaAtual').value = "0.00";
    }

    // 2. Tenta recuperar o histórico do gráfico do banco de dados local
    const historicoSalvo = localStorage.getItem('gw_historico_grafico');
    const labelsSalvas = localStorage.getItem('gw_labels_grafico');

    if (historicoSalvo && labelsSalvas) {
        historicoBanca = JSON.parse(historicoSalvo);
        historicoLabels = JSON.parse(labelsSalvas);
    } else if (bancaDeTrabalho > 0) {
        // Se tem banca mas não tem gráfico, cria o ponto de partida
        historicoBanca = [bancaDeTrabalho];
        historicoLabels = ['Início'];
    }

    // 3. Renderiza a tela inicial
    inicializarGrafico();
    calcularEstrategia();
});

function resetarPainelCompleto() {
    const inputBanca = parseFloat(document.getElementById('bancaAtual').value) || 0;
    bancaDeTrabalho = inputBanca;
    tentativaAtual = 1;
    perdaAcumuladaGlobal = 0;

    // Se mudou a banca manualmente, atualiza o início do gráfico também
    if (historicoBanca.length <= 1) {
        historicoBanca = bancaDeTrabalho > 0 ? [bancaDeTrabalho] : [];
        historicoLabels = bancaDeTrabalho > 0 ? ['Início'] : [];
        salvarDadosLocais();
        atualizarGrafico();
    }

    // Salva o valor atual digitado
    localStorage.setItem('gw_banca_salva', bancaDeTrabalho.toFixed(2));
    calcularEstrategia();
}

function registrarResultado(isWin) {
    if (bancaDeTrabalho <= 0) return;

    const mult = 14;
    let apostaDaRodada = parseFloat(document.getElementById(`aposta-row-${tentativaAtual}`)?.dataset.val) || 0;

    if (isWin) {
        let bancaSePerder = bancaDeTrabalho - (perdaAcumuladaGlobal + apostaDaRodada);
        let retornoBruto = apostaDaRodada * mult;
        let novaBanca = Math.round((bancaSePerder + retornoBruto) * 100) / 100;
        
        document.getElementById('bancaAtual').value = novaBanca.toFixed(2);
        bancaDeTrabalho = novaBanca;
        tentativaAtual = 1;
        perdaAcumuladaGlobal = 0;

        // SALVAMENTO NO LOCALSTORAGE (SÓ VAI SALVAR A BANCA DEPOIS QUE CONSEGUIR O GREEN)
        localStorage.setItem('gw_banca_salva', bancaDeTrabalho.toFixed(2));

        // ADICIONAR NOVO PONTO AO GRÁFICO
        if(historicoBanca.length === 0) {
            historicoLabels.push('Início');
            historicoBanca.push(novaBanca);
        }
        historicoLabels.push(`G ${historicoBanca.length}`);
        historicoBanca.push(novaBanca);
        
        salvarDadosLocais();
        atualizarGrafico();
    } else {
        if (apostaDaRodada > 0) {
            perdaAcumuladaGlobal = Math.round((perdaAcumuladaGlobal + apostaDaRodada) * 100) / 100;
            tentativaAtual++;
        }
    }
    calcularEstrategia();
}

function salvarDadosLocais() {
    localStorage.setItem('gw_historico_grafico', JSON.stringify(historicoBanca));
    localStorage.setItem('gw_labels_grafico', JSON.stringify(historicoLabels));
}

function limparHistoricoGrafico() {
    if(confirm("Deseja mesmo zerar o histórico do gráfico de evolução?")) {
        historicoBanca = bancaDeTrabalho > 0 ? [bancaDeTrabalho] : [];
        historicoLabels = bancaDeTrabalho > 0 ? ['Início'] : [];
        salvarDadosLocais();
        atualizarGrafico();
    }
}

function calcularEstrategia() {
    const mult = 14; 
    const usarStop = document.getElementById('usarStopLoss').checked;
    
    const metaValor = Math.round(bancaDeTrabalho * 1.05 * 100) / 100;
    const stopValor = usarStop ? Math.round(bancaDeTrabalho * 0.80 * 100) / 100 : 0;
    
    document.getElementById('lblMeta').innerText = "R$ " + metaValor.toFixed(2).replace('.', ',');
    document.getElementById('lblStop').innerText = (usarStop && bancaDeTrabalho > 0) ? "R$ " + stopValor.toFixed(2).replace('.', ',') : (usarStop ? "R$ 0,00" : "DESATIVADO");

    const tbody = document.getElementById('tabelaCorpo');
    tbody.innerHTML = ""; 

    let perdaAcumuladaLoop = 0;
    let displayApostaValor = 0;
    let displayStatusTexto = "Alvo Ativo";

    for (let i = 1; i <= 35; i++) {
        let aposta = 0;
        let statusText = "Aguardando";
        let rowClass = "";

        if (bancaDeTrabalho > 0) {
            let bancaAnterior = bancaDeTrabalho - perdaAcumuladaLoop;
            let saldoRestanteStop = Math.round((bancaAnterior - stopValor) * 100) / 100;
            
            if (saldoRestanteStop <= 0) {
                aposta = 0;
                statusText = "Bloqueado";
                rowClass = "row-blocked";
            } else {
                let apostaTeorica = Math.round(((metaValor - bancaDeTrabalho + perdaAcumuladaLoop) / (mult - 1)) * 100) / 100;
                
                if (apostaTeorica > saldoRestanteStop) {
                    aposta = saldoRestanteStop; 
                    statusText = "Último Resto";
                    rowClass = "row-resto";
                } else {
                    aposta = apostaTeorica;
                    statusText = "Alvo Ativo";
                }
            }
        }

        if (i === tentativaAtual && bancaDeTrabalho > 0) {
            displayApostaValor = aposta;
            displayStatusTexto = statusText;
            if (statusText === "Bloqueado") {
                rowClass = "row-blocked";
            } else {
                rowClass = "row-active"; 
            }
        }

        perdaAcumuladaLoop = Math.round((perdaAcumuladaLoop + aposta) * 100) / 100;
        let bancaSePerder = bancaDeTrabalho > 0 ? Math.round((bancaDeTrabalho - perdaAcumuladaLoop) * 100) / 100 : 0;
        let retornoSeAcertar = Math.round((aposta * mult) * 100) / 100;
        let bancaFinalAcertar = aposta > 0 ? Math.round((bancaSePerder + retornoSeAcertar) * 100) / 100 : bancaDeTrabalho;

        let tr = document.createElement('tr');
        if(rowClass) tr.className = rowClass;
        
        tr.innerHTML = `
            <td>${i}</td>
            <td class="txt-bold txt-gold" id="aposta-row-${i}" data-val="${aposta}">R$ ${aposta.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${perdaAcumuladaLoop.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${bancaSePerder.toFixed(2).replace('.', ',')}</td>
            <td class="txt-bold">R$ ${bancaFinalAcertar.toFixed(2).replace('.', ',')}</td>
            <td>${statusText}</td>
        `;
        tbody.appendChild(tr);
    }

    const displayApostaElement = document.getElementById('displayAposta');
    const displayInfoElement = document.getElementById('displayInfo');
    const txtDisplayStatus = document.getElementById('txtDisplayStatus');

    if (bancaDeTrabalho <= 0) {
        txtDisplayStatus.innerText = "Aguardando Banca Inicial";
        displayApostaElement.innerText = "R$ 0,00";
        displayApostaElement.style.color = "var(--text-dark)";
        displayInfoElement.innerText = "Insira o valor da sua banca abaixo para iniciar";
    } else if (displayStatusTexto === "Bloqueado") {
        txtDisplayStatus.innerText = "🔴 GESTÃO ENCERRADA - LIMITE DE SEGURANÇA";
        displayApostaElement.innerText = "STOP LIMIT";
        displayApostaElement.style.color = "var(--red-color)";
        displayInfoElement.innerText = "Você atingiu o limite máximo configurado para proteção da banca.";
    } else {
        txtDisplayStatus.innerText = displayStatusTexto === "Último Resto" ? "⚠️ ATENÇÃO - ENTRADA COM SALDO RESTANTE" : "Sinal Atual Para Entrada (No Branco)";
        displayApostaElement.innerText = "R$ " + displayApostaValor.toFixed(2).replace('.', ',');
        displayApostaElement.style.color = "var(--navy-blue)";
        displayInfoElement.innerText = `Tentativa Nº ${tentativaAtual} | Perda Acumulada no Ciclo: R$ ${perdaAcumuladaGlobal.toFixed(2).replace('.', ',')}`;
    }
}

// INICIALIZAÇÃO DO GRÁFICO INTERATIVO
function inicializarGrafico() {
    const ctx = document.getElementById('graficoBanca').getContext('2d');
    graficoInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historicoLabels,
            datasets: [{
                label: 'Banca (R$)',
                data: historicoBanca,
                borderColor: '#FFD700', // Dourado oficial
                backgroundColor: 'rgba(255, 215, 0, 0.05)',
                borderWidth: 2,
                pointBackgroundColor: '#10b981', // Ponto do Green verde
                pointBorderColor: '#fff',
                pointRadius: 4,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: '#1a1d24' },
                    ticks: { color: '#8f9bb3', font: { size: 10 } }
                },
                y: {
                    grid: { color: '#1a1d24' },
                    ticks: { color: '#8f9bb3', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function atualizarGrafico() {
    if (graficoInstancia) {
        graficoInstancia.data.labels = historicoLabels;
        graficoInstancia.data.datasets[0].data = historicoBanca;
        graficoInstancia.update();
    }
}
