import TelegramBot from 'node-telegram-bot-api';

/**
 * Serviço para interagir com Telegram
 */
class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.bot = new TelegramBot(this.token, { polling: false });
  }

  /**
   * Enviar mensagem para o chat
   */
  async sendMessage(text, options = {}) {
    try {
      const defaultOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      };

      const message = await this.bot.sendMessage(this.chatId, text, defaultOptions);
      console.log(`✅ Mensagem enviada com sucesso (ID: ${message.message_id})`);
      return message;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      throw error;
    }
  }

  /**
   * Enviar mensagem em múltiplas partes (se for muito grande)
   */
  async sendLongMessage(text, maxLength = 4096) {
    try {
      const parts = [];
      let currentPart = '';

      const lines = text.split('\n');
      for (const line of lines) {
        if ((currentPart + line + '\n').length > maxLength) {
          if (currentPart) {
            parts.push(currentPart);
          }
          currentPart = line + '\n';
        } else {
          currentPart += line + '\n';
        }
      }

      if (currentPart) {
        parts.push(currentPart);
      }

      console.log(`📤 Enviando ${parts.length} mensagem(ns)...`);

      for (let i = 0; i < parts.length; i++) {
        await this.sendMessage(parts[i]);
        // Pequeno delay entre mensagens
        if (i < parts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem longa:', error.message);
      throw error;
    }
  }

  /**
   * Enviar mensagem de teste
   */
  async sendTestMessage() {
    const testMessage = `🤖 <b>Bot de Previsões de Futebol</b>\n\n` +
      `✅ Bot iniciado com sucesso!\n\n` +
      `📅 Receberás previsões diárias às 7 da manhã\n` +
      `⚽ Com análise de todas as ligas e tipos de previsões\n\n` +
      `<i>Aguardando a próxima execução...</i>`;

    return this.sendMessage(testMessage);
  }

  /**
   * Enviar mensagem de erro
   */
  async sendErrorMessage(error) {
    const errorMessage = `❌ <b>Erro no Bot</b>\n\n` +
      `<code>${error.message}</code>\n\n` +
      `<i>O bot continuará a funcionar normalmente.</i>`;

    return this.sendMessage(errorMessage);
  }

  /**
   * Obter informações do bot
   */
  async getMe() {
    try {
      const me = await this.bot.getMe();
      console.log(`🤖 Bot: @${me.username}`);
      return me;
    } catch (error) {
      console.error('Erro ao obter informações do bot:', error.message);
      return null;
    }
  }
}

export default new TelegramService();
