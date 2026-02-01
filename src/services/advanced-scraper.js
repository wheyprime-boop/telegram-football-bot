import axios from 'axios';
import * as cheerio from 'cheerio';
import statisticsService from './statistics.js';

/**
 * Serviço Avançado de Web Scraping com Consolidação de Previsões
 * Recolhe dados de betbrain, Forebet, eScored e outras fontes
 */
class AdvancedScraperService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    this.qualityThreshold = 65; // Mínimo de confiança
  }

  /**
   * Recolher previsões do Forebet
   */
  async getPredictionsFromForebet() {
    try {
      console.log('🔄 Recolhendo previsões do Forebet...');
      const response = await axios.get('https://www.forebet.com/en/football-predictions', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const predictions = [];

      // Procurar por elementos de previsões
      $('tr[data-match-id]').each((index, element) => {
        const row = $(element);
        const homeTeam = row.find('td.team1').text().trim();
        const awayTeam = row.find('td.team2').text().trim();
        const prediction = row.find('td.prediction').text().trim();
        const probability = row.find('td.probability').text().trim();
        const odds = row.find('td.odds').text().trim();

        if (homeTeam && awayTeam && prediction) {
          predictions.push({
            source: 'Forebet',
            homeTeam,
            awayTeam,
            prediction,
            probability,
            odds,
            confidence: this.extractConfidence(probability)
          });
        }
      });

      console.log(`✅ Encontradas ${predictions.length} previsões no Forebet`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do Forebet:', error.message);
      return [];
    }
  }

  /**
   * Recolher previsões do Betbrain
   */
  async getPredictionsFromBetbrain() {
    try {
      console.log('🔄 Recolhendo previsões do Betbrain...');
      const response = await axios.get('https://www.betbrain.com/en/predictions', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const predictions = [];

      // Procurar por elementos de previsões
      $('div[class*="prediction-item"]').each((index, element) => {
        const item = $(element);
        const homeTeam = item.find('span[class*="home-team"]').text().trim();
        const awayTeam = item.find('span[class*="away-team"]').text().trim();
        const prediction = item.find('span[class*="prediction-text"]').text().trim();
        const confidence = item.find('span[class*="confidence"]').text().trim();
        const odds = item.find('span[class*="odds"]').text().trim();

        if (homeTeam && awayTeam && prediction) {
          predictions.push({
            source: 'Betbrain',
            homeTeam,
            awayTeam,
            prediction,
            confidence: this.extractConfidence(confidence),
            odds
          });
        }
      });

      console.log(`✅ Encontradas ${predictions.length} previsões no Betbrain`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do Betbrain:', error.message);
      return [];
    }
  }

  /**
   * Recolher previsões do eScored
   */
  async getPredictionsFromEscored() {
    try {
      console.log('🔄 Recolhendo previsões do eScored...');
      const response = await axios.get('https://www.escored.com/en/football-predictions', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const predictions = [];

      // Procurar por elementos de previsões
      $('div[class*="match-prediction"]').each((index, element) => {
        const match = $(element);
        const homeTeam = match.find('span[class*="home"]').text().trim();
        const awayTeam = match.find('span[class*="away"]').text().trim();
        const prediction = match.find('span[class*="prediction"]').text().trim();
        const confidence = match.find('span[class*="confidence"]').text().trim();
        const rating = match.find('span[class*="rating"]').text().trim();

        if (homeTeam && awayTeam && prediction) {
          predictions.push({
            source: 'eScored',
            homeTeam,
            awayTeam,
            prediction,
            confidence: this.extractConfidence(confidence),
            rating
          });
        }
      });

      console.log(`✅ Encontradas ${predictions.length} previsões no eScored`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do eScored:', error.message);
      return [];
    }
  }

  /**
   * Extrair valor de confiança de uma string
   */
  extractConfidence(text) {
    if (!text) return 0;
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Consolidar e analisar previsões de múltiplas fontes
   */
  consolidatePredictions(allPredictions) {
    // Agrupar previsões por jogo
    const matchesMap = new Map();

    for (const pred of allPredictions) {
      const matchKey = `${pred.homeTeam}|${pred.awayTeam}`;
      if (!matchesMap.has(matchKey)) {
        matchesMap.set(matchKey, {
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
          sources: []
        });
      }
      matchesMap.get(matchKey).sources.push(pred);
    }

    // Converter para array e analisar
    const consolidatedMatches = Array.from(matchesMap.values()).map(match => {
      return this.analyzeMatch(match);
    });

    // Ordenar por confiança e filtrar por qualidade
    return consolidatedMatches
      .filter(m => m.confidence >= this.qualityThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analisar um jogo com múltiplas previsões
   */
  analyzeMatch(match) {
    const { homeTeam, awayTeam, sources } = match;

    // Contar previsões por tipo
    const predictionCounts = {};
    let totalConfidence = 0;
    let sourceCount = 0;

    for (const source of sources) {
      const pred = source.prediction.toUpperCase();
      predictionCounts[pred] = (predictionCounts[pred] || 0) + 1;
      totalConfidence += source.confidence || 0;
      sourceCount++;
    }

    // Encontrar previsão mais comum
    const bestPrediction = Object.entries(predictionCounts).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0];

    const bestPredictionCount = predictionCounts[bestPrediction];
    const agreementPercentage = (bestPredictionCount / sourceCount) * 100;
    const averageConfidence = totalConfidence / sourceCount;

    // Gerar descrição
    const description = this.generateDescription(
      homeTeam,
      awayTeam,
      bestPrediction,
      agreementPercentage,
      averageConfidence,
      sources
    );

    return {
      homeTeam,
      awayTeam,
      bestPrediction,
      agreementPercentage: Math.round(agreementPercentage),
      confidence: Math.round(averageConfidence),
      sourceCount,
      sources: sources.map(s => ({
        name: s.source,
        prediction: s.prediction,
        confidence: s.confidence || 0
      })),
      description
    };
  }

  /**
   * Gerar descrição detalhada da previsão
   */
  generateDescription(homeTeam, awayTeam, prediction, agreement, confidence, sources) {
    let description = '';

    // Traduzir previsão
    const predictionMap = {
      '1': 'Vitória do ' + homeTeam,
      'X': 'Empate',
      '2': 'Vitória do ' + awayTeam,
      '1X': 'Vitória ou Empate do ' + homeTeam,
      '12': 'Vitória do ' + homeTeam + ' ou ' + awayTeam,
      'X2': 'Empate ou Vitória do ' + awayTeam,
      'OVER': 'Mais de 2.5 golos',
      'UNDER': 'Menos de 2.5 golos',
      'GG': 'Ambas as equipas marcam',
      'NG': 'Pelo menos uma equipa não marca'
    };

    const predictionText = predictionMap[prediction] || prediction;

    // Avaliar confiança
    let confidenceLevel = 'Baixa';
    if (confidence >= 75) confidenceLevel = 'Muito Alta';
    else if (confidence >= 60) confidenceLevel = 'Alta';
    else if (confidence >= 45) confidenceLevel = 'Média';

    // Avaliar acordo entre fontes
    let agreementLevel = 'Fraco';
    if (agreement >= 80) agreementLevel = 'Muito Forte';
    else if (agreement >= 60) agreementLevel = 'Forte';
    else if (agreement >= 40) agreementLevel = 'Moderado';

    description += `📊 <b>Análise Consolidada</b>\n`;
    description += `\n🎯 <b>Melhor Previsão:</b> ${predictionText}\n`;
    description += `\n📈 <b>Confiança:</b> ${confidence}% (${confidenceLevel})\n`;
    description += `\n🤝 <b>Acordo entre Fontes:</b> ${agreement}% (${agreementLevel})\n`;
    description += `\n📍 <b>Fontes Consultadas:</b> ${sources.length}\n`;

    // Listar previsões por fonte
    description += `\n<b>Previsões por Fonte:</b>\n`;
    const uniqueSources = new Map();
    for (const source of sources) {
      if (!uniqueSources.has(source.source)) {
        uniqueSources.set(source.source, source);
      }
    }

    for (const [sourceName, sourceData] of uniqueSources) {
      const conf = sourceData.confidence ? ` (${sourceData.confidence}%)` : '';
      description += `   • <b>${sourceName}:</b> ${sourceData.prediction}${conf}\n`;
    }

    // Adicionar recomendação
    description += `\n💡 <b>Recomendação:</b> `;
    if (agreement >= 70 && confidence >= 60) {
      description += `Previsão com <b>alta confiabilidade</b>. Múltiplas fontes concordam.`;
    } else if (agreement >= 50 && confidence >= 50) {
      description += `Previsão <b>moderadamente confiável</b>. Maioria das fontes concorda.`;
    } else {
      description += `Previsão com <b>confiabilidade limitada</b>. Considerar outras opções.`;
    }

    return description;
  }

  /**
   * Recolher todas as previsões de múltiplas fontes
   */
  async getAllPredictions() {
    console.log('\n📊 Iniciando recolha avançada de previsões...\n');

    try {
      // Recolher de todas as fontes em paralelo
      const [forebet, betbrain, escored] = await Promise.all([
        this.getPredictionsFromForebet().catch(() => []),
        this.getPredictionsFromBetbrain().catch(() => []),
        this.getPredictionsFromEscored().catch(() => [])
      ]);

      // Consolidar todas as previsões
      const allPredictions = [...forebet, ...betbrain, ...escored];

      console.log(`\n✅ Total de previsões recolhidas: ${allPredictions.length}`);

      if (allPredictions.length === 0) {
        return [];
      }

      // Consolidar e analisar
      const consolidated = this.consolidatePredictions(allPredictions);
      console.log(`✅ Jogos consolidados (filtrados): ${consolidated.length}`);

      return consolidated;
    } catch (error) {
      console.error('❌ Erro ao consolidar previsões:', error.message);
      return [];
    }
  }

  /**
   * Formatar Top 5 previsões para mensagem do Telegram
   */
  formatTop5Message(consolidatedMatches) {
    if (consolidatedMatches.length === 0) {
      return null;
    }

    const top5 = consolidatedMatches.slice(0, 5);
    let message = `🏆 <b>TOP 5 MELHORES PREVISÕES - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `⭐ Filtradas por confiança (mínimo ${this.qualityThreshold}%)\n\n`;
    message += `${'═'.repeat(50)}\n\n`;

    for (let i = 0; i < top5.length; i++) {
      const match = top5[i];
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];

      message += `${medal} <b>${i + 1}. ${match.homeTeam} vs ${match.awayTeam}</b>\n`;
      message += `🎯 Previsão: <b>${match.bestPrediction}</b>\n`;
      message += `📈 Confiança: <b>${match.confidence}%</b>\n`;
      message += `🤝 Acordo: ${match.agreementPercentage}%\n`;
      message += `📍 Fontes: ${match.sourceCount}\n\n`;
    }

    message += `${'═'.repeat(50)}\n\n`;
    message += `📊 <b>Estatísticas:</b>\n`;
    message += `   Total de Jogos: ${consolidatedMatches.length}\n`;
    message += `   Confiança Média: ${Math.round(consolidatedMatches.reduce((a, b) => a + b.confidence, 0) / consolidatedMatches.length)}%\n`;
    message += `\n📍 <b>Fontes:</b> Forebet, Betbrain, eScored\n`;
    message += `\n💡 <i>Apenas previsões com alta confiabilidade são mostradas.</i>\n`;
    message += `<i>Joga com responsabilidade!</i>`;

    return message;
  }

  /**
   * Formatar previsões consolidadas completas para mensagem do Telegram
   */
  formatConsolidatedMessage(consolidatedMatches) {
    if (consolidatedMatches.length === 0) {
      return null;
    }

    let message = `🏆 <b>PREVISÕES CONSOLIDADAS - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `📊 Análise de múltiplas fontes especializadas\n`;
    message += `⭐ Filtradas por confiança (mínimo ${this.qualityThreshold}%)\n\n`;
    message += `${'═'.repeat(50)}\n\n`;

    let matchCount = 0;
    for (const match of consolidatedMatches.slice(0, 10)) {
      matchCount++;

      message += `⚽ <b>${matchCount}. ${match.homeTeam} vs ${match.awayTeam}</b>\n`;
      message += `🎯 Previsão: <b>${match.bestPrediction}</b>\n`;
      message += `📈 Confiança: ${match.confidence}%\n`;
      message += `🤝 Acordo: ${match.agreementPercentage}%\n`;
      message += `📍 Fontes: ${match.sourceCount}\n`;
      message += `\n${match.description}\n`;
      message += `\n${'─'.repeat(50)}\n\n`;
    }

    message += `\n✅ <b>Total de Jogos Analisados:</b> ${matchCount}\n`;
    message += `\n📍 <b>Fontes Principais:</b> Forebet, Betbrain, eScored\n`;
    message += `\n💡 <i>Estas previsões são baseadas em análise consolidada de múltiplas especialistas.</i>\n`;
    message += `<i>Joga com responsabilidade!</i>`;

    return message;
  }
}

export default new AdvancedScraperService();
