# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.9.2] - 2025-01-16

### Corrigido
- 🔧 **Correção da classe BN** - Importação correta usando `bn.js` em vez do Anchor
- 🔧 **Erro de 53 bits resolvido** - Substituição de `.toNumber()` por métodos seguros para números grandes
- 🔧 **Conversões de decimais** - Todas as quantidades A e B agora vêm convertidas pelos decimais corretos
- 🔧 **Tipos TypeScript** - Instalação de `@types/bn.js` para suporte completo de tipos
- 🔧 **Análise financeira melhorada** - Cálculo de HODL value usando quantidades iniciais com preços atuais
- 🔧 **Consistência de dados** - Padronização de conversões em `investment`, `feesCollected`, `withdraw` e `feesUncollected`

### Adicionado
- ✅ **Suporte completo a tipos BN** - Importação e uso correto da biblioteca `bn.js`
- ✅ **Conversões seguras de números grandes** - Uso de `parseFloat()` e `.toString()` para evitar perda de precisão
- ✅ **Documentação atualizada** - Detalhes sobre as correções de tipos e conversões

## [1.9.1] - 2025-01-15

### Corrigido
- 🔧 **Tipos Decimal corrigidos** em `orca.ts` - import e funções agora usam `Decimal` corretamente
- 🔧 **Função `tickToSqrtPrice()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `q64ToFloat()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `amountsFromLiquidityDecimal()`** agora funciona corretamente com tipos `Decimal`
- 🔧 **Erros de compilação TypeScript** relacionados aos tipos `Decimal` resolvidos

## [1.9.0] - 2025-01-15

### Adicionado
- ✅ **Nova rota `/tickarray/:poolId`** para buscar dados dos TickArrays usando RPC direto
- ✅ **Função `GetTickData()`** implementada em `orca.ts` com parse direto dos dados
- ✅ **Integração de gas real** na rota `/analytics` via `GetGasInPosition`
- ✅ **Sistema de requisições pendentes** para evitar chamadas duplicadas à CoinGecko API
- ✅ **Cache melhorado** com TTL de 10 minutos e fallback inteligente
- ✅ **Documentação atualizada** com novas rotas e funcionalidades

### Modificado
- 🔄 **Função `processPositionDataFromRaw()`** agora usa RPC direto em vez do SDK
- 🔄 **Sistema de cache de preços** otimizado com prevenção de chamadas duplicadas
- 🔄 **Rota `/analytics`** agora retorna dados reais de gas em vez de valores zerados
- 🔄 **Coleção Postman** atualizada com novas rotas e parâmetros corrigidos
- 🔄 **README.md** expandido com documentação completa das novas funcionalidades

### Removido
- ❌ **Parâmetro `showTicks`** da rota `/position` (implementação removida)
- ❌ **Dependência do SDK** para busca de dados de pool em `processPositionDataFromRaw`
- ❌ **Valores zerados de gas** na rota `/analytics`

### Corrigido
- 🐛 **Erros de compilação** relacionados a tipos TypeScript
- 🐛 **Rate limits da CoinGecko API** com sistema de cache robusto
- 🐛 **Chamadas duplicadas** para APIs externas com sistema de requisições pendentes

## [1.8.0] - 2025-01-14

### Adicionado
- ✅ **Sistema de cache inteligente** para preços da CoinGecko API
- ✅ **Cache em memória** com TTL configurável (5 minutos)
- ✅ **Fallback automático** para cache expirado em caso de rate limits
- ✅ **Tratamento de rate limits** (erro 429) com recuperação automática
- ✅ **Logs detalhados** para monitoramento de performance do cache
- ✅ **Chaves de cache inteligentes** separadas para preços atuais e históricos

### Modificado
- 🔄 **Migração completa** de Helius API para CoinGecko API
- 🔄 **Função `getCurrentPrice()`** agora com sistema de cache integrado
- 🔄 **Função `getHistoricalPrice()`** com cache para preços históricos
- 🔄 **Tratamento de erros** melhorado com fallback para cache
- 🔄 **Documentação atualizada** refletindo mudanças de API
- 🔄 **Configuração simplificada** sem necessidade de chaves de API

### Removido
- ❌ **Dependência da Helius API** para preços
- ❌ **Configuração HELIUS_API_KEY** do .env
- ❌ **Referências à Helius** na documentação

### Corrigido
- 🐛 **Rate limit issues** resolvidos com sistema de cache
- 🐛 **Falhas de preços** em caso de limite de API excedido
- 🐛 **Performance** melhorada com cache inteligente

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



Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.9.1] - 2025-01-15

### Corrigido
- 🔧 **Tipos Decimal corrigidos** em `orca.ts` - import e funções agora usam `Decimal` corretamente
- 🔧 **Função `tickToSqrtPrice()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `q64ToFloat()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `amountsFromLiquidityDecimal()`** agora funciona corretamente com tipos `Decimal`
- 🔧 **Erros de compilação TypeScript** relacionados aos tipos `Decimal` resolvidos

## [1.9.0] - 2025-01-15

### Adicionado
- ✅ **Nova rota `/tickarray/:poolId`** para buscar dados dos TickArrays usando RPC direto
- ✅ **Função `GetTickData()`** implementada em `orca.ts` com parse direto dos dados
- ✅ **Integração de gas real** na rota `/analytics` via `GetGasInPosition`
- ✅ **Sistema de requisições pendentes** para evitar chamadas duplicadas à CoinGecko API
- ✅ **Cache melhorado** com TTL de 10 minutos e fallback inteligente
- ✅ **Documentação atualizada** com novas rotas e funcionalidades

### Modificado
- 🔄 **Função `processPositionDataFromRaw()`** agora usa RPC direto em vez do SDK
- 🔄 **Sistema de cache de preços** otimizado com prevenção de chamadas duplicadas
- 🔄 **Rota `/analytics`** agora retorna dados reais de gas em vez de valores zerados
- 🔄 **Coleção Postman** atualizada com novas rotas e parâmetros corrigidos
- 🔄 **README.md** expandido com documentação completa das novas funcionalidades

### Removido
- ❌ **Parâmetro `showTicks`** da rota `/position` (implementação removida)
- ❌ **Dependência do SDK** para busca de dados de pool em `processPositionDataFromRaw`
- ❌ **Valores zerados de gas** na rota `/analytics`

### Corrigido
- 🐛 **Erros de compilação** relacionados a tipos TypeScript
- 🐛 **Rate limits da CoinGecko API** com sistema de cache robusto
- 🐛 **Chamadas duplicadas** para APIs externas com sistema de requisições pendentes

## [1.8.0] - 2025-01-14

### Adicionado
- ✅ **Sistema de cache inteligente** para preços da CoinGecko API
- ✅ **Cache em memória** com TTL configurável (5 minutos)
- ✅ **Fallback automático** para cache expirado em caso de rate limits
- ✅ **Tratamento de rate limits** (erro 429) com recuperação automática
- ✅ **Logs detalhados** para monitoramento de performance do cache
- ✅ **Chaves de cache inteligentes** separadas para preços atuais e históricos

### Modificado
- 🔄 **Migração completa** de Helius API para CoinGecko API
- 🔄 **Função `getCurrentPrice()`** agora com sistema de cache integrado
- 🔄 **Função `getHistoricalPrice()`** com cache para preços históricos
- 🔄 **Tratamento de erros** melhorado com fallback para cache
- 🔄 **Documentação atualizada** refletindo mudanças de API
- 🔄 **Configuração simplificada** sem necessidade de chaves de API

### Removido
- ❌ **Dependência da Helius API** para preços
- ❌ **Configuração HELIUS_API_KEY** do .env
- ❌ **Referências à Helius** na documentação

### Corrigido
- 🐛 **Rate limit issues** resolvidos com sistema de cache
- 🐛 **Falhas de preços** em caso de limite de API excedido
- 🐛 **Performance** melhorada com cache inteligente

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



Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.9.1] - 2025-01-15

### Corrigido
- 🔧 **Tipos Decimal corrigidos** em `orca.ts` - import e funções agora usam `Decimal` corretamente
- 🔧 **Função `tickToSqrtPrice()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `q64ToFloat()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `amountsFromLiquidityDecimal()`** agora funciona corretamente com tipos `Decimal`
- 🔧 **Erros de compilação TypeScript** relacionados aos tipos `Decimal` resolvidos

## [1.9.0] - 2025-01-15

### Adicionado
- ✅ **Nova rota `/tickarray/:poolId`** para buscar dados dos TickArrays usando RPC direto
- ✅ **Função `GetTickData()`** implementada em `orca.ts` com parse direto dos dados
- ✅ **Integração de gas real** na rota `/analytics` via `GetGasInPosition`
- ✅ **Sistema de requisições pendentes** para evitar chamadas duplicadas à CoinGecko API
- ✅ **Cache melhorado** com TTL de 10 minutos e fallback inteligente
- ✅ **Documentação atualizada** com novas rotas e funcionalidades

### Modificado
- 🔄 **Função `processPositionDataFromRaw()`** agora usa RPC direto em vez do SDK
- 🔄 **Sistema de cache de preços** otimizado com prevenção de chamadas duplicadas
- 🔄 **Rota `/analytics`** agora retorna dados reais de gas em vez de valores zerados
- 🔄 **Coleção Postman** atualizada com novas rotas e parâmetros corrigidos
- 🔄 **README.md** expandido com documentação completa das novas funcionalidades

### Removido
- ❌ **Parâmetro `showTicks`** da rota `/position` (implementação removida)
- ❌ **Dependência do SDK** para busca de dados de pool em `processPositionDataFromRaw`
- ❌ **Valores zerados de gas** na rota `/analytics`

### Corrigido
- 🐛 **Erros de compilação** relacionados a tipos TypeScript
- 🐛 **Rate limits da CoinGecko API** com sistema de cache robusto
- 🐛 **Chamadas duplicadas** para APIs externas com sistema de requisições pendentes

## [1.8.0] - 2025-01-14

### Adicionado
- ✅ **Sistema de cache inteligente** para preços da CoinGecko API
- ✅ **Cache em memória** com TTL configurável (5 minutos)
- ✅ **Fallback automático** para cache expirado em caso de rate limits
- ✅ **Tratamento de rate limits** (erro 429) com recuperação automática
- ✅ **Logs detalhados** para monitoramento de performance do cache
- ✅ **Chaves de cache inteligentes** separadas para preços atuais e históricos

### Modificado
- 🔄 **Migração completa** de Helius API para CoinGecko API
- 🔄 **Função `getCurrentPrice()`** agora com sistema de cache integrado
- 🔄 **Função `getHistoricalPrice()`** com cache para preços históricos
- 🔄 **Tratamento de erros** melhorado com fallback para cache
- 🔄 **Documentação atualizada** refletindo mudanças de API
- 🔄 **Configuração simplificada** sem necessidade de chaves de API

### Removido
- ❌ **Dependência da Helius API** para preços
- ❌ **Configuração HELIUS_API_KEY** do .env
- ❌ **Referências à Helius** na documentação

### Corrigido
- 🐛 **Rate limit issues** resolvidos com sistema de cache
- 🐛 **Falhas de preços** em caso de limite de API excedido
- 🐛 **Performance** melhorada com cache inteligente

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



Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.9.1] - 2025-01-15

### Corrigido
- 🔧 **Tipos Decimal corrigidos** em `orca.ts` - import e funções agora usam `Decimal` corretamente
- 🔧 **Função `tickToSqrtPrice()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `q64ToFloat()`** agora retorna `Decimal` em vez de `number`
- 🔧 **Função `amountsFromLiquidityDecimal()`** agora funciona corretamente com tipos `Decimal`
- 🔧 **Erros de compilação TypeScript** relacionados aos tipos `Decimal` resolvidos

## [1.9.0] - 2025-01-15

### Adicionado
- ✅ **Nova rota `/tickarray/:poolId`** para buscar dados dos TickArrays usando RPC direto
- ✅ **Função `GetTickData()`** implementada em `orca.ts` com parse direto dos dados
- ✅ **Integração de gas real** na rota `/analytics` via `GetGasInPosition`
- ✅ **Sistema de requisições pendentes** para evitar chamadas duplicadas à CoinGecko API
- ✅ **Cache melhorado** com TTL de 10 minutos e fallback inteligente
- ✅ **Documentação atualizada** com novas rotas e funcionalidades

### Modificado
- 🔄 **Função `processPositionDataFromRaw()`** agora usa RPC direto em vez do SDK
- 🔄 **Sistema de cache de preços** otimizado com prevenção de chamadas duplicadas
- 🔄 **Rota `/analytics`** agora retorna dados reais de gas em vez de valores zerados
- 🔄 **Coleção Postman** atualizada com novas rotas e parâmetros corrigidos
- 🔄 **README.md** expandido com documentação completa das novas funcionalidades

### Removido
- ❌ **Parâmetro `showTicks`** da rota `/position` (implementação removida)
- ❌ **Dependência do SDK** para busca de dados de pool em `processPositionDataFromRaw`
- ❌ **Valores zerados de gas** na rota `/analytics`

### Corrigido
- 🐛 **Erros de compilação** relacionados a tipos TypeScript
- 🐛 **Rate limits da CoinGecko API** com sistema de cache robusto
- 🐛 **Chamadas duplicadas** para APIs externas com sistema de requisições pendentes

## [1.8.0] - 2025-01-14

### Adicionado
- ✅ **Sistema de cache inteligente** para preços da CoinGecko API
- ✅ **Cache em memória** com TTL configurável (5 minutos)
- ✅ **Fallback automático** para cache expirado em caso de rate limits
- ✅ **Tratamento de rate limits** (erro 429) com recuperação automática
- ✅ **Logs detalhados** para monitoramento de performance do cache
- ✅ **Chaves de cache inteligentes** separadas para preços atuais e históricos

### Modificado
- 🔄 **Migração completa** de Helius API para CoinGecko API
- 🔄 **Função `getCurrentPrice()`** agora com sistema de cache integrado
- 🔄 **Função `getHistoricalPrice()`** com cache para preços históricos
- 🔄 **Tratamento de erros** melhorado com fallback para cache
- 🔄 **Documentação atualizada** refletindo mudanças de API
- 🔄 **Configuração simplificada** sem necessidade de chaves de API

### Removido
- ❌ **Dependência da Helius API** para preços
- ❌ **Configuração HELIUS_API_KEY** do .env
- ❌ **Referências à Helius** na documentação

### Corrigido
- 🐛 **Rate limit issues** resolvidos com sistema de cache
- 🐛 **Falhas de preços** em caso de limite de API excedido
- 🐛 **Performance** melhorada com cache inteligente

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


