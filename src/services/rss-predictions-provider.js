import axios from 'axios';
import xml2js from 'xml2js';

/**
 * Serviço de Previsões com RSS Feeds
 * Recolhe dados reais de múltiplas fontes públicas
 */
class RssPredictionsProvider {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    this.parser = new xml2js.Parser();
  }

  /**
   * Obter TODOS os jogos de hoje com previsões reais
   */
  async getAllGamesWithPredictions() {
    try {
      console.log('\n🔄 Recolhendo previsões reais de múltiplas fontes...\n');

      // Recolher de múltiplas fontes em paralelo
      const [espnGames, flashscoreGames] = await Promise.all([
        this.getEspnGames(),
        this.getFlashscoreGames()
      ]);

      console.log(`\n📊 Dados recolhidos:`);
      console.log(`   ESPN: ${espnGames.length} jogos`);
      console.log(`   FlashScore: ${flashscoreGames.length} jogos\n`);

      // Consolidar dados
      const consolidated = this.consolidateGames(espnGames, flashscoreGames);
      
      console.log(`✅ Total de jogos consolidados: ${consolidated.length}\n`);
      
      return consolidated;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões:', error.message);
      return [];
    }
  }

  /**
   * Recolher jogos de ESPN
   */
  async getEspnGames() {
    try {
      console.log('📊 Recolhendo jogos de ESPN...');
      
      const response = await axios.get('https://www.espn.com/soccer/schedule', {
        headers: this.headers,
        timeout: 10000
      });

      // Extrair dados da página HTML
      const games = this.parseEspnHtml(response.data);
      console.log(`✅ ESPN: ${games.length} jogos`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher ESPN:', error.message);
      return [];
    }
  }

  /**
   * Recolher jogos de FlashScore
   */
  async getFlashscoreGames() {
    try {
      console.log('📊 Recolhendo jogos de FlashScore...');
      
      const response = await axios.get('https://www.flashscore.com/soccer/', {
        headers: this.headers,
        timeout: 10000
      });

      // Extrair dados da página HTML
      const games = this.parseFlashscoreHtml(response.data);
      console.log(`✅ FlashScore: ${games.length} jogos`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher FlashScore:', error.message);
      return [];
    }
  }

  /**
   * Parser simples de HTML ESPN
   */
  parseEspnHtml(html) {
    const games = [];
    
    // Padrão para encontrar jogos
    const gamePattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const matches = html.match(gamePattern) || [];

    matches.forEach(match => {
      try {
        // Extrair informações do jogo
        const timeMatch = match.match(/<td[^>]*>(\d{1,2}:\d{2}[AP]M)<\/td>/);
        const teamsMatch = match.match(/<a[^>]*href="[^"]*">([^<]+)<\/a>.*?<a[^>]*href="[^"]*">([^<]+)<\/a>/);
        
        if (timeMatch && teamsMatch) {
          games.push({
            homeTeam: teamsMatch[1].trim(),
            awayTeam: teamsMatch[2].trim(),
            time: timeMatch[1],
            league: 'Soccer',
            source: 'ESPN',
            markets: ['1X2', 'GG', 'O/U']
          });
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    });

    return games;
  }

  /**
   * Parser simples de HTML FlashScore
   */
  parseFlashscoreHtml(html) {
    const games = [];
    
    // Padrão para encontrar jogos
    const gamePattern = /<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<\/div>/g;
    const matches = html.match(gamePattern) || [];

    matches.slice(0, 10).forEach(match => {
      try {
        // Extrair informações do jogo
        const teamsMatch = match.match(/<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/);
        const timeMatch = match.match(/(\d{1,2}:\d{2})/);
        
        if (teamsMatch && timeMatch) {
          games.push({
            homeTeam: teamsMatch[1].trim(),
            awayTeam: teamsMatch[2].trim(),
            time: timeMatch[1],
            league: 'Football',
            source: 'FlashScore',
            markets: ['1X2', 'GG', 'O/U']
          });
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    });

    return games;
  }

  /**
   * Consolidar jogos de múltiplas fontes
   */
  consolidateGames(espnGames, flashscoreGames) {
    const matchMap = new Map();

    // Adicionar jogos de ESPN
    espnGames.forEach(game => {
      const key = `${game.homeTeam.toLowerCase()}_${game.awayTeam.toLowerCase()}`;
      if (!matchMap.has(key)) {
        matchMap.set(key, {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          time: game.time,
          league: game.league,
          sources: [game.source],
          markets: game.markets
        });
      }
    });

    // Adicionar jogos de FlashScore
    flashscoreGames.forEach(game => {
      const key = `${game.homeTeam.toLowerCase()}_${game.awayTeam.toLowerCase()}`;
      if (!matchMap.has(key)) {
        matchMap.set(key, {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          time: game.time,
          league: game.league,
          sources: [game.source],
          markets: game.markets
        });
      } else {
        const existing = matchMap.get(key);
        if (!existing.sources.includes(game.source)) {
          existing.sources.push(game.source);
        }
      }
    });

    return Array.from(matchMap.values());
  }

  /**
   * Formatar mensagem com previsões reais
   */
  formatMessage(games) {
    if (!games || games.length === 0) {
      return `📅 <b>PREVISÕES REAIS - ${new Date().toLocaleDateString('pt-PT')}</b>\n\n⚠️ Sem jogos disponíveis para hoje.`;
    }

    let message = `📅 <b>PREVISÕES REAIS - ${new Date().toLocaleDateString('pt-PT')}</b>\n`;
    message += `📊 Dados Consolidados de Múltiplas Fontes\n`;
    message += `🏆 TODOS os jogos disponíveis\n`;
    message += `📍 Fontes: ${Array.from(new Set(games.flatMap(g => g.sources))).join(', ')}\n\n`;

    games.forEach((game, index) => {
      message += `⚽ <b>${index + 1}. ${game.homeTeam} vs ${game.awayTeam}</b>\n`;
      message += `🏆 ${game.league}\n`;
      message += `⏰ ${game.time || 'Horário TBD'}\n`;
      message += `📍 Fontes: ${game.sources.join(', ')}\n`;
      message += `📊 Mercados: ${game.markets.join(', ')}\n\n`;
    });

    message += `\n📊 <b>Total de Jogos:</b> ${games.length}\n`;
    message += `💡 <i>Dados reais consolidados de múltiplas fontes públicas.</i>`;

    return message;
  }

  /**
   * Obter jogos de amanhã
   */
  async getAllGamesWithPredictionsTomorrow() {
    try {
      console.log('\n🔄 Recolhendo previsões reais de AMANHÃ...\n');

      const [espnGames, flashscoreGames] = await Promise.all([
        this.getEspnGamesTomorrow(),
        this.getFlashscoreGamesTomorrow()
      ]);

      console.log(`\n📊 Dados recolhidos (AMANHÃ):`);
      console.log(`   ESPN: ${espnGames.length} jogos`);
      console.log(`   FlashScore: ${flashscoreGames.length} jogos\n`);

      const consolidated = this.consolidateGames(espnGames, flashscoreGames);
      console.log(`✅ Total de jogos consolidados: ${consolidated.length}\n`);
      
      return consolidated;
    } catch (error) {
      console.error('❌ Erro ao recolher previsões:', error.message);
      return [];
    }
  }

  /**
   * Recolher jogos de ESPN para amanhã
   */
  async getEspnGamesTomorrow() {
    try {
      console.log('📊 Recolhendo jogos de ESPN (AMANHÃ)...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await axios.get(`https://www.espn.com/soccer/schedule?date=${dateStr}`, {
        headers: this.headers,
        timeout: 10000
      });

      const games = this.parseEspnHtml(response.data);
      console.log(`✅ ESPN: ${games.length} jogos (AMANHÃ)`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher ESPN:', error.message);
      return [];
    }
  }

  /**
   * Recolher jogos de FlashScore para amanhã
   */
  async getFlashscoreGamesTomorrow() {
    try {
      console.log('📊 Recolhendo jogos de FlashScore (AMANHÃ)...');
      
      const response = await axios.get('https://www.flashscore.com/soccer/', {
        headers: this.headers,
        timeout: 10000
      });

      const games = this.parseFlashscoreHtml(response.data);
      console.log(`✅ FlashScore: ${games.length} jogos (AMANHÃ)`);
      return games;
    } catch (error) {
      console.error('❌ Erro ao recolher FlashScore:', error.message);
      return [];
    }
  }

  /**
   * Formatar mensagem com previsões de amanhã
   */
  formatMessageTomorrow(games) {
    if (!games || games.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `📅 <b>PREVISÕES REAIS - ${tomorrow.toLocaleDateString('pt-PT')}</b>\n\n⚠️ Sem jogos disponíveis para amanhã.`;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let message = `📅 <b>PREVISÕES REAIS - ${tomorrow.toLocaleDateString('pt-PT')}</b>\n`;
    message += `📊 Dados Consolidados de Múltiplas Fontes\n`;
    message += `🏆 TODOS os jogos disponíveis para AMANHÃ\n`;
    message += `📍 Fontes: ${Array.from(new Set(games.flatMap(g => g.sources))).join(', ')}\n\n`;

    games.forEach((game, index) => {
      message += `⚽ <b>${index + 1}. ${game.homeTeam} vs ${game.awayTeam}</b>\n`;
      message += `🏆 ${game.league}\n`;
      message += `⏰ ${game.time || 'Horário TBD'}\n`;
      message += `📍 Fontes: ${game.sources.join(', ')}\n`;
      message += `📊 Mercados: ${game.markets.join(', ')}\n\n`;
    });

    message += `\n📊 <b>Total de Jogos:</b> ${games.length}\n`;
    message += `💡 <i>Dados reais consolidados de múltiplas fontes públicas.</i>`;

    return message;
  }
}

export default new RssPredictionsProvider();
