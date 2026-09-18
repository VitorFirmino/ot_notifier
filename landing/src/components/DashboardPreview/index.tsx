export const DashboardPreview: React.FC = () => (
  <section id="preview" className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8">
    <h2 className="mb-8 text-4xl">Veja o painel por dentro</h2>
    <div className="glass-panel rounded-2xl border border-white/10 p-2">
      <img
        src="/dashboard-preview.png"
        alt="Painel do OT Notifier mostrando os servidores monitorados e o feed de eventos"
        className="w-full rounded-xl"
        loading="lazy"
        width={1200}
        height={675}
      />
    </div>
  </section>
);
