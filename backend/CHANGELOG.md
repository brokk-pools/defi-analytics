# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2024-01-11

### Adicionado
- ✅ Integração completa com `@orca-so/whirlpools-sdk`
- ✅ Nova rota `/poolsdetails/:poolid` com análise detalhada de pools
- ✅ Parâmetro `showpositions` para controle de performance
- ✅ Dados estruturados para visualizações de range e liquidez
- ✅ Função `getFullPoolData()` com dados completos de ticks
- ✅ Análise de range com `ticksAroundCurrent` e `liquidityConcentration`
- ✅ Cálculo de preços ajustados para diferentes tokens
- ✅ Estatísticas de liquidez e concentração
- ✅ Função auxiliar `calculateAdjustedPrice()` para preços precisos
- ✅ Suporte para tokens conhecidos (SOL, USDC, USDT, RAY, mSOL, ORCA)
- ✅ Documentação completa atualizada
- ✅ Sistema de logging aprimorado

### Modificado
- 🔄 Refatoração completa do `src/lib/orca.ts` para usar SDK oficial
- 🔄 Função `getPositionsByOwner()` agora usa SDK do Orca
- 🔄 Função `getPositionData()` com dados mais detalhados
- 🔄 Função `calculateEstimatedFees()` melhorada
- 🔄 Função `getLiquidityOverview()` com estatísticas agregadas
- 🔄 Estrutura de dados de ticks completamente reformulada
- 🔄 Sistema de contexto do Whirlpool usando `WhirlpoolContext.withProvider()`

### Removido
- ❌ Função `initializeOrcaConfig()` (não mais necessária)
- ❌ Arquivo `src/routes/pools-detail.ts` (substituído por `pools-details.ts`)
- ❌ Arquivo `PERFORMANCE_ANALYSIS.md` (conteúdo integrado ao README)
- ❌ Parsing manual de dados de posições (agora usa SDK)

### Breaking Changes
- ⚠️ Rota `/pools-detail/:poolid` substituída por `/poolsdetails/:poolid`
- ⚠️ Estrutura de resposta de ticks completamente alterada
- ⚠️ Função `initializeOrcaConfig()` removida
- ⚠️ Imports do `@orca-so/whirlpools` substituídos por `@orca-so/whirlpools-sdk`

### Dependências
- ➕ Adicionado `@orca-so/whirlpools-sdk@^0.16.0`
- ➕ Adicionado `@orca-so/common-sdk@^0.6.11`
- ➕ Adicionado `@coral-xyz/anchor@0.29.0`
- ➕ Adicionado `decimal.js@^10.6.0`
- 🔄 Atualizado `@solana/spl-token@^0.4.14`
- 🔄 Atualizado `@coral-xyz/anchor@^0.29.0`

## [0.9.0] - 2024-01-10

### Adicionado
- ✅ Rota `/poolsdetail/:poolid` (versão anterior)
- ✅ Análise de performance e configuração de alta performance
- ✅ Sistema de logging com Winston
- ✅ Middleware de segurança e rate limiting

### Modificado
- 🔄 Estrutura de rotas reorganizada
- 🔄 Sistema de tratamento de erros aprimorado

## [0.8.0] - 2024-01-09

### Adicionado
- ✅ Dependências `@orca-so/whirlpools-sdk` e `@solana/kit`
- ✅ Sistema de migração de banco de dados
- ✅ Validação de variáveis de ambiente

### Modificado
- 🔄 Resolução de erros de TypeScript
- 🔄 Estrutura de projeto aprimorada

---

## Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Versionamento

Este projeto usa [Semantic Versioning](https://semver.org/lang/pt-BR/). Para as versões disponíveis, veja as [tags neste repositório](https://github.com/seu-usuario/orca-whirlpools-mvp/tags).

## Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.


