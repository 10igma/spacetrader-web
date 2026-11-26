import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { planReminders, type ClientView, type ReminderKind } from '@nova/core';

/** One fixed id per kind: planning again replaces what was planned before. */
const IDS: Record<ReminderKind, number> = { convoy: 1, crate: 2, freeCrate: 3, fuel: 4, posts: 5, streak: 6, weekend: 7, season: 8 };

const TEXT: Record<ReminderKind, { title: string; body: string }> = {
  convoy: { title: 'Konvoi zurück', body: 'Deine Crew ist wieder da und wartet mit der Fracht.' },
  crate: { title: 'Container entsiegelt', body: 'Im Hangar wartet ein Container auf dich.' },
  freeCrate: { title: 'Gratis-Lieferung', body: 'Das Lager ist voll. Es kommt nichts nach, bis du öffnest.' },
  fuel: { title: 'Tank voll', body: 'Dein Schiff ist startklar.' },
  posts: { title: 'Lager voll', body: 'Ein Handelsposten verdient nichts mehr, bis du abholst.' },
  streak: { title: 'Deine Serie endet heute', body: 'Ein Sprung genügt, um sie zu halten.' },
  weekend: { title: 'Blockade-Lauf', body: 'Das Wochenend-Event läuft: Hehler zahlen mehr, der Zoll schaut genauer hin.' },
  season: { title: 'Die Saison endet morgen', body: 'Charter und Saison-Album schliessen in 24 Stunden.' },
};

export const remindersAvailable = Capacitor.isNativePlatform();

/** Ask the system for permission. Only ever called from the player's own tap on the switch. */
export async function askForReminders(): Promise<boolean> {
  if (!remindersAvailable) return false;
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

export async function clearReminders(): Promise<void> {
  if (!remindersAvailable) return;
  try { await LocalNotifications.cancel({ notifications: Object.values(IDS).map((id) => ({ id })) }); } catch { /* nothing planned */ }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Plan reminders for the game as it stands. Called on every change and when the app goes to the background. */
export function syncReminders(view: ClientView, enabled: boolean, immediately = false): void {
  if (!remindersAvailable) return;
  clearTimeout(timer);
  const run = async (): Promise<void> => {
    await clearReminders();
    if (!enabled) return;
    const plan = planReminders(view, Date.now(), { utcOffsetMin: -new Date().getTimezoneOffset() });
    if (plan.length === 0) return;
    try {
      await LocalNotifications.schedule({
        notifications: plan.map((r) => ({
          id: IDS[r.kind],
          title: TEXT[r.kind].title,
          body: TEXT[r.kind].body,
          // Close enough is fine: no need for the exact-alarm permission and its system screen.
          isExactNotification: false,
          schedule: { at: new Date(r.at), allowWhileIdle: true },
        })),
      });
    } catch { /* permission withdrawn in system settings: the switch stays, nothing is shown */ }
  };
  if (immediately) void run(); else timer = setTimeout(() => void run(), 1500);
}
