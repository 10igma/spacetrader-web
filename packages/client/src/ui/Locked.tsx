import { IconLock } from './icons.tsx';

export function Locked({ title, text, phase }: { title: string; text: string; phase: string }) {
  return (
    <section className="locked">
      <div className="locked__icon"><IconLock /></div>
      <h2>{title}</h2>
      <p>{text}</p>
      <span className="chip">Folgt in {phase}</span>
    </section>
  );
}
