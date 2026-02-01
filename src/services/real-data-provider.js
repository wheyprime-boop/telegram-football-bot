import axios from 'axios';

/**
 * Serviço de Recolha de Dados Reais de Previsões de Futebol
 * Integra The Odds API, football-data.org e SofaScore
 * Apenas dados reais - sem fallback
 */
class RealDataProvider {
  constructor() {
    this.oddsApiKey = process.env.ODDS_API_KEY || '';
    this.footballDataToken = process.env.FOOTBALL_DATA_TOKEN || '';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
  }

  /**
   * Obter apenas dados reais (sem fallback)
   */
  async getRealDataOnly() {
    try {
      console.log('\n🔄 Recolhendo APENAS dados reais...\n');

      // Recolher dados de todas as fontes em paralelo
      const [oddsData, sofaScoreData] = await Promise.all([
        this.getOddsDataRealOnly(),
        this.getSofaScoreDataRealOnly()
      ]);

      console.log(`\n📊 Dados recolhidos:`);
      console.log(`   The Odds API: ${oddsData.length} jogos`);
      console.log(`   SofaScore: ${sofaScoreData.length} jogos\n`);

      // Consolidar dados
      const consolidated = this.consolidateMatches(oddsData, sofaScoreData);
      
      console.log(`✅ Total de previsões consolidadas: ${consolidated.length}\n`);
      
      return consolidated.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('❌ Erro ao recolher previsões:', error.message);
      return [];
    }
  }

  /**
   * Obter dados de The Odds API (apenas dados reais)
   */
  async getOddsDataRealOnly() {
    try {
      console.log('📊 Recolhendo dados de The Odds API...');
      
      if (!this.oddsApiKey) {
        console.log('⚠️ ODDS_API_KEY não configurada');
        return [];
      }

      // Tentar múltiplos desportos
      const sports = ['soccer_epl', 'soccer_spain', 'soccer_france', 'soccer_germany', 'soccer_italy'];
      let allMatches = [];

      for (const sport of sports) {
        try {
          const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sport}/events`, {
            params: {
              apiKey: this.oddsApiKey,
              limit: 10
            },
            timeout: 5000
          });

          const matches = response.data.data || [];
          console.log(`   ${sport}: ${matches.length} jogos`);
          allMatches = allMatches.concat(matches);
        } catch (err) {
          console.log(`   ${sport}: erro (${err.message})`);
        }
      }

      if (allMatches.length === 0) {
        console.log('⚠️ The Odds API: Nenhum jogo encontrado');
        return [];
      }

      console.log(`✅ The Odds API: Total de ${allMatches.length} jogos reais`);
      
      return allMatches.map(match => ({
        source: 'The Odds API',
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        league: match.sport_title || 'Desconhecido',
        commenceTime: match.commence_time,
        bookmakers: match.bookmakers || [],
        odds: this.extractOdds(match.bookmakers)
      }));
    } catch (error) {
      console.error('❌ Erro ao recolher dados de The Odds API:', error.message);
      return [];
    }
  }

  /**
   * Obter dados de SofaScore (apenas dados reais)
   */
  async getSofaScoreDataRealOnly() {
    try {
      console.log('📊 Recolhendo dados de SofaScore...');
      
      const response = await axios.get('https://api.sofascore.com/api/v1/sport/football/events/today', {
        timeout: 5000,
        headers: this.headers
      });

      const events = response.data.events || [];
      
      if (events.length === 0) {
        console.log('⚠️ SofaScore: Nenhum jogo encontrado');
        return [];
      }

      console.log(`✅ SofaScore: Total de ${events.length} jogos reais`);
      
      return events.map(event => ({
        source: 'SofaScore',
        homeTeam: event.homeTeam?.name || 'Desconhecido',
        awayTeam: event.awayTeam?.name || 'Desconhecido',
        league: event.tournament?.name || 'Desconhecido',
        startTimestamp: event.startTimestamp,
        rating: event.homeTeam?.rating || 0,
        predictions: event.predictions || {}
      }));
    } catch (error) {
      console.error('❌ Erro ao recolher dados de SofaScore:', error.message);
      return [];
    }
  }

  /**
   * Extrair odds dos bookmakers
   */
  extractOdds(bookmakers) {
    const odds = {};
    if (!bookmakers || bookmakers.length === 0) return odds;

    bookmakers.forEach(bookmaker => {
      const markets = bookmaker.markets || [];
      const winMarket = markets.find(m => m.key === 'h2h');
      
      if (winMarket && winMarket.outcomes) {
        odds[bookmaker.title] = winMarket.outcomes.map(outcome => ({
          name: outcome.name,
          price: parseFloat(outcome.price)
        }));
      }
    });

    return odds;
  }

  /**
   * Consolidar dados de múltiplas fontes
   */
  consolidateMatches(oddsData, sofaScoreData) {
    const matchMap = new Map();

    // Adicionar dados de The Odds API
    oddsData.forEach(match => {
      const key = `${match.homeTeam.toLowerCase()}_${match.awayTeam.toLowerCase()}`;
      if (!matchMap.has(key)) {
        matchMap.set(key, {
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          sources: []
        });
      }
      
      const consolidated = matchMap.get(key);
      consolidated.sources.push({
        name: 'The Odds API',
        odds: match.odds,
        prediction: this.predictFromOdds(match.odds)
      });
    });

    // Adicionar dados de SofaScore
    sofaScoreData.forEach(match => {
      const key = `${match.homeTeam.toLowerCase()}_${match.awayTeam.toLowerCase()}`;
      if (!matchMap.has(key)) {
        matchMap.set(key, {
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          sources: []
        });
      }
      
      const consolidated = matchMap.get(key);
      consolidated.sources.push({
        name: 'SofaScore',
        rating: match.rating,
        predictions: match.predictions,
        prediction: this.predictFromRating(match.rating)
      });
    });

    // Calcular confiança e acordo
    const result = Array.from(matchMap.values()).map(match => {
      const predictions = match.sources.map(s => s.prediction).filter(Boolean);
      const uniquePredictions = [...new Set(predictions)];
      
      const bestPrediction = uniquePredictions.length > 0 ? uniquePredictions[0] : 'Empate';
      const agreementCount = predictions.filter(p => p === bestPrediction).length;
      const agreementPercentage = Math.round((agreementCount / predictions.length) * 100) || 0;
      const confidence = Math.round(agreementPercentage * 0.8 + 20); // 20-100%

      return {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        sources: match.sources,
        bestPrediction,
        confidence: Math.min(confidence, 95),
        agreementPercentage,
        sourceCount: match.sources.length
      };
    });

    return result.filter(m => m.sourceCount >= 1);
  }

  /**
   * Prever resultado baseado em odds
   */
  predictFromOdds(odds) {
    if (!odds || Object.keys(odds).length === 0) return null;

    let lowestOdds = Infinity;
    let prediction = null;

    Object.values(odds).forEach(bookmakerOdds => {
      bookmakerOdds.forEach(outcome => {
        if (outcome.price < lowestOdds) {
          lowestOdds = outcome.price;
          prediction = outcome.name;
        }
      });
    });

    return prediction;
  }

  /**
   * Prever resultado baseado em rating
   */
  predictFromRating(rating) {
    if (!rating || rating < 50) return 'Empate';
    if (rating >= 70) return 'Vitória do Casa';
    return 'Empate';
  }

  /**
   * Formatar Top 5 previsões
   */
  formatTop5Message(predictions) {
    if (!predictions || predictions.length === 0) return null;

    const top5 = predictions.slice(0, 5);
    let message = `🏆 <b>TOP 5 MELHORES PREVISÕES - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `⭐ Análise Consolidada de Múltiplas Fontes Reais\n\n`;

    top5.forEach((match, index) => {
      message += `🥇 ${index + 1}. ${match.homeTeam} vs ${match.awayTeam}\n`;
      message += `🏆 ${match.league}\n`;
      message += `🎯 Previsão: <b>${match.bestPrediction}</b>\n`;
      message += `📈 Confiança: ${match.confidence}%\n`;
      message += `🤝 Acordo: ${match.agreementPercentage}%\n`;
      message += `📍 Fontes: ${match.sourceCount}\n\n`;
    });

    message += `📊 <b>Fontes Consultadas:</b> The Odds API, SofaScore\n`;
    message += `💡 <i>Previsões baseadas em análise consolidada de dados reais.</i>`;

    return message;
  }

  /**
   * Formatar previsões completas
   */
  formatFullMessage(predictions) {
    if (!predictions || predictions.length === 0) return null;

    let message = `📊 <b>PREVISÕES CONSOLIDADAS - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `🔍 Análise Detalhada de Múltiplas Fontes Reais\n\n`;

    predictions.slice(0, 10).forEach((match, index) => {
      message += `⚽ <b>${index + 1}. ${match.homeTeam} vs ${match.awayTeam}</b>\n`;
      message += `🏆 ${match.league}\n`;
      message += `🎯 Previsão: <b>${match.bestPrediction}</b>\n`;
      message += `📈 Confiança: ${match.confidence}%\n`;
      message += `🤝 Acordo: ${match.agreementPercentage}%\n`;
      message += `📍 Fontes: ${match.sourceCount}\n`;
      
      message += `\n<b>Análise por Fonte:</b>\n`;
      match.sources.forEach(source => {
        message += `   • <b>${source.name}:</b> ${source.prediction || 'N/A'}\n`;
      });
      
      message += `\n`;
    });

    message += `📊 <b>Fontes Principais:</b> The Odds API, SofaScore\n`;
    message += `💡 <i>Todas as previsões baseadas em dados reais.</i>`;

    return message;
  }

  /**
   * Formatar TODAS as previsões
   */
  formatAllPredictionsMessage(predictions) {
    if (!predictions || predictions.length === 0) return null;

    let message = `🏆 <b>TODAS AS PREVISÕES - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `📊 Análise Consolidada de Múltiplas Fontes Reais\n`;
    message += `📍 Fontes: The Odds API, SofaScore\n\n`;

    predictions.forEach((match, index) => {
      message += `⚽ <b>${index + 1}. ${match.homeTeam} vs ${match.awayTeam}</b>\n`;
      message += `🏆 ${match.league}\n`;
      message += `🎯 Previsão: <b>${match.bestPrediction}</b>\n`;
      message += `📈 Confiança: ${match.confidence}%\n`;
      message += `🤝 Acordo: ${match.agreementPercentage}%\n`;
      message += `📍 Fontes: ${match.sourceCount}\n\n`;
    });

    message += `✅ <b>Total de Jogos:</b> ${predictions.length}\n`;
    message += `📊 <b>Confiança Média:</b> ${Math.round(predictions.reduce((a, b) => a + b.confidence, 0) / predictions.length)}%\n`;
    message += `💡 <i>Todas as previsões baseadas em dados reais.</i>`;

    return message;
  }

  /**
   * Obter previsões com filtro de qualidade
   */
  async getPredictions() {
    const allPredictions = await this.getRealDataOnly();
    return allPredictions.filter(p => p.confidence >= 65);
  }

  /**
   * Obter TODAS as previsões sem filtro
   */
  async getAllPredictionsUnfiltered() {
    return this.getRealDataOnly();
  }
}

export default new RealDataProvider();
