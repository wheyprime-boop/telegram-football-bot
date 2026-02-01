import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Serviço de Web Scraping para recolher previsões de múltiplos sites
 */
class ScraperService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
  }

  /**
   * Recolher previsões do Predictz
   */
  async getPredictionsFromPredicz() {
    try {
      console.log('🔄 Recolhendo previsões do Predictz...');
      const response = await axios.get('https://www.predictz.com/', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const predictions = [];

      // Procurar por elementos de previsões
      $('tr').each((index, element) => {
        const row = $(element);
        const homeTeam = row.find('td:nth-child(1)').text().trim();
        const awayTeam = row.find('td:nth-child(3)').text().trim();
        const prediction = row.find('td:nth-child(4)').text().trim();
        const confidence = row.find('td:nth-child(5)').text().trim();

        if (homeTeam && awayTeam && prediction) {
          predictions.push({
            source: 'Predictz',
            homeTeam,
            awayTeam,
            prediction,
            confidence
          });
        }
      });

      console.log(`✅ Encontradas ${predictions.length} previsões no Predictz`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do Predictz:', error.message);
      return [];
    }
  }

  /**
   * Recolher previsões do Betexplorer
   */
  async getPredictionsFromBetexplorer() {
    try {
      console.log('🔄 Recolhendo previsões do Betexplorer...');
      const response = await axios.get('https://www.betexplorer.com/today/', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const predictions = [];

      // Procurar por elementos de previsões
      $('tr.tr-matches').each((index, element) => {
        const row = $(element);
        const teams = row.find('td.table-team').text().trim();
        const odds = row.find('td.odds').text().trim();

        if (teams && odds) {
          const [homeTeam, awayTeam] = teams.split('-').map(t => t.trim());
          predictions.push({
            source: 'Betexplorer',
            homeTeam,
            awayTeam,
            odds,
            time: row.find('td.table-time').text().trim()
          });
        }
      });

      console.log(`✅ Encontradas ${predictions.length} previsões no Betexplorer`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do Betexplorer:', error.message);
      return [];
    }
  }

  /**
   * Recolher dados do FlashScore
   */
  async getMatchesFromFlashscore() {
    try {
      console.log('🔄 Recolhendo dados do FlashScore...');
      const response = await axios.get('https://www.flashscore.com/', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const matches = [];

      // Procurar por elementos de jogos
      $('div[class*="event"]').each((index, element) => {
        const match = $(element);
        const homeTeam = match.find('span[class*="home"]').text().trim();
        const awayTeam = match.find('span[class*="away"]').text().trim();
        const time = match.find('span[class*="time"]').text().trim();
        const league = match.find('span[class*="league"]').text().trim();

        if (homeTeam && awayTeam) {
          matches.push({
            source: 'FlashScore',
            homeTeam,
            awayTeam,
            time,
            league
          });
        }
      });

      console.log(`✅ Encontrados ${matches.length} jogos no FlashScore`);
      return matches;
    } catch (error) {
      console.error('❌ Erro ao recolher dados do FlashScore:', error.message);
      return [];
    }
  }

  /**
   * Recolher previsões do SofaScore (via API pública)
   */
  async getPredictionsFromSofascore() {
    try {
      console.log('🔄 Recolhendo previsões do SofaScore...');
      
      // SofaScore tem uma API não oficial mas acessível
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(
        `https://api.sofascore.com/api/v1/sport/football/events/${today}`,
        {
          headers: this.headers,
          timeout: 10000
        }
      );

      const events = response.data.events || [];
      const predictions = [];

      for (const event of events.slice(0, 20)) {
        // Limitar a 20 eventos
        if (event.homeTeam && event.awayTeam) {
          predictions.push({
            source: 'SofaScore',
            homeTeam: event.homeTeam.name,
            awayTeam: event.awayTeam.name,
            time: event.startTimestamp ? new Date(event.startTimestamp * 1000).toLocaleTimeString('pt-PT') : 'N/A',
            league: event.tournament?.name || 'N/A',
            status: event.status
          });
        }
      }

      console.log(`✅ Encontradas ${predictions.length} previsões no SofaScore`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do SofaScore:', error.message);
      return [];
    }
  }

  /**
   * Recolher previsões do ESPN
   */
  async getPredictionsFromEspn() {
    try {
      console.log('🔄 Recolhendo previsões do ESPN...');
      const response = await axios.get('https://www.espn.com/soccer/', {
        headers: this.headers,
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const predictions = [];

      // Procurar por elementos de previsões
      $('article[class*="match"]').each((index, element) => {
        const article = $(element);
        const homeTeam = article.find('span[class*="home"]').text().trim();
        const awayTeam = article.find('span[class*="away"]').text().trim();
        const prediction = article.find('span[class*="prediction"]').text().trim();

        if (homeTeam && awayTeam) {
          predictions.push({
            source: 'ESPN',
            homeTeam,
            awayTeam,
            prediction
          });
        }
      });

      console.log(`✅ Encontradas ${predictions.length} previsões no ESPN`);
      return predictions;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões do ESPN:', error.message);
      return [];
    }
  }

  /**
   * Consolidar previsões de múltiplas fontes
   */
  async getAllPredictions() {
    console.log('\n📊 Iniciando recolha de previsões de múltiplas fontes...\n');

    try {
      // Recolher de todas as fontes em paralelo
      const [sofascore, predictz, betexplorer, flashscore, espn] = await Promise.all([
        this.getPredictionsFromSofascore().catch(() => []),
        this.getPredictionsFromPredicz().catch(() => []),
        this.getPredictionsFromBetexplorer().catch(() => []),
        this.getMatchesFromFlashscore().catch(() => []),
        this.getPredictionsFromEspn().catch(() => [])
      ]);

      // Consolidar todas as previsões
      const allPredictions = [
        ...sofascore,
        ...predictz,
        ...betexplorer,
        ...flashscore,
        ...espn
      ];

      console.log(`\n✅ Total de previsões recolhidas: ${allPredictions.length}`);

      return allPredictions;
    } catch (error) {
      console.error('❌ Erro ao consolidar previsões:', error.message);
      return [];
    }
  }

  /**
   * Formatar previsões para mensagem do Telegram
   */
  formatPredictionsMessage(predictions) {
    if (predictions.length === 0) {
      return null;
    }

    // Agrupar por jogo
    const groupedByMatch = {};
    predictions.forEach(pred => {
      const matchKey = `${pred.homeTeam} vs ${pred.awayTeam}`;
      if (!groupedByMatch[matchKey]) {
        groupedByMatch[matchKey] = [];
      }
      groupedByMatch[matchKey].push(pred);
    });

    let message = `📅 <b>PREVISÕES DE FUTEBOL - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `📊 Dados recolhidos de múltiplas fontes\n\n`;
    message += `Total de jogos: ${Object.keys(groupedByMatch).length}\n`;
    message += `Total de previsões: ${predictions.length}\n`;
    message += `${'═'.repeat(50)}\n\n`;

    let matchCount = 0;
    for (const [matchKey, preds] of Object.entries(groupedByMatch)) {
      matchCount++;
      const [homeTeam, awayTeam] = matchKey.split(' vs ');

      message += `⚽ <b>${matchCount}. ${homeTeam} vs ${awayTeam}</b>\n`;

      // Mostrar informações do primeiro resultado (geralmente tem mais dados)
      const mainPred = preds[0];
      if (mainPred.time) {
        message += `🕐 ${mainPred.time}\n`;
      }
      if (mainPred.league) {
        message += `🏆 ${mainPred.league}\n`;
      }

      // Mostrar previsões de diferentes fontes
      message += `\n📌 <b>Previsões:</b>\n`;
      const sources = new Set();
      preds.forEach(pred => {
        if (pred.prediction && !sources.has(pred.source)) {
          message += `   • ${pred.source}: ${pred.prediction}\n`;
          sources.add(pred.source);
        }
      });

      if (mainPred.confidence) {
        message += `💪 Confiança: ${mainPred.confidence}\n`;
      }

      if (mainPred.odds) {
        message += `💰 Odds: ${mainPred.odds}\n`;
      }

      message += `\n${'─'.repeat(50)}\n\n`;

      // Limitar a 15 jogos por mensagem
      if (matchCount >= 15) {
        break;
      }
    }

    message += `\n✅ <b>Total de previsões:</b> ${matchCount} jogos\n`;
    message += `\n📍 <b>Fontes:</b> Predictz, Betexplorer, FlashScore, SofaScore, ESPN\n`;
    message += `\n💡 <i>Estas previsões são baseadas em análise estatística de múltiplas fontes.</i>\n`;
    message += `<i>Joga com responsabilidade!</i>`;

    return message;
  }
}

export default new ScraperService();
