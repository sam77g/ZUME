// Notificações locais de fim de sessão (Pomodoro).
// No navegador (web) o plugin não agenda nada de verdade — as funções abaixo
// verificam Capacitor.isNativePlatform() e não fazem nada fora do app nativo.
// Quando o Android for adicionado (Capacitor), isso já funciona sem mudanças.
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const ID_NOTIFICACAO = 1;

export async function pedirPermissaoNotificacoes() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.requestPermissions();
  } catch (e) {
    console.warn("Permissão de notificação não concedida:", e);
  }
}

export async function agendarNotificacaoFimSessao(segundosRestantes, tipo) {
  if (!Capacitor.isNativePlatform()) return;
  if (!segundosRestantes || segundosRestantes <= 0) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID_NOTIFICACAO }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: ID_NOTIFICACAO,
          title: tipo === "pausa" ? "⏰ Pausa terminando!" : "🍅 Sessão concluída!",
          body: tipo === "pausa" ? "Volte ao foco em breve." : "Hora de descansar. Ótimo trabalho!",
          schedule: { at: new Date(Date.now() + segundosRestantes * 1000) },
        },
      ],
    });
  } catch (e) {
    console.warn("Não foi possível agendar notificação:", e);
  }
}

export async function cancelarNotificacaoFimSessao() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID_NOTIFICACAO }] });
  } catch {
    /* silencioso */
  }
}
