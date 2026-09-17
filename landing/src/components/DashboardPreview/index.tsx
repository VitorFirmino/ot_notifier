export const DashboardPreview: React.FC = () => (
  <section id="preview" className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8">
    <h2 className="mb-8 text-3xl">Veja o painel por dentro</h2>
    <img
      src="/dashboard-preview.png"
      alt="Painel do OT Notifier mostrando os servidores monitorados e o feed de eventos"
      className="w-full rounded-xl border border-white/10"
      loading="lazy"
      width={1200}
      height={675}
    />
  </section>
);
