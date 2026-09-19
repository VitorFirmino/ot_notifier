const LAST_UPDATED = "18 de setembro de 2026";

export const TermsOfService: React.FC = () => (
  <section className="mx-auto max-w-3xl px-5 py-32 sm:px-8">
    <h1 className="text-4xl">Termos de Serviço</h1>
    <p className="mt-2 text-sm text-text-muted">Última atualização: {LAST_UPDATED}</p>

    <div className="mt-10 space-y-8 leading-relaxed text-text-muted">
      <p>
        Estes termos regem o uso do OT Notifier, um serviço de monitoramento de guildas e personagens de servidores
        privados de Open Tibia com notificações via Discord. Ao criar uma conta ou usar o serviço, você concorda com
        estes termos.
      </p>

      <div>
        <h2 className="mb-2 text-xl text-text">1. Descrição do serviço</h2>
        <p>
          O OT Notifier verifica periodicamente páginas públicas de servidores OT que você configura, e envia
          notificações de level up, level down e mortes para o webhook do Discord que você informar. O serviço é
          oferecido "como está", sem garantia de disponibilidade contínua ou de que os dados dos servidores
          monitorados estarão sempre acessíveis.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">2. Sua conta</h2>
        <p>
          Você é responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades
          realizadas na sua conta. Informe dados verdadeiros no cadastro.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">3. Uso aceitável</h2>
        <p>Ao usar o OT Notifier, você concorda em não:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Configurar intervalos de verificação que sobrecarreguem servidores OT de terceiros;</li>
          <li>Usar o serviço para automatizar abuso, spam ou qualquer atividade ilegal;</li>
          <li>Tentar acessar áreas do sistema ou dados de outros usuários sem autorização;</li>
          <li>Fazer engenharia reversa do serviço com intenção de burlar limites de uso ou segurança.</li>
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">4. Servidores de terceiros</h2>
        <p>
          O OT Notifier depende de páginas públicas mantidas por servidores privados de Open Tibia, que não estão
          sob nosso controle. Mudanças nesses sites podem afetar temporária ou permanentemente a precisão das
          notificações. Não somos responsáveis pela disponibilidade ou conteúdo desses servidores de terceiros.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">5. Limitação de responsabilidade</h2>
        <p>
          O OT Notifier é fornecido sem garantias de qualquer tipo. Não nos responsabilizamos por perdas decorrentes
          de notificações atrasadas, ausentes ou incorretas, nem por indisponibilidade do serviço ou de servidores de
          terceiros.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">6. Encerramento</h2>
        <p>
          Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar contas que violem estes
          termos, especialmente em casos de abuso que afetem a estabilidade do serviço ou de servidores monitorados.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">7. Alterações nestes termos</h2>
        <p>
          Podemos atualizar estes termos para refletir mudanças no serviço. A data no topo desta página indica a
          versão mais recente.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">8. Lei aplicável</h2>
        <p>Estes termos são regidos pelas leis da República Federativa do Brasil.</p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">9. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a href="mailto:contato@otnotifier.com.br" className="text-accent hover:underline">
            contato@otnotifier.com.br
          </a>
          .
        </p>
      </div>
    </div>
  </section>
);
