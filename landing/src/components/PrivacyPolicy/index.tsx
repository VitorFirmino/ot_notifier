const LAST_UPDATED = "18 de setembro de 2026";

export const PrivacyPolicy: React.FC = () => (
  <section className="mx-auto max-w-3xl px-5 py-32 sm:px-8">
    <h1 className="text-4xl">Política de Privacidade</h1>
    <p className="mt-2 text-sm text-text-muted">Última atualização: {LAST_UPDATED}</p>

    <div className="mt-10 space-y-8 leading-relaxed text-text-muted">
      <p>
        Esta política explica quais dados o OT Notifier coleta, para que servem e como você pode controlá-los.
        O OT Notifier é um serviço de monitoramento de guildas e personagens de servidores privados de Open Tibia,
        que envia notificações de level up, level down e mortes para um canal do Discord escolhido por você.
      </p>

      <div>
        <h2 className="mb-2 text-xl text-text">1. Dados que coletamos</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-text">Dados de conta:</strong> nome, e-mail e senha (armazenada com hash) quando
            você se cadastra diretamente, ou nome, e-mail e foto de perfil quando você entra com sua conta Google.
          </li>
          <li>
            <strong className="text-text">Dados de configuração:</strong> URLs de servidores OT, nomes de guildas e
            personagens que você escolhe monitorar. Esses dados já são públicos nos próprios sites dos servidores.
          </li>
          <li>
            <strong className="text-text">Webhook do Discord:</strong> a URL de webhook que você cadastra para
            receber as notificações no seu servidor do Discord.
          </li>
          <li>
            <strong className="text-text">Cookies de sessão:</strong> usados apenas para manter você autenticado no
            painel. Não usamos cookies de rastreamento ou publicidade.
          </li>
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">2. Como usamos esses dados</h2>
        <p>
          Usamos os dados exclusivamente para operar o serviço: autenticar seu acesso ao painel, verificar
          periodicamente os personagens configurados e enviar as notificações para o webhook do Discord que você
          informou. Não usamos seus dados para publicidade e não os vendemos a terceiros.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">3. Compartilhamento de dados</h2>
        <p>
          As notificações são enviadas diretamente para o webhook do Discord que você configurou — o OT Notifier não
          tem acesso ao conteúdo do seu servidor do Discord além de postar essas mensagens. Se você entra com o
          Google, apenas os dados básicos de perfil (nome, e-mail, foto) são recebidos do Google, conforme os termos
          do próprio Google.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">4. Retenção e exclusão</h2>
        <p>
          Seus dados de conta e configuração ficam armazenados enquanto sua conta estiver ativa. Você pode excluir
          suas guildas e servidores monitorados a qualquer momento pelo painel, e pode solicitar a exclusão completa
          da sua conta pelo contato abaixo.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">5. Segurança</h2>
        <p>
          Senhas são armazenadas com hash, a comunicação com o painel é feita via HTTPS e os cookies de sessão são
          HttpOnly. Nenhum sistema é 100% livre de falhas, mas adotamos práticas razoáveis de segurança para proteger
          seus dados.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">6. Seus direitos</h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados (LGPD), você pode solicitar a qualquer momento acesso,
          correção ou exclusão dos seus dados pessoais, pelo contato abaixo.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">7. Alterações nesta política</h2>
        <p>
          Podemos atualizar esta política para refletir mudanças no serviço. A data no topo desta página indica a
          versão mais recente.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl text-text">8. Contato</h2>
        <p>
          Dúvidas sobre esta política ou sobre seus dados podem ser enviadas para{" "}
          <a href="mailto:contato@otnotifier.com.br" className="text-accent hover:underline">
            contato@otnotifier.com.br
          </a>
          .
        </p>
      </div>
    </div>
  </section>
);
